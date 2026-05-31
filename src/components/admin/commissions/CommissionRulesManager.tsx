import React, { useState, useEffect } from "react";
import { commissionApi } from "../../../backendservice/api/commissionApi";
import type { CommissionRules } from "../../../backendservice/types/commission.types";
import {
  PRICING_TIERS,
  ACCOUNT_TYPE_REVENUE_RULES,
  FREQUENCY_VISITS_PER_YEAR,
  DEFAULT_QUOTA_TIER_CUTOFFS,
  PIT_PER_VISIT_THRESHOLD,
  ANCHOR_PER_VISIT_THRESHOLD,
  ANCHOR_BONUS_MULTIPLIER,
} from "../../../backendservice/types/commission.types";

function hydrateV2Fields(rules: CommissionRules): CommissionRules {
  return {
    ...rules,
    pricingTiers:
      rules.pricingTiers && rules.pricingTiers.length > 0
        ? rules.pricingTiers
        : PRICING_TIERS.map(t => ({ ...t })),
    perVisitPenalties: rules.perVisitPenalties ?? {
      Bread5: ACCOUNT_TYPE_REVENUE_RULES.Bread5.revenueDeduction,
      Bread15: ACCOUNT_TYPE_REVENUE_RULES.Bread15.revenueDeduction,
      Pit: ACCOUNT_TYPE_REVENUE_RULES.Pit.revenueDeduction,
    },
    anchorMinPerVisit: rules.anchorMinPerVisit ?? 200,
    anchorMinGreenline: rules.anchorMinGreenline ?? 100,
    pitPerVisitThreshold: rules.pitPerVisitThreshold ?? PIT_PER_VISIT_THRESHOLD,
    anchorPerVisitThreshold: rules.anchorPerVisitThreshold ?? ANCHOR_PER_VISIT_THRESHOLD,
    anchorBonusMultiplier: rules.anchorBonusMultiplier ?? ANCHOR_BONUS_MULTIPLIER,
    frequencyVisitsPerYear: rules.frequencyVisitsPerYear ?? {
      weekly: FREQUENCY_VISITS_PER_YEAR.weekly,
      biweekly: FREQUENCY_VISITS_PER_YEAR.biweekly,
      monthly: FREQUENCY_VISITS_PER_YEAR.monthly,
      quarterly: FREQUENCY_VISITS_PER_YEAR.quarterly,
      'one-time': FREQUENCY_VISITS_PER_YEAR['one-time'],
    },
    quotaTierCutoffs: rules.quotaTierCutoffs ?? {
      aboveQuota: DEFAULT_QUOTA_TIER_CUTOFFS.aboveQuota,
      doubleQuota: DEFAULT_QUOTA_TIER_CUTOFFS.doubleQuota,
    },
    weeksPerAnnualCommission: rules.weeksPerAnnualCommission ?? 52,
  };
}

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
        setRules(hydrateV2Fields(response.data));
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

  const updatePerVisitPenalty = (
    key: "Bread5" | "Bread15" | "Pit",
    value: string
  ) => {
    if (!rules) return;
    const current = rules.perVisitPenalties || { Bread5: 50, Bread15: 75, Pit: 100 };
    setRules({
      ...rules,
      perVisitPenalties: {
        ...current,
        [key]: parseFloat(value) || 0,
      },
    });
  };

  const updateFrequencyVisits = (
    key: "weekly" | "biweekly" | "monthly" | "quarterly" | "one-time",
    value: string
  ) => {
    if (!rules) return;
    const current = rules.frequencyVisitsPerYear || {
      weekly: 50,
      biweekly: 25,
      monthly: 12,
      quarterly: 4,
      "one-time": 1,
    };
    setRules({
      ...rules,
      frequencyVisitsPerYear: {
        ...current,
        [key]: parseFloat(value) || 0,
      },
    });
  };

  const updateQuotaTierCutoff = (
    key: "aboveQuota" | "doubleQuota",
    value: string
  ) => {
    if (!rules) return;
    const current = rules.quotaTierCutoffs || { aboveQuota: 10000, doubleQuota: 20000 };
    setRules({
      ...rules,
      quotaTierCutoffs: {
        ...current,
        [key]: parseFloat(value) || 0,
      },
    });
  };

  
  
  const updatePricingTier = (
    index: number,
    field: "minRatio" | "maxRatio" | "quotaMultiplier" | "label" | "requiresApproval",
    value: string | boolean
  ) => {
    if (!rules) return;
    const current =
      rules.pricingTiers && rules.pricingTiers.length > 0
        ? rules.pricingTiers
        : [
            { minRatio: 0,    maxRatio: 0.99, quotaMultiplier: 0.5,  label: "Below Redline",     requiresApproval: true  },
            { minRatio: 1.0,  maxRatio: 1.09, quotaMultiplier: 1.0,  label: "Redline",            requiresApproval: false },
            { minRatio: 1.10, maxRatio: 1.19, quotaMultiplier: 1.25, label: "110% Premium",       requiresApproval: false },
            { minRatio: 1.20, maxRatio: 1.29, quotaMultiplier: 1.5,  label: "120% Premium",       requiresApproval: false },
            { minRatio: 1.30, maxRatio: Infinity, quotaMultiplier: 2.0, label: "Greenline (130%+)", requiresApproval: false },
          ];
    const next = [...current];
    if (field === "label") {
      next[index] = { ...next[index], label: String(value) };
    } else if (field === "requiresApproval") {
      next[index] = { ...next[index], requiresApproval: Boolean(value) };
    } else if (field === "minRatio" || field === "maxRatio") {
      
      const pct = parseFloat(String(value));
      const ratio = isFinite(pct) ? pct / 100 : 0;
      next[index] = { ...next[index], [field]: ratio };
    } else {
      next[index] = { ...next[index], [field]: parseFloat(String(value)) || 0 };
    }
    setRules({ ...rules, pricingTiers: next });
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

      {}
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

      {}
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

      {}
      <div className="rules-section">
        <h3>Per-Visit Penalties (V2 — $)</h3>
        <p style={{ fontSize: "0.85em", color: "#6b7280", marginTop: -4 }}>
          Subtracted from per-visit revenue for <strong>new</strong> Bread / Pit accounts.
          Existing accounts pay no penalty.
        </p>
        <div className="rules-grid rules-grid-4">
          <div className="rules-input-group">
            <label>Bread5 (5 min from Anchor)</label>
            <input
              type="number"
              value={rules.perVisitPenalties?.Bread5 ?? 50}
              onChange={(e) => updatePerVisitPenalty("Bread5", e.target.value)}
              min="0"
              step="1"
            />
          </div>
          <div className="rules-input-group">
            <label>Bread15 (15 min from Anchor)</label>
            <input
              type="number"
              value={rules.perVisitPenalties?.Bread15 ?? 75}
              onChange={(e) => updatePerVisitPenalty("Bread15", e.target.value)}
              min="0"
              step="1"
            />
          </div>
          <div className="rules-input-group">
            <label>Pit (no nearby Anchor)</label>
            <input
              type="number"
              value={rules.perVisitPenalties?.Pit ?? 100}
              onChange={(e) => updatePerVisitPenalty("Pit", e.target.value)}
              min="0"
              step="1"
            />
          </div>
        </div>
      </div>

      {}
      <div className="rules-section">
        <h3>Anchor Thresholds (V2 — per visit $)</h3>
        <div className="rules-grid rules-grid-4">
          <div className="rules-input-group">
            <label>Anchor Min ($)</label>
            <input
              type="number"
              value={rules.anchorMinPerVisit ?? 200}
              onChange={(e) =>
                setRules({ ...rules, anchorMinPerVisit: parseFloat(e.target.value) || 0 })
              }
              min="0"
              step="10"
            />
          </div>
          <div className="rules-input-group">
            <label>Anchor Min Greenline ($)</label>
            <input
              type="number"
              value={rules.anchorMinGreenline ?? 100}
              onChange={(e) =>
                setRules({ ...rules, anchorMinGreenline: parseFloat(e.target.value) || 0 })
              }
              min="0"
              step="10"
            />
          </div>
          <div className="rules-input-group">
            <label>Pit Threshold ($)</label>
            <input
              type="number"
              value={rules.pitPerVisitThreshold ?? 100}
              onChange={(e) =>
                setRules({ ...rules, pitPerVisitThreshold: parseFloat(e.target.value) || 0 })
              }
              min="0"
              step="10"
            />
          </div>
          <div className="rules-input-group">
            <label>Anchor Threshold ($)</label>
            <input
              type="number"
              value={rules.anchorPerVisitThreshold ?? 200}
              onChange={(e) =>
                setRules({ ...rules, anchorPerVisitThreshold: parseFloat(e.target.value) || 0 })
              }
              min="0"
              step="10"
            />
          </div>
          <div className="rules-input-group">
            <label>Anchor Bonus Multiplier (×)</label>
            <input
              type="number"
              value={rules.anchorBonusMultiplier ?? 1.5}
              onChange={(e) =>
                setRules({ ...rules, anchorBonusMultiplier: parseFloat(e.target.value) || 0 })
              }
              min="1"
              step="0.05"
            />
          </div>
        </div>
      </div>

      {}
      <div className="rules-section">
        <h3>Pricing Tiers (V2 — % range → multiplier)</h3>
        <p style={{ fontSize: "0.85em", color: "#6b7280", marginTop: -4, marginBottom: 12 }}>
          Drives both quota credit and commission base. Range is the agreement's
          current/redline ratio expressed as a percentage. Spec: <em>Redline $1 per $1, Greenline $2 per dollar.</em>
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(rules.pricingTiers || []).map((tier, idx) => {
            const minPct = (tier.minRatio * 100).toFixed(0);
            const maxPct = Number.isFinite(tier.maxRatio)
              ? (tier.maxRatio * 100).toFixed(0)
              : "9999";
            return (
              <div
                key={idx}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(180px, 2fr) repeat(3, minmax(90px, 1fr)) auto",
                  gap: 12,
                  alignItems: "end",
                  padding: 12,
                  background: "#f9fafb",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                }}
              >
                <div className="rules-input-group" style={{ marginBottom: 0 }}>
                  <label>Label</label>
                  <input
                    type="text"
                    value={tier.label}
                    onChange={(e) => updatePricingTier(idx, "label", e.target.value)}
                  />
                </div>
                <div className="rules-input-group" style={{ marginBottom: 0 }}>
                  <label>Min %</label>
                  <input
                    type="number"
                    value={minPct}
                    onChange={(e) => updatePricingTier(idx, "minRatio", e.target.value)}
                    step="1"
                  />
                </div>
                <div className="rules-input-group" style={{ marginBottom: 0 }}>
                  <label>Max %</label>
                  <input
                    type="number"
                    value={maxPct}
                    onChange={(e) => updatePricingTier(idx, "maxRatio", e.target.value)}
                    step="1"
                  />
                </div>
                <div className="rules-input-group" style={{ marginBottom: 0 }}>
                  <label>Multiplier (×)</label>
                  <input
                    type="number"
                    value={tier.quotaMultiplier}
                    onChange={(e) => updatePricingTier(idx, "quotaMultiplier", e.target.value)}
                    step="0.05"
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    paddingBottom: 6,
                    minWidth: 80,
                  }}
                >
                  <label
                    style={{
                      fontSize: "0.75em",
                      fontWeight: 500,
                      color: "#6b7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Approval?
                  </label>
                  <input
                    type="checkbox"
                    checked={tier.requiresApproval}
                    onChange={(e) => updatePricingTier(idx, "requiresApproval", e.target.checked)}
                    style={{ width: 18, height: 18, cursor: "pointer" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* V2 — Frequency visits per year */}
      <div className="rules-section">
        <h3>Visits Per Year by Frequency (V2)</h3>
        <p style={{ fontSize: "0.85em", color: "#6b7280", marginTop: -4 }}>
          Spec: weekly billing uses <strong>50</strong> weeks (holidays excluded), monthly 12, quarterly 4.
        </p>
        <div className="rules-grid rules-grid-4">
          <div className="rules-input-group">
            <label>Weekly</label>
            <input
              type="number"
              value={rules.frequencyVisitsPerYear?.weekly ?? 50}
              onChange={(e) => updateFrequencyVisits("weekly", e.target.value)}
              min="0"
              step="1"
            />
          </div>
          <div className="rules-input-group">
            <label>Bi-Weekly</label>
            <input
              type="number"
              value={rules.frequencyVisitsPerYear?.biweekly ?? 25}
              onChange={(e) => updateFrequencyVisits("biweekly", e.target.value)}
              min="0"
              step="1"
            />
          </div>
          <div className="rules-input-group">
            <label>Monthly</label>
            <input
              type="number"
              value={rules.frequencyVisitsPerYear?.monthly ?? 12}
              onChange={(e) => updateFrequencyVisits("monthly", e.target.value)}
              min="0"
              step="1"
            />
          </div>
          <div className="rules-input-group">
            <label>Quarterly</label>
            <input
              type="number"
              value={rules.frequencyVisitsPerYear?.quarterly ?? 4}
              onChange={(e) => updateFrequencyVisits("quarterly", e.target.value)}
              min="0"
              step="1"
            />
          </div>
          <div className="rules-input-group">
            <label>One-Time</label>
            <input
              type="number"
              value={rules.frequencyVisitsPerYear?.["one-time"] ?? 1}
              onChange={(e) => updateFrequencyVisits("one-time", e.target.value)}
              min="0"
              step="1"
            />
          </div>
        </div>
        <div className="rules-grid" style={{ marginTop: 12 }}>
          <div className="rules-input-group">
            <label>Weeks Per Annual Commission (display divisor)</label>
            <input
              type="number"
              value={rules.weeksPerAnnualCommission ?? 52}
              onChange={(e) =>
                setRules({ ...rules, weeksPerAnnualCommission: parseFloat(e.target.value) || 0 })
              }
              min="1"
              step="1"
            />
            <small style={{ display: "block", color: "#6b7280", marginTop: 4 }}>
              Used when converting annual → weekly commission for display.
              Default 52 (calendar weeks). Set to 50 to align with the spec's
              billed-week count.
            </small>
          </div>
        </div>
      </div>

      {}
      <div className="rules-section">
        <h3>Quota Tier Cutoffs (V2 — $)</h3>
        <p style={{ fontSize: "0.85em", color: "#6b7280", marginTop: -4 }}>
          Piecewise commission rate splits at these annualized quota-credit positions.
          Default: $10K (above quota), $20K (double quota).
        </p>
        <div className="rules-grid">
          <div className="rules-input-group">
            <label>Above Quota Cutoff ($)</label>
            <input
              type="number"
              value={rules.quotaTierCutoffs?.aboveQuota ?? 10000}
              onChange={(e) => updateQuotaTierCutoff("aboveQuota", e.target.value)}
              min="0"
              step="500"
            />
          </div>
          <div className="rules-input-group">
            <label>Double Quota Cutoff ($)</label>
            <input
              type="number"
              value={rules.quotaTierCutoffs?.doubleQuota ?? 20000}
              onChange={(e) => updateQuotaTierCutoff("doubleQuota", e.target.value)}
              min="0"
              step="500"
            />
          </div>
        </div>
      </div>

      {}
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
