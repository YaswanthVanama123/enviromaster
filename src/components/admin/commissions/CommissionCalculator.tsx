import React, { useState, useCallback } from "react";
import { commissionApi } from "../../../backendservice/api/commissionApi";
import type {
  CommissionCalculationInput,
  CommissionCalculationResult,
  AccountType,
  AgreementTerm,
  PricingLine,
  QuotaLevel,
  BusinessType,
  ACCOUNT_TYPE_OPTIONS,
  AGREEMENT_TERM_OPTIONS,
  PRICING_LINE_OPTIONS,
  QUOTA_LEVEL_OPTIONS,
  BUSINESS_TYPE_OPTIONS,
} from "../../../backendservice/types/commission.types";
import {
  detectAccountTypeClient,
  type AccountTypeDetectionResult,
} from "../../../backendservice/types/accountType.types";
import { CommissionResultDisplay } from "./CommissionResultDisplay";

interface CommissionCalculatorProps {
  onRecordSaved?: () => void;
}

const ACCOUNT_TYPES: typeof ACCOUNT_TYPE_OPTIONS = [
  { value: "Anchor", label: "Anchor", description: "$200+/visit, high-revenue location" },
  { value: "Bread5", label: "Bread5", description: "Within 5 minutes of Anchor" },
  { value: "Bread15", label: "Bread15", description: "Within 15 minutes of Anchor" },
  { value: "Pit", label: "Pit", description: "New location, not near Anchor" },
];

const AGREEMENT_TERMS: typeof AGREEMENT_TERM_OPTIONS = [
  { value: "3-year", label: "3-Year Agreement", multiplier: 135 },
  { value: "1-year", label: "1-Year Agreement", multiplier: 100 },
  { value: "MTM-with-install", label: "MTM with Install", multiplier: 100 },
  { value: "MTM-no-install", label: "MTM No Install", multiplier: 50 },
];

const PRICING_LINES: typeof PRICING_LINE_OPTIONS = [
  { value: "Redline", label: "Redline", description: "Standard pricing" },
  { value: "Greenline", label: "Greenline", description: "130%+ premium pricing" },
];

const QUOTA_LEVELS: typeof QUOTA_LEVEL_OPTIONS = [
  { value: "below", label: "Below Quota", rate: 3 },
  { value: "above", label: "Above Quota", rate: 6 },
  { value: "double", label: "Double Quota", rate: 9 },
];

const BUSINESS_TYPES: typeof BUSINESS_TYPE_OPTIONS = [
  { value: "new", label: "New Business" },
  { value: "renewal", label: "Renewal" },
];

export const CommissionCalculator: React.FC<CommissionCalculatorProps> = ({ onRecordSaved }) => {
  // Form state
  const [monthlyValue, setMonthlyValue] = useState<string>("");
  const [agreementTerm, setAgreementTerm] = useState<AgreementTerm>("1-year");
  const [accountType, setAccountType] = useState<AccountType>("Anchor");
  const [pricingLine, setPricingLine] = useState<PricingLine>("Redline");
  const [quotaLevel, setQuotaLevel] = useState<QuotaLevel>("below");
  const [businessType, setBusinessType] = useState<BusinessType>("new");
  const [yearsAsCustomer, setYearsAsCustomer] = useState<string>("0");
  const [isInsideSales, setIsInsideSales] = useState(false);
  const [salesPersonName, setSalesPersonName] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");

  // Auto-detect state
  const [autoDetectEnabled, setAutoDetectEnabled] = useState(false);
  const [perVisitRevenue, setPerVisitRevenue] = useState<string>("");
  const [distanceToAnchor, setDistanceToAnchor] = useState<string>("");
  const [detectionResult, setDetectionResult] = useState<AccountTypeDetectionResult | null>(null);

  // Result state
  const [result, setResult] = useState<CommissionCalculationResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Handle auto-detection when inputs change
  const handleAutoDetect = useCallback(() => {
    if (!autoDetectEnabled || !perVisitRevenue) {
      setDetectionResult(null);
      return;
    }

    const revenue = parseFloat(perVisitRevenue);
    const distance = distanceToAnchor ? parseFloat(distanceToAnchor) : null;
    const isGreenline = pricingLine === "Greenline";

    if (!isNaN(revenue) && revenue > 0) {
      const result = detectAccountTypeClient(revenue, distance, isGreenline);
      setDetectionResult(result);
      setAccountType(result.accountType);
    }
  }, [autoDetectEnabled, perVisitRevenue, distanceToAnchor, pricingLine]);

  // Trigger auto-detect when relevant inputs change
  React.useEffect(() => {
    handleAutoDetect();
  }, [handleAutoDetect]);

  const handleCalculate = async () => {
    if (!monthlyValue || parseFloat(monthlyValue) <= 0) {
      setError("Please enter a valid monthly value greater than 0");
      return;
    }

    setCalculating(true);
    setError(null);

    try {
      const input: CommissionCalculationInput = {
        monthlyValue: parseFloat(monthlyValue),
        agreementTerm,
        accountType,
        pricingLine,
        quotaLevel,
        businessType,
        yearsAsCustomer:
          businessType === "renewal" ? parseInt(yearsAsCustomer, 10) : undefined,
        isInsideSales,
        salesPersonName: salesPersonName || undefined,
        customerName: customerName || undefined,
      };

      const response = await commissionApi.calculate(input);

      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        setResult(response.data);
      }
    } catch (err) {
      setError("Failed to calculate commission. Please try again.");
    } finally {
      setCalculating(false);
    }
  };

  const handleClear = () => {
    setMonthlyValue("");
    setAgreementTerm("1-year");
    setAccountType("Anchor");
    setPricingLine("Redline");
    setQuotaLevel("below");
    setBusinessType("new");
    setYearsAsCustomer("0");
    setIsInsideSales(false);
    setSalesPersonName("");
    setCustomerName("");
    setResult(null);
    setError(null);
    setSuccessMessage(null);
    // Clear auto-detect state
    setAutoDetectEnabled(false);
    setPerVisitRevenue("");
    setDistanceToAnchor("");
    setDetectionResult(null);
  };

  const handleSave = async () => {
    if (!result) {
      setError("Please calculate commission first before saving");
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
        calculation: result,
        salesPersonId: salesPersonName.toLowerCase().replace(/\s+/g, "_"),
        salesPersonName: salesPersonName,
        customerName: customerName || undefined,
        status: "draft" as const,
      };

      const response = await commissionApi.saveRecord(recordData);

      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        setSuccessMessage("Commission record saved successfully!");
        // Notify parent to refresh history
        if (onRecordSaved) {
          onRecordSaved();
        }
      }
    } catch (err) {
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

      <div className="calculator-grid">
        {/* Monthly Value */}
        <div className="form-group">
          <label>Monthly Contract Value ($)</label>
          <input
            type="number"
            value={monthlyValue}
            onChange={(e) => setMonthlyValue(e.target.value)}
            placeholder="Enter monthly value"
            min="0"
            step="0.01"
          />
        </div>

        {/* Customer Name */}
        <div className="form-group">
          <label>Customer Name (Optional)</label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Enter customer name"
          />
        </div>

        {/* Account Type */}
        <div className="form-group">
          <label>
            Account Type
            <label style={{ marginLeft: "16px", fontWeight: "normal", fontSize: "12px" }}>
              <input
                type="checkbox"
                checked={autoDetectEnabled}
                onChange={(e) => setAutoDetectEnabled(e.target.checked)}
                style={{ marginRight: "4px" }}
              />
              Auto-detect
            </label>
          </label>

          {autoDetectEnabled ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="number"
                  value={perVisitRevenue}
                  onChange={(e) => setPerVisitRevenue(e.target.value)}
                  placeholder="Per-visit revenue ($)"
                  min="0"
                  step="0.01"
                  style={{ flex: 1 }}
                />
                <input
                  type="number"
                  value={distanceToAnchor}
                  onChange={(e) => setDistanceToAnchor(e.target.value)}
                  placeholder="Distance to anchor (mi)"
                  min="0"
                  step="0.01"
                  style={{ flex: 1 }}
                />
              </div>
              {detectionResult && (
                <div style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  backgroundColor: detectionResult.accountType === "Anchor" ? "#dcfce7" :
                                   detectionResult.accountType === "Bread5" ? "#dbeafe" :
                                   detectionResult.accountType === "Bread15" ? "#ede9fe" : "#fee2e2",
                  color: detectionResult.accountType === "Anchor" ? "#166534" :
                         detectionResult.accountType === "Bread5" ? "#1e40af" :
                         detectionResult.accountType === "Bread15" ? "#5b21b6" : "#dc2626",
                  fontSize: "12px"
                }}>
                  <strong>Detected: {detectionResult.accountType}</strong>
                  <span style={{ marginLeft: "8px", opacity: 0.8 }}>({detectionResult.confidence} confidence)</span>
                  <div style={{ marginTop: "4px", opacity: 0.7 }}>{detectionResult.reason}</div>
                </div>
              )}
            </div>
          ) : (
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value as AccountType)}
            >
              {ACCOUNT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          )}
          <small>
            {ACCOUNT_TYPES.find((t) => t.value === accountType)?.description}
          </small>
        </div>

        {/* Agreement Term */}
        <div className="form-group">
          <label>Agreement Term</label>
          <select
            value={agreementTerm}
            onChange={(e) => setAgreementTerm(e.target.value as AgreementTerm)}
          >
            {AGREEMENT_TERMS.map((term) => (
              <option key={term.value} value={term.value}>
                {term.label} ({term.multiplier}%)
              </option>
            ))}
          </select>
        </div>

        {/* Pricing Line */}
        <div className="form-group">
          <label>Pricing Line</label>
          <select
            value={pricingLine}
            onChange={(e) => setPricingLine(e.target.value as PricingLine)}
          >
            {PRICING_LINES.map((line) => (
              <option key={line.value} value={line.value}>
                {line.label}
              </option>
            ))}
          </select>
          <small>
            {PRICING_LINES.find((l) => l.value === pricingLine)?.description}
          </small>
        </div>

        {/* Quota Level */}
        <div className="form-group">
          <label>Quota Achievement</label>
          <select
            value={quotaLevel}
            onChange={(e) => setQuotaLevel(e.target.value as QuotaLevel)}
          >
            {QUOTA_LEVELS.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label} ({level.rate}%)
              </option>
            ))}
          </select>
        </div>

        {/* Business Type */}
        <div className="form-group">
          <label>Business Type</label>
          <select
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value as BusinessType)}
          >
            {BUSINESS_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Years as Customer (for renewals) */}
        {businessType === "renewal" && (
          <div className="form-group">
            <label>Years as Customer</label>
            <input
              type="number"
              value={yearsAsCustomer}
              onChange={(e) => setYearsAsCustomer(e.target.value)}
              placeholder="Enter years"
              min="0"
            />
            <small>4% bonus applies at 2+ years</small>
          </div>
        )}

        {/* Sales Person Name */}
        <div className="form-group">
          <label>Sales Person Name (Optional)</label>
          <input
            type="text"
            value={salesPersonName}
            onChange={(e) => setSalesPersonName(e.target.value)}
            placeholder="Enter sales person name"
          />
        </div>
      </div>

      {/* Inside Sales Toggle */}
      <div className="form-group checkbox-group">
        <label>
          <input
            type="checkbox"
            checked={isInsideSales}
            onChange={(e) => setIsInsideSales(e.target.checked)}
          />
          Inside Sales Involvement (-3% deduction)
        </label>
      </div>

      <div style={{ display: "flex", gap: "12px", marginTop: "24px", flexWrap: "wrap" }}>
        <button
          className="calculate-btn"
          onClick={handleCalculate}
          disabled={calculating}
        >
          {calculating ? "Calculating..." : "Calculate Commission"}
        </button>

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

        {(result || monthlyValue) && (
          <button
            className="calculate-btn"
            onClick={handleClear}
            style={{ backgroundColor: "#6b7280" }}
          >
            Clear
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}
      {successMessage && (
        <div className="success-message" style={{
          marginTop: "12px",
          padding: "12px 16px",
          backgroundColor: "#dcfce7",
          color: "#166534",
          borderRadius: "8px",
          fontWeight: "500"
        }}>
          {successMessage}
        </div>
      )}

      {result && <CommissionResultDisplay result={result} />}
    </div>
  );
};
