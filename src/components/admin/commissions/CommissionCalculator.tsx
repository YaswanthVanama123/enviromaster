import React, { useState, useEffect, useMemo } from "react";
import { commissionApi } from "../../../backendservice/api/commissionApi";
import {
  resolveCommissionRules,
  getPricingTierFromList,
  type ResolvedCommissionRules,
  type AccountType,
  type AgreementTerm,
  type QuotaLevel,
  type BusinessType,
  type ServiceFrequency,
} from "../../../backendservice/types/commission.types";

interface CommissionCalculatorProps {
  onRecordSaved?: () => void;
}

const ACCOUNT_TYPES: { value: AccountType; label: string; description: string }[] = [
  { value: "Anchor", label: "Anchor", description: "$200+/visit, high-revenue location" },
  { value: "Bread5", label: "Bread5", description: "Within 5 minutes of Anchor" },
  { value: "Bread15", label: "Bread15", description: "Within 15 minutes of Anchor" },
  { value: "Pit", label: "Pit", description: "Not near an Anchor" },
];

const FREQUENCIES: { value: ServiceFrequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "one-time", label: "One-Time" },
];

const QUOTA_LEVELS: { value: QuotaLevel; label: string; rate: number }[] = [
  { value: "below", label: "Below Quota", rate: 3 },
  { value: "above", label: "Above Quota", rate: 6 },
  { value: "double", label: "Double Quota", rate: 9 },
];

const BUSINESS_TYPES: { value: BusinessType; label: string }[] = [
  { value: "new", label: "New Business" },
  { value: "renewal", label: "Renewal" },
];

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

const formatPercent = (n: number, digits = 2) => `${n.toFixed(digits)}%`;

export const CommissionCalculator: React.FC<CommissionCalculatorProps> = ({ onRecordSaved }) => {
  
  const [customerName, setCustomerName] = useState<string>("");
  const [salesPersonName, setSalesPersonName] = useState<string>("");

  const [currentContract, setCurrentContract] = useState<string>("");
  const [originalContract, setOriginalContract] = useState<string>("");
  const [contractMonths, setContractMonths] = useState<string>("36");

  const [frequency, setFrequency] = useState<ServiceFrequency>("weekly");

  const [accountType, setAccountType] = useState<AccountType>("Anchor");

  const [isNewLocation, setIsNewLocation] = useState<boolean>(true);

  const [quotaLevel, setQuotaLevel] = useState<QuotaLevel>("below");
  const [repActualSalesBefore, setRepActualSalesBefore] = useState<string>("0");
  const [isInsideSales, setIsInsideSales] = useState<boolean>(false);

  const [businessType, setBusinessType] = useState<BusinessType>("new");
  const [yearsAsCustomer, setYearsAsCustomer] = useState<string>("0");
  const [totalRenewalValue, setTotalRenewalValue] = useState<string>("0");

  const [activeRules, setActiveRules] = useState<ResolvedCommissionRules>(() =>
    resolveCommissionRules(null),
  );

  useEffect(() => {
    let cancelled = false;
    commissionApi
      .getActiveRules()
      .then(response => {
        if (cancelled) return;
        if (response?.data) setActiveRules(resolveCommissionRules(response.data));
      })
      .catch(err =>
        console.error("[RULES] Calculator failed to load active commission rules:", err),
      );
    return () => {
      cancelled = true;
    };
  }, []);

  const result = useMemo(() => {
    const rules = activeRules;
    const current = parseFloat(currentContract) || 0;
    const original = parseFloat(originalContract) || current;
    const months = Math.max(1, parseFloat(contractMonths) || 12);
    const positionBefore = parseFloat(repActualSalesBefore) || 0;
    const yearsCust = parseFloat(yearsAsCustomer) || 0;
    const renewalValue = parseFloat(totalRenewalValue) || 0;

    if (current <= 0) return null;

    const monthlyValue = current / months;
    const monthlyOriginalValue = original / months;
    const currentContract12Months = monthlyValue * 12;
    const originalContract12Months = monthlyOriginalValue * 12;

    const priceRatio =
      originalContract12Months > 0 ? currentContract12Months / originalContract12Months : 1;
    const pricingTier = getPricingTierFromList(
      currentContract12Months,
      originalContract12Months,
      rules.pricingTiers,
    );
    const pricingMultiplier = pricingTier.quotaMultiplier;
    const isGreenline = pricingTier.label === "Greenline (130%+)";

    const agreementTerm: AgreementTerm =
      months >= 36 ? "3-year" : months >= 12 ? "1-year" : "MTM-with-install";
    const agreementMultiplier = rules.agreementMultipliers[agreementTerm];

    const visitsPerYear = rules.frequencyVisitsPerYear[frequency];
    const pitZoneAnnual = rules.pitPerVisitThreshold * visitsPerYear;
    const anchorZoneAnnual =
      (isGreenline ? rules.anchorMinGreenline : rules.anchorPerVisitThreshold) * visitsPerYear;
    const bread5Annual = rules.perVisitPenalties.Bread5 * visitsPerYear;
    const bread15Annual = rules.perVisitPenalties.Bread15 * visitsPerYear;
    const pitAnnual = rules.perVisitPenalties.Pit * visitsPerYear;

    
    const adjustedAnnual = currentContract12Months * pricingMultiplier;

    let revenueDeduction = 0;
    let anchorBonus = 0;
    let commissionableAnnual = adjustedAnnual;

    if (accountType === "Anchor") {
      if (isNewLocation) {
        const pitPart = Math.min(adjustedAnnual, pitZoneAnnual);
        const stdPart = Math.min(
          Math.max(0, adjustedAnnual - pitZoneAnnual),
          anchorZoneAnnual - pitZoneAnnual,
        );
        const anchorPart = Math.max(0, adjustedAnnual - anchorZoneAnnual);
        commissionableAnnual = Math.max(0, stdPart) + anchorPart * rules.anchorBonusMultiplier;
        revenueDeduction = pitPart;
        anchorBonus = anchorPart * (rules.anchorBonusMultiplier - 1);
      } else {
        const stdPart = Math.min(adjustedAnnual, anchorZoneAnnual);
        const anchorPart = Math.max(0, adjustedAnnual - anchorZoneAnnual);
        commissionableAnnual = stdPart + anchorPart * rules.anchorBonusMultiplier;
        anchorBonus = anchorPart * (rules.anchorBonusMultiplier - 1);
      }
    } else if (accountType === "Bread5") {
      revenueDeduction = isNewLocation ? bread5Annual : 0;
      commissionableAnnual = Math.max(0, adjustedAnnual - revenueDeduction);
    } else if (accountType === "Bread15") {
      revenueDeduction = isNewLocation ? bread15Annual : 0;
      commissionableAnnual = Math.max(0, adjustedAnnual - revenueDeduction);
    } else {
      
      const isExistingAlreadyOver = !isNewLocation && adjustedAnnual > pitAnnual;
      revenueDeduction = isExistingAlreadyOver ? 0 : pitAnnual;
      commissionableAnnual = Math.max(0, adjustedAnnual - revenueDeduction);
    }

    const annualContractTotal = currentContract12Months;
    const annualQuotaCredit = annualContractTotal * pricingMultiplier;

    const cutoffs = rules.quotaTierCutoffs;
    const positionAfter = positionBefore + annualQuotaCredit;
    const belowQuotaPortion = Math.max(
      0,
      Math.min(positionAfter, cutoffs.aboveQuota) - positionBefore,
    );
    const aboveQuotaPortion = Math.max(
      0,
      Math.min(positionAfter, cutoffs.doubleQuota) - Math.max(positionBefore, cutoffs.aboveQuota),
    );
    const doubleQuotaPortion = Math.max(
      0,
      positionAfter - Math.max(positionBefore, cutoffs.doubleQuota),
    );

    const insideSalesDeduction = isInsideSales ? rules.insideSalesDeduction : 0;
    const belowRate = (rules.quotaRates.below + insideSalesDeduction) / 100;
    const aboveRate = (rules.quotaRates.above + insideSalesDeduction) / 100;
    const doubleRate = (rules.quotaRates.double + insideSalesDeduction) / 100;

    const totalCredit = belowQuotaPortion + aboveQuotaPortion + doubleQuotaPortion;
    const belowShare = totalCredit > 0 ? (belowQuotaPortion / totalCredit) * commissionableAnnual : 0;
    const aboveShare = totalCredit > 0 ? (aboveQuotaPortion / totalCredit) * commissionableAnnual : 0;
    const doubleShare = totalCredit > 0 ? (doubleQuotaPortion / totalCredit) * commissionableAnnual : 0;

    const belowQuotaCommission = belowShare * Math.max(0, belowRate);
    const aboveQuotaCommission = aboveShare * Math.max(0, aboveRate);
    const doubleQuotaCommission = doubleShare * Math.max(0, doubleRate);

    const agreementMult = agreementMultiplier / 100;
    const annualCommission =
      (belowQuotaCommission + aboveQuotaCommission + doubleQuotaCommission) * agreementMult;
    const weeklyCommission = annualCommission / rules.weeksPerAnnualCommission;

    let renewalBonusRate = 0;
    let renewalBonusAmount = 0;
    if (businessType === "renewal" && yearsCust >= rules.renewalMinYears) {
      renewalBonusRate = rules.renewalBonusRate;
      renewalBonusAmount = renewalValue * (renewalBonusRate / 100);
    }

    const baseRate = rules.quotaRates[quotaLevel];
    const effectiveRate = baseRate + insideSalesDeduction;
    const finalCommissionRate = effectiveRate * agreementMult;

    return {
      
      input: {
        currentContract: current,
        originalContract: original,
        contractMonths: months,
        frequency,
        accountType,
        isNewLocation,
        quotaLevel,
        repActualSalesBefore: positionBefore,
        isInsideSales,
        businessType,
        yearsAsCustomer: yearsCust,
        totalRenewalValue: renewalValue,
        customerName,
        salesPersonName,
      },
      
      monthlyValue,
      currentContract12Months,
      originalContract12Months,
      
      priceRatio,
      pricingTier: pricingTier.label,
      pricingMultiplier,
      requiresApproval: pricingTier.requiresApproval,
      
      agreementTerm,
      agreementMultiplier,
      
      visitsPerYear,
      adjustedAnnual,
      
      revenueDeduction,
      anchorBonus,
      commissionableAnnual,
      
      annualContractTotal,
      annualQuotaCredit,
      
      belowQuotaPortion,
      aboveQuotaPortion,
      doubleQuotaPortion,
      belowQuotaCommission: belowQuotaCommission * agreementMult,
      aboveQuotaCommission: aboveQuotaCommission * agreementMult,
      doubleQuotaCommission: doubleQuotaCommission * agreementMult,
      
      baseRate,
      insideSalesDeduction,
      effectiveRate,
      finalCommissionRate,
      annualCommission,
      weeklyCommission,
      renewalBonusRate,
      renewalBonusAmount,
      totalCommission: annualCommission + renewalBonusAmount,
      rulesVersion: rules ? "active" : "default",
    };
  }, [
    activeRules,
    currentContract,
    originalContract,
    contractMonths,
    frequency,
    accountType,
    isNewLocation,
    quotaLevel,
    repActualSalesBefore,
    isInsideSales,
    businessType,
    yearsAsCustomer,
    totalRenewalValue,
    customerName,
    salesPersonName,
  ]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleClear = () => {
    setCustomerName("");
    setSalesPersonName("");
    setCurrentContract("");
    setOriginalContract("");
    setContractMonths("36");
    setFrequency("weekly");
    setAccountType("Anchor");
    setIsNewLocation(true);
    setQuotaLevel("below");
    setRepActualSalesBefore("0");
    setIsInsideSales(false);
    setBusinessType("new");
    setYearsAsCustomer("0");
    setTotalRenewalValue("0");
    setError(null);
    setSuccessMessage(null);
  };

  const handleSave = async () => {
    if (!result) {
      setError("Enter a current contract value greater than 0 first");
      return;
    }
    if (!salesPersonName) {
      setError("Sales Person Name is required to save the record");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const recordData = {
        calculation: result as any,
        salesPersonId: salesPersonName.toLowerCase().replace(/\s+/g, "_"),
        salesPersonName,
        customerName: customerName || undefined,
        status: "draft" as const,
      };
      const response = await commissionApi.saveRecord(recordData);
      if (response.error) setError(response.error);
      else {
        setSuccessMessage("Commission record saved successfully!");
        if (onRecordSaved) onRecordSaved();
      }
    } catch {
      setError("Failed to save commission record. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="commission-calculator">
      <h3 className="calculator-section-title">
        <span>$</span> Deal Information
      </h3>
      <p style={{ color: "#6b7280", fontSize: "0.85em", marginTop: -8 }}>
        Same V2 spec-faithful pipeline as FormFilling — pricing tier from current/redline ratio,
        admin-editable per-visit penalties + thresholds + tier rates, piecewise quota tier rate split.
      </p>

      <div className="calculator-grid">
        <div className="form-group">
          <label>Customer Name (Optional)</label>
          <input
            type="text"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            placeholder="Enter customer name"
          />
        </div>
        <div className="form-group">
          <label>Sales Person Name (Optional)</label>
          <input
            type="text"
            value={salesPersonName}
            onChange={e => setSalesPersonName(e.target.value)}
            placeholder="Enter sales person name"
          />
        </div>

        <div className="form-group">
          <label>Current Contract Total ($)</label>
          <input
            type="number"
            value={currentContract}
            onChange={e => setCurrentContract(e.target.value)}
            placeholder="What customer is being charged"
            min="0"
            step="0.01"
          />
          <small>Multi-year total — calc auto-prorates to 1 year.</small>
        </div>
        <div className="form-group">
          <label>Original (Redline) Contract Total ($)</label>
          <input
            type="number"
            value={originalContract}
            onChange={e => setOriginalContract(e.target.value)}
            placeholder="Standard / redline price"
            min="0"
            step="0.01"
          />
          <small>Drives the pricing tier ratio. Leave blank to default to Current.</small>
        </div>

        <div className="form-group">
          <label>Contract Months</label>
          <input
            type="number"
            value={contractMonths}
            onChange={e => setContractMonths(e.target.value)}
            min="1"
            step="1"
          />
          <small>Auto-derives Agreement Term: ≥36 → 3-year (135%), ≥12 → 1-year (100%), else MTM.</small>
        </div>
        <div className="form-group">
          <label>Service Frequency</label>
          <select value={frequency} onChange={e => setFrequency(e.target.value as ServiceFrequency)}>
            {FREQUENCIES.map(f => (
              <option key={f.value} value={f.value}>
                {f.label} ({activeRules.frequencyVisitsPerYear[f.value]} visits/yr)
              </option>
            ))}
          </select>
          <small>Drives annualized per-visit penalty thresholds.</small>
        </div>

        <div className="form-group">
          <label>Account Type</label>
          <select value={accountType} onChange={e => setAccountType(e.target.value as AccountType)}>
            {ACCOUNT_TYPES.map(t => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <small>{ACCOUNT_TYPES.find(t => t.value === accountType)?.description}</small>
        </div>
        <div className="form-group">
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontWeight: 500,
              cursor: "pointer",
              marginTop: 28,
            }}
          >
            <input
              type="checkbox"
              checked={isNewLocation}
              onChange={e => setIsNewLocation(e.target.checked)}
            />
            New Location (applies Pit zone / Bread+Pit penalty)
          </label>
          <small>Existing locations skip the per-visit penalty.</small>
        </div>

        <div className="form-group">
          <label>Quota Achievement (informational)</label>
          <select value={quotaLevel} onChange={e => setQuotaLevel(e.target.value as QuotaLevel)}>
            {QUOTA_LEVELS.map(l => (
              <option key={l.value} value={l.value}>
                {l.label} ({l.rate}% base)
              </option>
            ))}
          </select>
          <small>Final rate uses piecewise tier split — see Existing Sales Position.</small>
        </div>
        <div className="form-group">
          <label>Existing Sales Position ($)</label>
          <input
            type="number"
            value={repActualSalesBefore}
            onChange={e => setRepActualSalesBefore(e.target.value)}
            placeholder="Rep's QuotaPeriod.actualSales before this deal"
            min="0"
            step="0.01"
          />
          <small>
            Drives 3% / 6% / 9% piecewise split. Cutoffs: ${activeRules.quotaTierCutoffs.aboveQuota.toLocaleString()} /
            ${activeRules.quotaTierCutoffs.doubleQuota.toLocaleString()}.
          </small>
        </div>

        <div className="form-group">
          <label>Business Type</label>
          <select value={businessType} onChange={e => setBusinessType(e.target.value as BusinessType)}>
            {BUSINESS_TYPES.map(b => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </div>
        {businessType === "renewal" && (
          <>
            <div className="form-group">
              <label>Years as Customer</label>
              <input
                type="number"
                value={yearsAsCustomer}
                onChange={e => setYearsAsCustomer(e.target.value)}
                min="0"
                step="1"
              />
              <small>{activeRules.renewalBonusRate}% bonus at {activeRules.renewalMinYears}+ years.</small>
            </div>
            <div className="form-group">
              <label>Total Renewal Value ($)</label>
              <input
                type="number"
                value={totalRenewalValue}
                onChange={e => setTotalRenewalValue(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
          </>
        )}
      </div>

      <div className="form-group checkbox-group" style={{ marginTop: 16 }}>
        <label>
          <input
            type="checkbox"
            checked={isInsideSales}
            onChange={e => setIsInsideSales(e.target.checked)}
          />
          Inside Sales Involvement ({activeRules.insideSalesDeduction}% deduction)
        </label>
      </div>

      <div style={{ display: "flex", gap: "12px", marginTop: "24px", flexWrap: "wrap" }}>
        {result && (
          <button
            className="calculate-btn"
            onClick={handleSave}
            disabled={saving}
            style={{ backgroundColor: "#16a34a" }}
          >
            {saving ? "Saving..." : "Save to History"}
          </button>
        )}
        <button className="calculate-btn" onClick={handleClear} style={{ backgroundColor: "#6b7280" }}>
          Clear
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {successMessage && (
        <div
          style={{
            marginTop: 12,
            padding: "12px 16px",
            backgroundColor: "#dcfce7",
            color: "#166534",
            borderRadius: 8,
            fontWeight: 500,
          }}
        >
          {successMessage}
        </div>
      )}

      {result && <CalculatorResult r={result} />}
    </div>
  );
};

const sectionStyle: React.CSSProperties = {
  marginTop: 24,
  padding: 16,
  backgroundColor: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "6px 0",
  borderBottom: "1px dashed #e5e7eb",
};

const totalRowStyle: React.CSSProperties = {
  ...rowStyle,
  fontWeight: 700,
  borderBottom: "none",
  borderTop: "2px solid #d1d5db",
  marginTop: 8,
  paddingTop: 12,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: "0.75em",
  fontWeight: 700,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: 8,
};

function CalculatorResult({ r }: { r: NonNullable<ReturnType<CommissionCalculatorMemo>> }) {
  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ fontSize: "1.1em", fontWeight: 700, marginBottom: 4 }}>Commission Breakdown</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div
          style={{
            padding: 16,
            backgroundColor: "#dcfce7",
            color: "#166534",
            borderRadius: 8,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "0.8em", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Annual Commission
          </div>
          <div style={{ fontSize: "1.6em", fontWeight: 800 }}>{formatCurrency(r.annualCommission)}</div>
        </div>
        <div
          style={{
            padding: 16,
            backgroundColor: "#dbeafe",
            color: "#1e3a8a",
            borderRadius: 8,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "0.8em", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Weekly Commission
          </div>
          <div style={{ fontSize: "1.6em", fontWeight: 800 }}>{formatCurrency(r.weeklyCommission)}</div>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Step 0–1: Pricing Tier (Agreement-Level)</div>
        <div style={rowStyle}>
          <span>Current 12-month Contract:</span>
          <span>{formatCurrency(r.currentContract12Months)}</span>
        </div>
        <div style={rowStyle}>
          <span>Original (Redline) 12-month Contract:</span>
          <span>{formatCurrency(r.originalContract12Months)}</span>
        </div>
        <div style={rowStyle}>
          <span>Price Ratio (Current ÷ Redline):</span>
          <span>{formatPercent(r.priceRatio * 100, 1)}</span>
        </div>
        <div style={rowStyle}>
          <span>Pricing Tier:</span>
          <span style={{ fontWeight: 600 }}>{r.pricingTier}</span>
        </div>
        <div style={rowStyle}>
          <span>Pricing Multiplier:</span>
          <span style={{ color: r.pricingMultiplier > 1 ? "#16a34a" : r.pricingMultiplier < 1 ? "#dc2626" : "#6b7280", fontWeight: 600 }}>
            {r.pricingMultiplier.toFixed(2)}×
          </span>
        </div>
        {r.requiresApproval && (
          <div style={{ ...rowStyle, color: "#dc2626" }}>
            <span>⚠ Requires Approval</span>
            <span></span>
          </div>
        )}
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Step 2–3: Adjusted Annual Revenue</div>
        <div style={rowStyle}>
          <span>Adjusted Annual ({formatCurrency(r.currentContract12Months)} × {r.pricingMultiplier.toFixed(2)}×):</span>
          <span>{formatCurrency(r.adjustedAnnual)}</span>
        </div>
        <div style={rowStyle}>
          <span>Frequency:</span>
          <span>{r.input.frequency} ({r.visitsPerYear} visits/yr)</span>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Step 4: Account-Type Adjustment ({r.input.accountType})</div>
        {r.revenueDeduction > 0 && (
          <div style={rowStyle}>
            <span>Revenue Deduction ({r.input.isNewLocation ? "new" : "existing"}):</span>
            <span style={{ color: "#dc2626" }}>−{formatCurrency(r.revenueDeduction)}</span>
          </div>
        )}
        {r.anchorBonus > 0 && (
          <div style={rowStyle}>
            <span>Anchor Bonus ({r.pricingMultiplier > 1 ? "Greenline-relaxed " : ""}150% above threshold):</span>
            <span style={{ color: "#16a34a" }}>+{formatCurrency(r.anchorBonus)}</span>
          </div>
        )}
        <div style={totalRowStyle}>
          <span>Commissionable Annual:</span>
          <span>{formatCurrency(r.commissionableAnnual)}</span>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Step 5: Quota Credit</div>
        <div style={rowStyle}>
          <span>Annual Contract Total (12-month slice):</span>
          <span>{formatCurrency(r.annualContractTotal)}</span>
        </div>
        <div style={totalRowStyle}>
          <span>Annual Quota Credit (× {r.pricingMultiplier.toFixed(2)}×):</span>
          <span>{formatCurrency(r.annualQuotaCredit)}</span>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Step 6: Tiered Commission Rate</div>
        <div style={rowStyle}>
          <span>Existing Sales Position:</span>
          <span>{formatCurrency(r.input.repActualSalesBefore)}</span>
        </div>
        {r.belowQuotaPortion > 0 && (
          <div style={rowStyle}>
            <span>
              Below tier portion ({formatCurrency(r.belowQuotaPortion)} × {r.input.isInsideSales ? `(${r.baseRate} − 3)` : r.baseRate}% × {r.agreementMultiplier}%):
            </span>
            <span>{formatCurrency(r.belowQuotaCommission)}</span>
          </div>
        )}
        {r.aboveQuotaPortion > 0 && (
          <div style={rowStyle}>
            <span>
              Above tier portion ({formatCurrency(r.aboveQuotaPortion)} × {r.input.isInsideSales ? "3" : "6"}% × {r.agreementMultiplier}%):
            </span>
            <span>{formatCurrency(r.aboveQuotaCommission)}</span>
          </div>
        )}
        {r.doubleQuotaPortion > 0 && (
          <div style={rowStyle}>
            <span>
              Double tier portion ({formatCurrency(r.doubleQuotaPortion)} × {r.input.isInsideSales ? "6" : "9"}% × {r.agreementMultiplier}%):
            </span>
            <span>{formatCurrency(r.doubleQuotaCommission)}</span>
          </div>
        )}
        <div style={totalRowStyle}>
          <span>Annual Commission:</span>
          <span style={{ color: "#16a34a" }}>{formatCurrency(r.annualCommission)}</span>
        </div>
      </div>

      {r.renewalBonusAmount > 0 && (
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Renewal Bonus</div>
          <div style={rowStyle}>
            <span>Total Renewed Value × {r.renewalBonusRate}%:</span>
            <span style={{ color: "#16a34a" }}>+{formatCurrency(r.renewalBonusAmount)}</span>
          </div>
          <div style={totalRowStyle}>
            <span>Total Commission:</span>
            <span style={{ color: "#16a34a" }}>{formatCurrency(r.totalCommission)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

type CommissionCalculatorMemo = () => any;
