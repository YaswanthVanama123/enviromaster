import React from "react";
import type { CommissionCalculationResult } from "../../../backendservice/types/commission.types";

interface CommissionResultDisplayProps {
  result: CommissionCalculationResult;
}

export const CommissionResultDisplay: React.FC<CommissionResultDisplayProps> = ({
  result,
}) => {
  const { breakdown, effectiveBaseRate, finalCommissionRate, weeklyCommission, annualCommission, input } = result;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number, showSign = false) => {
    const sign = showSign && value > 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  return (
    <div className="commission-result">
      <div className="result-header">
        <h3>Commission Calculation Result</h3>
        <span style={{ fontSize: "13px", color: "#6b7280" }}>
          Calculated at {new Date(result.calculatedAt).toLocaleString()}
        </span>
      </div>

      {}
      <div className="result-main">
        <div className="result-card">
          <div className="result-card-label">Final Commission Rate</div>
          <div className="result-card-value rate">
            {formatPercent(finalCommissionRate)}
          </div>
        </div>

        <div className="result-card">
          <div className="result-card-label">Weekly Commission</div>
          <div className="result-card-value">
            {formatCurrency(weeklyCommission)}
          </div>
        </div>

        <div className="result-card">
          <div className="result-card-label">Annual Commission</div>
          <div className="result-card-value">
            {formatCurrency(annualCommission)}
          </div>
        </div>
      </div>

      {}
      <div className="result-breakdown">
        <h4>Calculation Breakdown</h4>
        <div className="breakdown-grid">
          <div className="breakdown-item">
            <span className="breakdown-label">Base Rate ({input.quotaLevel} quota)</span>
            <span className="breakdown-value positive">
              {formatPercent(breakdown.baseRate)}
            </span>
          </div>

          <div className="breakdown-item">
            <span className="breakdown-label">Agreement Multiplier ({input.agreementTerm})</span>
            <span className="breakdown-value">
              {breakdown.agreementMultiplier}%
            </span>
          </div>

          <div className="breakdown-item">
            <span className="breakdown-label">Account Type ({input.accountType})</span>
            <span
              className={`breakdown-value ${
                breakdown.accountTypeAdjustment < 0 ? "negative" : ""
              }`}
            >
              {formatPercent(breakdown.accountTypeAdjustment, true)}
            </span>
          </div>

          <div className="breakdown-item">
            <span className="breakdown-label">Pricing Line ({input.pricingLine})</span>
            <span
              className={`breakdown-value ${
                breakdown.greenlineBonus > 0 ? "positive" : ""
              }`}
            >
              {formatPercent(breakdown.greenlineBonus, true)}
            </span>
          </div>

          {input.businessType === "renewal" && (
            <div className="breakdown-item">
              <span className="breakdown-label">
                Renewal Bonus ({input.yearsAsCustomer}+ yrs)
              </span>
              <span
                className={`breakdown-value ${
                  breakdown.renewalBonus > 0 ? "positive" : ""
                }`}
              >
                {formatPercent(breakdown.renewalBonus, true)}
              </span>
            </div>
          )}

          {input.isInsideSales && (
            <div className="breakdown-item">
              <span className="breakdown-label">Inside Sales Deduction</span>
              <span className="breakdown-value negative">
                {formatPercent(breakdown.insideSalesDeduction, true)}
              </span>
            </div>
          )}

          <div className="breakdown-item" style={{ backgroundColor: "#e0f2fe" }}>
            <span className="breakdown-label" style={{ fontWeight: 600 }}>
              Effective Base Rate
            </span>
            <span className="breakdown-value" style={{ color: "#0369a1" }}>
              {formatPercent(effectiveBaseRate)}
            </span>
          </div>
        </div>

        <div
          style={{
            marginTop: "16px",
            padding: "12px",
            backgroundColor: "#f0fdf4",
            borderRadius: "8px",
            fontSize: "13px",
            color: "#166534",
          }}
        >
          <strong>Formula:</strong> Effective Rate ({formatPercent(effectiveBaseRate)}) ×
          Agreement Multiplier ({breakdown.agreementMultiplier}%) ={" "}
          <strong>{formatPercent(finalCommissionRate)}</strong>
          <br />
          <strong>Weekly:</strong> {formatCurrency(annualCommission)} / 52 ={" "}
          <strong>{formatCurrency(weeklyCommission)}</strong>
        </div>
      </div>
    </div>
  );
};
