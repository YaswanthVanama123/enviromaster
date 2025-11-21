// src/features/services/foamingDrain/FoamingDrainForm.tsx
import React from "react";
import { useFoamingDrainCalc } from "./useFoamingDrainCalc";
import type {
  FoamingDrainFormState,
  FoamingDrainFrequency,
  FoamingDrainLocation,
  FoamingDrainCondition,
} from "./foamingDrainTypes";

interface FoamingDrainFormProps {
  initialData?: Partial<FoamingDrainFormState>;
}

export const FoamingDrainForm: React.FC<FoamingDrainFormProps> = ({
  initialData,
}) => {
  const { state, quote, updateField, reset } =
    useFoamingDrainCalc(initialData);

  const handleNumberChange =
    (field: keyof FoamingDrainFormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const num = raw === "" ? 0 : Number(raw);
      updateField(field, Number.isFinite(num) && num >= 0 ? num : 0);
    };

  const breakdown = quote.breakdown;

  // Helper for pricing model label
  const pricingLabel = (() => {
    if (breakdown.volumePricingApplied) {
      if (
        breakdown.usedAlternativePricing &&
        quote.frequency === "weekly"
      ) {
        // Big-account special
        return "Volume – Big-account $10/week per drain (install waived)";
      }
      return "Volume (10+ drains, install-level)";
    }

    if (breakdown.usedAlternativePricing) {
      return "Alternative ($20 + $4/drain)";
    }

    return "Standard ($10/drain)";
  })();

  return (
    <div className="svc-card">
      <div className="svc-card__inner">
        {/* <div className="svc-title-row">
          <h3 className="svc-title">Foaming Drain Service</h3>
        </div> */}
        <div className="svc-h-row">
          <div className="svc-h">Foaming Drain Service</div>
          <button type="button" className="svc-mini" aria-label="add">
            +
          </button>
        </div>


        {/* Counts */}
        <div className="svc-row">
          <div className="svc-label">
            <span>Standard Floor Drains</span>
          </div>
          <div className="svc-field">
            <input
              type="number"
              min={0}
              className="svc-in sm"
              value={state.standardDrainCount}
              onChange={handleNumberChange("standardDrainCount")}
            />
          </div>
        </div>

        <div className="svc-row">
          <div className="svc-label">
            <span>Grease Traps</span>
          </div>
          <div className="svc-field">
            <input
              type="number"
              min={0}
              className="svc-in sm"
              value={state.greaseTrapCount}
              onChange={handleNumberChange("greaseTrapCount")}
            />
          </div>
        </div>

        <div className="svc-row">
          <div className="svc-label">
            <span>Green Drains</span>
          </div>
          <div className="svc-field">
            <input
              type="number"
              min={0}
              className="svc-in sm"
              value={state.greenDrainCount}
              onChange={handleNumberChange("greenDrainCount")}
            />
          </div>
        </div>

        {/* Frequency */}
        <div className="svc-row">
          <div className="svc-label">
            <span>Service Frequency</span>
          </div>
          <div className="svc-field">
            <select
              className="svc-in"
              value={state.frequency}
              onChange={(e) =>
                updateField(
                  "frequency",
                  e.target.value as FoamingDrainFrequency
                )
              }
            >
              <option value="weekly">Weekly</option>
              <option value="bimonthly">Bi-Monthly (every 2 months)</option>
            </select>
          </div>
        </div>

        {/* Facility condition */}
        <div className="svc-row">
          <div className="svc-label">
            <span>Facility Condition</span>
          </div>
          <div className="svc-field">
            <select
              className="svc-in"
              value={state.facilityCondition}
              onChange={(e) =>
                updateField(
                  "facilityCondition",
                  e.target.value as FoamingDrainCondition
                )
              }
            >
              <option value="normal">Normal</option>
              <option value="filthy">Filthy (3× install)</option>
            </select>
          </div>
        </div>

        {/* Location / trip */}
        <div className="svc-row">
          <div className="svc-label">
            <span>Location / Trip Band</span>
          </div>
          <div className="svc-field">
            <select
              className="svc-in"
              value={state.location}
              onChange={(e) =>
                updateField(
                  "location",
                  e.target.value as FoamingDrainLocation
                )
              }
            >
              <option value="standard">Standard</option>
              <option value="beltway">Inside Beltway</option>
            </select>
          </div>
        </div>

        {/* Toggles */}
        <div className="svc-row">
          <div className="svc-label">
            <span>Extras</span>
          </div>
          <div className="svc-field">
            <div className="svc-inline">
              <label>
                <input
                  type="checkbox"
                  checked={state.needsPlumbing}
                  onChange={(e) =>
                    updateField("needsPlumbing", e.target.checked)
                  }
                />{" "}
                Plumbing work (+$10 / drain)
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={state.useAlternativePricing}
                  onChange={(e) =>
                    updateField("useAlternativePricing", e.target.checked)
                  }
                />{" "}
                {/* Explain both alternative modes */}
                Alt pricing:
                {" "}
                <span className="svc-note">
                  &lt; 10 drains → $20 + $4/drain; 10+ drains weekly  
                  {/*→ $10/week per drain install waived */}
                </span>
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={state.isAllInclusive}
                  onChange={(e) =>
                    updateField("isAllInclusive", e.target.checked)
                  }
                />{" "}
                All-Inclusive (standard drains included, trip waived)
              </label>
            </div>
          </div>
        </div>

        {/* SUMMARY / RESULTS */}
        <div className="svc-summary">
          <div className="svc-row">
            <div className="svc-label">
              <span>Pricing Model</span>
            </div>
            <div className="svc-field">
              <span className="svc-red">{pricingLabel}</span>
            </div>
          </div>

          <div className="svc-row">
            <div className="svc-label">
              <span>Weekly Service Subtotal</span>
            </div>
            <div className="svc-field svc-dollar">
              <span>$</span>
              <input
                readOnly
                className="svc-in sm"
                value={quote.weeklyService.toFixed(2)}
              />
            </div>
          </div>

          <div className="svc-row">
            <div className="svc-label">
              <span>Trip Charge</span>
            </div>
            <div className="svc-field svc-dollar">
              <span>$</span>
              <input
                readOnly
                className="svc-in sm"
                value={quote.tripCharge.toFixed(2)}
              />
            </div>
          </div>

          <div className="svc-row">
            <div className="svc-label">
              <span>Weekly Total (Service + Trip)</span>
            </div>
            <div className="svc-field svc-dollar">
              <span>$</span>
              <input
                readOnly
                className="svc-in sm"
                value={quote.weeklyTotal.toFixed(2)}
              />
            </div>
          </div>

          <div className="svc-row">
            <div className="svc-label">
              <span>Monthly Recurring</span>
            </div>
            <div className="svc-field svc-dollar">
              <span>$</span>
              <input
                readOnly
                className="svc-in sm"
                value={quote.monthlyRecurring.toFixed(2)}
              />
            </div>
          </div>

          <div className="svc-row">
            <div className="svc-label">
              <span>Annual Recurring</span>
            </div>
            <div className="svc-field svc-dollar">
              <span>$</span>
              <input
                readOnly
                className="svc-in sm"
                value={quote.annualRecurring.toFixed(2)}
              />
            </div>
          </div>

          <div className="svc-row">
            <div className="svc-label">
              <span>Installation Total</span>
            </div>
            <div className="svc-field svc-dollar">
              <span>$</span>
              <input
                readOnly
                className="svc-in sm"
                value={quote.installation.toFixed(2)}
              />
            </div>
          </div>

          {/* Reset (optional) */}
          {/* <div style={{ marginTop: 6 }}>
            <button
              type="button"
              className="svc-mini svc-mini--neg"
              onClick={reset}
            >
              Reset Foaming Drain
            </button>
          </div> */}
        </div>
      </div>
    </div>
  );
};
