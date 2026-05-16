import React, { useState, useEffect } from "react";
import { commissionApi } from "../../../backendservice/api/commissionApi";
import type { CommissionRules } from "../../../backendservice/types/commission.types";

export const CommissionRulesManager: React.FC = () => {
  const [rules, setRules] = useState<CommissionRules | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const response = await commissionApi.getActiveRules();
      if (response.data) {
        setRules(response.data);
      }
    } catch (err) {
      setError("Failed to load commission rules");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!rules?._id) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await commissionApi.updateRules(rules._id, rules);
      if (response.error) {
        setError(response.error);
      } else {
        setSuccess("Commission rules updated successfully!");
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError("Failed to save commission rules");
    } finally {
      setSaving(false);
    }
  };

  const updateQuotaRate = (key: "below" | "above" | "double", value: string) => {
    if (!rules) return;
    setRules({
      ...rules,
      quotaRates: {
        ...rules.quotaRates,
        [key]: parseFloat(value) || 0,
      },
    });
  };

  const updateAgreementMultiplier = (
    key: "3-year" | "1-year" | "MTM-with-install" | "MTM-no-install",
    value: string
  ) => {
    if (!rules) return;
    setRules({
      ...rules,
      agreementMultipliers: {
        ...rules.agreementMultipliers,
        [key]: parseFloat(value) || 0,
      },
    });
  };

  const updateAccountAdjustment = (
    key: "Anchor" | "Bread5" | "Bread15" | "Pit",
    value: string
  ) => {
    if (!rules) return;
    setRules({
      ...rules,
      accountTypeAdjustments: {
        ...rules.accountTypeAdjustments,
        [key]: parseFloat(value) || 0,
      },
    });
  };

  if (loading) {
    return (
      <div className="loading-state">
        <span>Loading commission rules...</span>
      </div>
    );
  }

  if (!rules) {
    return (
      <div className="empty-state">
        <p>No commission rules found. Please contact an administrator.</p>
      </div>
    );
  }

  return (
    <div className="commission-rules-manager">
      <h3 className="calculator-section-title">
        <span>⚙️</span> Commission Rules Configuration
      </h3>

      {error && <div className="error-message">{error}</div>}
      {success && (
        <div
          className="error-message"
          style={{ backgroundColor: "#f0fdf4", borderColor: "#86efac", color: "#166534" }}
        >
          {success}
        </div>
      )}

      {/* Quota Rates */}
      <div className="rules-section">
        <h3>Quota Achievement Rates (%)</h3>
        <div className="rules-grid">
          <div className="rules-input-group">
            <label>Below Quota</label>
            <input
              type="number"
              value={rules.quotaRates.below}
              onChange={(e) => updateQuotaRate("below", e.target.value)}
              step="0.1"
            />
          </div>
          <div className="rules-input-group">
            <label>Above Quota</label>
            <input
              type="number"
              value={rules.quotaRates.above}
              onChange={(e) => updateQuotaRate("above", e.target.value)}
              step="0.1"
            />
          </div>
          <div className="rules-input-group">
            <label>Double Quota</label>
            <input
              type="number"
              value={rules.quotaRates.double}
              onChange={(e) => updateQuotaRate("double", e.target.value)}
              step="0.1"
            />
          </div>
        </div>
      </div>

      {/* Agreement Multipliers */}
      <div className="rules-section">
        <h3>Agreement Term Multipliers (%)</h3>
        <div className="rules-grid rules-grid-4">
          <div className="rules-input-group">
            <label>3-Year</label>
            <input
              type="number"
              value={rules.agreementMultipliers["3-year"]}
              onChange={(e) => updateAgreementMultiplier("3-year", e.target.value)}
              step="1"
            />
          </div>
          <div className="rules-input-group">
            <label>1-Year</label>
            <input
              type="number"
              value={rules.agreementMultipliers["1-year"]}
              onChange={(e) => updateAgreementMultiplier("1-year", e.target.value)}
              step="1"
            />
          </div>
          <div className="rules-input-group">
            <label>MTM + Install</label>
            <input
              type="number"
              value={rules.agreementMultipliers["MTM-with-install"]}
              onChange={(e) => updateAgreementMultiplier("MTM-with-install", e.target.value)}
              step="1"
            />
          </div>
          <div className="rules-input-group">
            <label>MTM No Install</label>
            <input
              type="number"
              value={rules.agreementMultipliers["MTM-no-install"]}
              onChange={(e) => updateAgreementMultiplier("MTM-no-install", e.target.value)}
              step="1"
            />
          </div>
        </div>
      </div>

      {/* Account Type Adjustments */}
      <div className="rules-section">
        <h3>Account Type Adjustments (%)</h3>
        <div className="rules-grid rules-grid-4">
          <div className="rules-input-group">
            <label>Anchor</label>
            <input
              type="number"
              value={rules.accountTypeAdjustments.Anchor}
              onChange={(e) => updateAccountAdjustment("Anchor", e.target.value)}
              step="0.1"
            />
          </div>
          <div className="rules-input-group">
            <label>Bread5</label>
            <input
              type="number"
              value={rules.accountTypeAdjustments.Bread5}
              onChange={(e) => updateAccountAdjustment("Bread5", e.target.value)}
              step="0.1"
            />
          </div>
          <div className="rules-input-group">
            <label>Bread15</label>
            <input
              type="number"
              value={rules.accountTypeAdjustments.Bread15}
              onChange={(e) => updateAccountAdjustment("Bread15", e.target.value)}
              step="0.1"
            />
          </div>
          <div className="rules-input-group">
            <label>Pit</label>
            <input
              type="number"
              value={rules.accountTypeAdjustments.Pit}
              onChange={(e) => updateAccountAdjustment("Pit", e.target.value)}
              step="0.1"
            />
          </div>
        </div>
      </div>

      {/* Other Settings */}
      <div className="rules-section">
        <h3>Other Settings</h3>
        <div className="rules-grid">
          <div className="rules-input-group">
            <label>Greenline Bonus (%)</label>
            <input
              type="number"
              value={rules.greenlineBonus}
              onChange={(e) =>
                setRules({ ...rules, greenlineBonus: parseFloat(e.target.value) || 0 })
              }
              step="0.1"
            />
          </div>
          <div className="rules-input-group">
            <label>Renewal Bonus Rate (%)</label>
            <input
              type="number"
              value={rules.renewalBonusRate}
              onChange={(e) =>
                setRules({ ...rules, renewalBonusRate: parseFloat(e.target.value) || 0 })
              }
              step="0.1"
            />
          </div>
          <div className="rules-input-group">
            <label>Renewal Min Years</label>
            <input
              type="number"
              value={rules.renewalMinYears}
              onChange={(e) =>
                setRules({ ...rules, renewalMinYears: parseInt(e.target.value, 10) || 0 })
              }
              min="0"
            />
          </div>
          <div className="rules-input-group">
            <label>Inside Sales Deduction (%)</label>
            <input
              type="number"
              value={rules.insideSalesDeduction}
              onChange={(e) =>
                setRules({ ...rules, insideSalesDeduction: parseFloat(e.target.value) || 0 })
              }
              step="0.1"
            />
          </div>
          <div className="rules-input-group">
            <label>Anchor Min Monthly Value ($)</label>
            <input
              type="number"
              value={rules.anchorMinMonthlyValue}
              onChange={(e) =>
                setRules({
                  ...rules,
                  anchorMinMonthlyValue: parseFloat(e.target.value) || 0,
                })
              }
              min="0"
            />
          </div>
        </div>
      </div>

      <button className="save-rules-btn" onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save Commission Rules"}
      </button>
    </div>
  );
};
