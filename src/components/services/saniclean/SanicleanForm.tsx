// src/features/services/saniclean/SanicleanForm.tsx
import React from "react";
import { useSanicleanCalc } from "./useSanicleanCalc";
import type {
  SanicleanFormState,
  SanicleanLocation,
  SanicleanRateTier,
  SanicleanSoapUpgradeType,
} from "./sanicleanTypes";

interface SanicleanFormProps {
  initialData?: Partial<SanicleanFormState>;
}

export const SanicleanForm: React.FC<SanicleanFormProps> = ({
  initialData,
}) => {
  const { state, updateField, reset, quote } = useSanicleanCalc(initialData);

  const onNumberChange = (
    key: keyof SanicleanFormState,
    raw: string
  ) => {
    const n = Number(raw);
    updateField(key, (isNaN(n) ? 0 : n) as any);
  };

  return (
    <div className="svc-card">
      <div className="svc-card-header">
        <h3 className="svc-card-title">SaniClean</h3>
        <p className="svc-card-subtitle">
          Core weekly restroom &amp; hygiene service with all-inclusive option.
        </p>
      </div>

      <div className="svc-card-body">
        <div className="svc-grid">
          {/* LEFT SIDE – INPUTS */}
          <div>
            {/* Core counts */}
            <div className="svc-row">
              <label className="svc-label">Total fixtures</label>
              <input
                type="number"
                min={0}
                className="svc-input"
                value={state.fixtureCount}
                onChange={(e) =>
                  onNumberChange("fixtureCount", e.target.value)
                }
              />
            </div>

            <div className="svc-row">
              <label className="svc-label">Location</label>
              <select
                className="svc-input"
                value={state.location}
                onChange={(e) =>
                  updateField(
                    "location",
                    e.target.value as SanicleanLocation
                  )
                }
              >
                <option value="insideBeltway">Inside Beltway</option>
                <option value="outsideBeltway">Outside Beltway</option>
              </select>
            </div>

            <div className="svc-row svc-row-inline">
              <label className="svc-label">
                Parking required (inside Beltway)
              </label>
              <input
                type="checkbox"
                checked={state.needsParking}
                onChange={(e) =>
                  updateField("needsParking", e.target.checked)
                }
              />
            </div>

            <div className="svc-row svc-row-inline">
              <label className="svc-label">All-inclusive package</label>
              <input
                type="checkbox"
                checked={state.isAllInclusive}
                onChange={(e) =>
                  updateField("isAllInclusive", e.target.checked)
                }
              />
            </div>

            {/* Fixture breakdown */}
            <div className="svc-row">
              <label className="svc-label">Fixture breakdown</label>
              <div className="svc-multi">
                <div className="svc-multi-item">
                  <span className="svc-multi-label">Sinks</span>
                  <input
                    type="number"
                    min={0}
                    className="svc-input"
                    value={state.sinks}
                    onChange={(e) => onNumberChange("sinks", e.target.value)}
                  />
                </div>
                <div className="svc-multi-item">
                  <span className="svc-multi-label">Urinals</span>
                  <input
                    type="number"
                    min={0}
                    className="svc-input"
                    value={state.urinals}
                    onChange={(e) =>
                      onNumberChange("urinals", e.target.value)
                    }
                  />
                </div>
                <div className="svc-multi-item">
                  <span className="svc-multi-label">Male toilets</span>
                  <input
                    type="number"
                    min={0}
                    className="svc-input"
                    value={state.maleToilets}
                    onChange={(e) =>
                      onNumberChange("maleToilets", e.target.value)
                    }
                  />
                </div>
                <div className="svc-multi-item">
                  <span className="svc-multi-label">Female toilets</span>
                  <input
                    type="number"
                    min={0}
                    className="svc-input"
                    value={state.femaleToilets}
                    onChange={(e) =>
                      onNumberChange("femaleToilets", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            {/* Soap upgrade */}
            <div className="svc-row">
              <label className="svc-label">Soap upgrade</label>
              <select
                className="svc-input"
                value={state.soapUpgradeType}
                onChange={(e) =>
                  updateField(
                    "soapUpgradeType",
                    e.target.value as SanicleanSoapUpgradeType
                  )
                }
              >
                <option value="none">Standard</option>
                <option value="luxury">Luxury (+$5/disp/week)</option>
              </select>
            </div>

            {state.soapUpgradeType === "luxury" && (
              <div className="svc-row">
                <label className="svc-label"># of soap dispensers</label>
                <input
                  type="number"
                  min={0}
                  className="svc-input"
                  value={state.soapDispensers}
                  onChange={(e) =>
                    onNumberChange("soapDispensers", e.target.value)
                  }
                />
              </div>
            )}

            {/* Microfiber + drains */}
            <div className="svc-row">
              <label className="svc-label">
                Microfiber mopping bathrooms
              </label>
              <input
                type="number"
                min={0}
                className="svc-input"
                value={state.bathroomsForMopping}
                onChange={(e) =>
                  onNumberChange("bathroomsForMopping", e.target.value)
                }
              />
            </div>

            <div className="svc-row">
              <label className="svc-label">
                Drain line service – # of drains
              </label>
              <input
                type="number"
                min={0}
                className="svc-input"
                value={state.drains}
                onChange={(e) => {
                  const raw = e.target.value;
                  const n = Number(raw);
                  const val = isNaN(n) ? 0 : n;
                  updateField("drains", val);
                  updateField("includeDrainService", val > 0);
                }}
              />
            </div>

            {/* Rate tier */}
            <div className="svc-row">
              <label className="svc-label">Rate tier</label>
              <select
                className="svc-input"
                value={state.rateTier}
                onChange={(e) =>
                  updateField(
                    "rateTier",
                    e.target.value as SanicleanRateTier
                  )
                }
              >
                <option value="redRate">Red (standard)</option>
                <option value="greenRate">Green (+30%)</option>
              </select>
            </div>
          </div>

          {/* RIGHT SIDE – SUMMARY & NOTES */}
          <div>
            <div className="svc-summary">
              <div className="svc-summary-row">
                <span className="svc-summary-label">Weekly total</span>
                <span className="svc-summary-value">
                  ${quote.weekly.toFixed(2)}
                </span>
              </div>
              <div className="svc-summary-row">
                <span className="svc-summary-label">
                  Monthly (≈ 4.2× weekly)
                </span>
                <span className="svc-summary-value">
                  ${quote.monthly.toFixed(2)}
                </span>
              </div>
              <div className="svc-summary-row">
                <span className="svc-summary-label">Annual (× 50)</span>
                <span className="svc-summary-value">
                  ${quote.annual.toFixed(2)}
                </span>
              </div>
            </div>

            {quote.detailsBreakdown?.length > 0 && (
              <ul className="svc-breakdown-list">
                {quote.detailsBreakdown.map((line, idx) => (
                  <li key={idx} className="svc-breakdown-item">
                    {line}
                  </li>
                ))}
              </ul>
            )}

            <div className="svc-row">
              <label className="svc-label">Notes</label>
              <textarea
                className="svc-input"
                rows={3}
                value={state.notes}
                onChange={(e) =>
                  updateField("notes", e.target.value)
                }
              />
            </div>

            <button
              type="button"
              className="svc-reset-btn"
              onClick={reset}
            >
              Reset SaniClean
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
