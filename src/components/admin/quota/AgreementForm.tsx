import React, { useState, useEffect } from "react";
import { agreementApi, salesPersonApi, quotaApi } from "../../../backendservice/api/quotaApi";
import type {
  SalesPerson,
  CreateAgreementInput,
  QuotaLevelResponse,
} from "../../../backendservice/types/quota.types";
import {
  formatCurrency,
  getQuotaLevelColor,
  getQuotaLevelBgColor,
  getQuotaCommissionRate,
} from "../../../backendservice/types/quota.types";
import {
  detectAccountTypeClient,
  getAccountTypeColor,
  getAccountTypeBgColor,
} from "../../../backendservice/types/accountType.types";

interface AgreementFormProps {
  onAgreementCreated: () => void;
}

const TERM_MONTHS: Record<string, number> = {
  "3-year": 36,
  "1-year": 12,
  "MTM-with-install": 1,
  "MTM-no-install": 1,
};

export const AgreementForm: React.FC<AgreementFormProps> = ({ onAgreementCreated }) => {
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([]);
  const [quotaLevel, setQuotaLevel] = useState<QuotaLevelResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [selectedSalesPersonId, setSelectedSalesPersonId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerCity, setCustomerCity] = useState("");
  const [customerState, setCustomerState] = useState("");
  const [customerZip, setCustomerZip] = useState("");
  const [monthlyValue, setMonthlyValue] = useState("");
  const [agreementTerm, setAgreementTerm] = useState<"3-year" | "1-year" | "MTM-with-install" | "MTM-no-install">("1-year");
  const [accountType, setAccountType] = useState<"Anchor" | "Bread5" | "Bread15" | "Pit">("Anchor");
  const [pricingLine, setPricingLine] = useState<"Redline" | "Greenline">("Redline");
  const [businessType, setBusinessType] = useState<"new" | "renewal">("new");
  const [yearsAsCustomer, setYearsAsCustomer] = useState("0");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [insideSalesInvolved, setInsideSalesInvolved] = useState(false);
  const [insideSalesPersonId, setInsideSalesPersonId] = useState("");
  const [notes, setNotes] = useState("");

  const [autoDetectEnabled, setAutoDetectEnabled] = useState(false);
  const [perVisitRevenue, setPerVisitRevenue] = useState("");
  const [distanceToAnchor, setDistanceToAnchor] = useState("");

  useEffect(() => {
    const load = async () => {
      const result = await salesPersonApi.getAll({ active: true });
      if (result) {
        setSalesPersons(result.data);
        if (result.data.length > 0) {
          setSelectedSalesPersonId(result.data[0].employeeId);
        }
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadQuotaLevel = async () => {
      if (!selectedSalesPersonId) return;
      const result = await quotaApi.getCurrentLevel(selectedSalesPersonId);
      setQuotaLevel(result);
    };
    loadQuotaLevel();
  }, [selectedSalesPersonId]);

  useEffect(() => {
    if (!autoDetectEnabled || !perVisitRevenue) return;

    const revenue = parseFloat(perVisitRevenue);
    const distance = distanceToAnchor ? parseFloat(distanceToAnchor) : null;
    const isGreenline = pricingLine === "Greenline";

    if (!isNaN(revenue) && revenue > 0) {
      const result = detectAccountTypeClient(revenue, distance, isGreenline);
      setAccountType(result.accountType);
    }
  }, [autoDetectEnabled, perVisitRevenue, distanceToAnchor, pricingLine]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedSalesPersonId || !customerName || !monthlyValue || !startDate) {
      setError("Please fill in all required fields");
      return;
    }

    setSaving(true);

    const input: CreateAgreementInput = {
      salesPersonId: selectedSalesPersonId,
      customer: {
        name: customerName,
        address: customerAddress || undefined,
        city: customerCity || undefined,
        state: customerState || undefined,
        zipCode: customerZip || undefined,
      },
      agreementTerm,
      termMonths: TERM_MONTHS[agreementTerm],
      monthlyValue: parseFloat(monthlyValue),
      perVisitRevenue: perVisitRevenue ? parseFloat(perVisitRevenue) : undefined,
      accountType,
      pricingLine,
      businessType,
      yearsAsCustomer: businessType === "renewal" ? parseInt(yearsAsCustomer, 10) : 0,
      distanceToAnchor: distanceToAnchor
        ? {
            miles: parseFloat(distanceToAnchor),
            drivingTimeMinutes: parseFloat(distanceToAnchor) / 0.5, 
          }
        : undefined,
      startDate,
      insideSales: {
        involved: insideSalesInvolved,
        personId: insideSalesInvolved ? insideSalesPersonId || undefined : undefined,
        personName: insideSalesInvolved
          ? salesPersons.find((sp) => sp.employeeId === insideSalesPersonId)?.name
          : undefined,
      },
      notes: notes || undefined,
    };

    const result = await agreementApi.create(input);

    if (result) {
      setSuccess(
        `Agreement created! Quota: ${result.quotaPeriod.quotaPercentage.toFixed(1)}% (${result.quotaPeriod.quotaLevel})`
      );
      
      setCustomerName("");
      setCustomerAddress("");
      setCustomerCity("");
      setCustomerState("");
      setCustomerZip("");
      setMonthlyValue("");
      setPerVisitRevenue("");
      setDistanceToAnchor("");
      setNotes("");
      setAutoDetectEnabled(false);
      
      const newQuota = await quotaApi.getCurrentLevel(selectedSalesPersonId);
      setQuotaLevel(newQuota);
      
      setTimeout(() => {
        onAgreementCreated();
      }, 1500);
    } else {
      setError("Failed to create agreement");
    }

    setSaving(false);
  };

  const detectionResult = autoDetectEnabled && perVisitRevenue
    ? detectAccountTypeClient(
        parseFloat(perVisitRevenue) || 0,
        distanceToAnchor ? parseFloat(distanceToAnchor) : null,
        pricingLine === "Greenline"
      )
    : null;

  return (
    <div className="agreement-form-container">
      <div className="form-card">
        <h3>Create New Agreement</h3>

        {}
        {quotaLevel && (
          <div
            className="quota-status-banner"
            style={{
              backgroundColor: getQuotaLevelBgColor(quotaLevel.quotaLevel),
              borderColor: getQuotaLevelColor(quotaLevel.quotaLevel),
            }}
          >
            <span className="quota-person">{quotaLevel.salesPersonName}</span>
            <span
              className="quota-level"
              style={{ color: getQuotaLevelColor(quotaLevel.quotaLevel) }}
            >
              {quotaLevel.quotaLevel.toUpperCase()} QUOTA ({getQuotaCommissionRate(quotaLevel.quotaLevel)}%)
            </span>
            <span className="quota-progress">
              {formatCurrency(quotaLevel.actualSales)} / {formatCurrency(quotaLevel.quotaTarget)}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {}
          <div className="form-section">
            <h4>Sales Information</h4>
            <div className="form-grid">
              <div className="form-group">
                <label>Sales Person *</label>
                <select
                  value={selectedSalesPersonId}
                  onChange={(e) => setSelectedSalesPersonId(e.target.value)}
                >
                  {salesPersons.map((sp) => (
                    <option key={sp.employeeId} value={sp.employeeId}>
                      {sp.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={insideSalesInvolved}
                    onChange={(e) => setInsideSalesInvolved(e.target.checked)}
                  />
                  Inside Sales Involved (-3% deduction)
                </label>
              </div>
              {insideSalesInvolved && (
                <div className="form-group">
                  <label>Inside Sales Person</label>
                  <select
                    value={insideSalesPersonId}
                    onChange={(e) => setInsideSalesPersonId(e.target.value)}
                  >
                    <option value="">Select...</option>
                    {salesPersons
                      .filter((sp) => sp.role === "inside_sales")
                      .map((sp) => (
                        <option key={sp.employeeId} value={sp.employeeId}>
                          {sp.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {}
          <div className="form-section">
            <h4>Customer Information</h4>
            <div className="form-grid">
              <div className="form-group full-width">
                <label>Customer Name *</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="ABC Restaurant"
                />
              </div>
              <div className="form-group full-width">
                <label>Address</label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="123 Main Street"
                />
              </div>
              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  value={customerCity}
                  onChange={(e) => setCustomerCity(e.target.value)}
                  placeholder="Houston"
                />
              </div>
              <div className="form-group">
                <label>State</label>
                <input
                  type="text"
                  value={customerState}
                  onChange={(e) => setCustomerState(e.target.value)}
                  placeholder="TX"
                  maxLength={2}
                />
              </div>
              <div className="form-group">
                <label>ZIP Code</label>
                <input
                  type="text"
                  value={customerZip}
                  onChange={(e) => setCustomerZip(e.target.value)}
                  placeholder="77001"
                />
              </div>
            </div>
          </div>

          {}
          <div className="form-section">
            <h4>Agreement Details</h4>
            <div className="form-grid">
              <div className="form-group">
                <label>Monthly Value ($) *</label>
                <input
                  type="number"
                  value={monthlyValue}
                  onChange={(e) => setMonthlyValue(e.target.value)}
                  placeholder="500"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>Agreement Term</label>
                <select
                  value={agreementTerm}
                  onChange={(e) => setAgreementTerm(e.target.value as any)}
                >
                  <option value="3-year">3-Year (135% multiplier)</option>
                  <option value="1-year">1-Year (100% multiplier)</option>
                  <option value="MTM-with-install">MTM with Install (100%)</option>
                  <option value="MTM-no-install">MTM No Install (50%)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Start Date *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Pricing Line</label>
                <select
                  value={pricingLine}
                  onChange={(e) => setPricingLine(e.target.value as any)}
                >
                  <option value="Redline">Redline (Standard)</option>
                  <option value="Greenline">Greenline (+1% bonus)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Business Type</label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value as any)}
                >
                  <option value="new">New Business</option>
                  <option value="renewal">Renewal</option>
                </select>
              </div>
              {businessType === "renewal" && (
                <div className="form-group">
                  <label>Years as Customer</label>
                  <input
                    type="number"
                    value={yearsAsCustomer}
                    onChange={(e) => setYearsAsCustomer(e.target.value)}
                    min="0"
                  />
                  <small>4% bonus applies at 2+ years</small>
                </div>
              )}
            </div>
          </div>

          {}
          <div className="form-section">
            <h4>
              Account Type
              <label className="auto-detect-toggle">
                <input
                  type="checkbox"
                  checked={autoDetectEnabled}
                  onChange={(e) => setAutoDetectEnabled(e.target.checked)}
                />
                Auto-detect
              </label>
            </h4>

            {autoDetectEnabled ? (
              <div className="auto-detect-section">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Per-Visit Revenue ($)</label>
                    <input
                      type="number"
                      value={perVisitRevenue}
                      onChange={(e) => setPerVisitRevenue(e.target.value)}
                      placeholder="75"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="form-group">
                    <label>Distance to Anchor (miles)</label>
                    <input
                      type="number"
                      value={distanceToAnchor}
                      onChange={(e) => setDistanceToAnchor(e.target.value)}
                      placeholder="2.5"
                      min="0"
                      step="0.1"
                    />
                  </div>
                </div>
                {detectionResult && (
                  <div
                    className="detection-result"
                    style={{
                      backgroundColor: getAccountTypeBgColor(detectionResult.accountType),
                      color: getAccountTypeColor(detectionResult.accountType),
                    }}
                  >
                    <strong>Detected: {detectionResult.accountType}</strong>
                    <span className="confidence">({detectionResult.confidence} confidence)</span>
                    <div className="reason">{detectionResult.reason}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="form-grid">
                <div className="form-group">
                  <label>Account Type</label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as any)}
                  >
                    <option value="Anchor">Anchor ($200+/visit)</option>
                    <option value="Bread5">Bread5 (within 5 min)</option>
                    <option value="Bread15">Bread15 (within 15 min)</option>
                    <option value="Pit">Pit (far from anchor)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {}
          <div className="form-section">
            <div className="form-group full-width">
              <label>Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes..."
                rows={3}
              />
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}
          {success && <div className="form-success">{success}</div>}

          <div className="form-actions">
            <button type="submit" className="submit-btn" disabled={saving}>
              {saving ? "Creating Agreement..." : "Create Agreement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
