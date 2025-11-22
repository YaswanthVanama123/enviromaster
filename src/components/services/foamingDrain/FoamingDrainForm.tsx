// src/features/services/foamingDrain/FoamingDrainForm.tsx
import React from "react";
import { useFoamingDrainCalc } from "./useFoamingDrainCalc";
import type {
  FoamingDrainFormState,
  FoamingDrainFrequency,
  FoamingDrainLocation,
  FoamingDrainCondition,
} from "./foamingDrainTypes";
import { FOAMING_DRAIN_CONFIG as cfg } from "./foamingDrainConfig";

interface FoamingDrainFormProps {
  initialData?: Partial<FoamingDrainFormState>;
}

// Hide 0.00 when nothing entered
const formatAmount = (n: number): string => (n > 0 ? n.toFixed(2) : "");

export const FoamingDrainForm: React.FC<FoamingDrainFormProps> = ({
  initialData,
}) => {
  const { state, quote, updateField, reset } =
    useFoamingDrainCalc(initialData);

  const breakdown = quote.breakdown;

  // Availability for alt options
  const isWeekly = state.frequency === "weekly";
  const isVolume = state.standardDrainCount >= cfg.volumePricing.minimumDrains; // 10+
  const canUseSmallAlt =
    isWeekly && state.standardDrainCount > 0 && !isVolume;
  const canUseBigAlt = isWeekly && isVolume;

  const handleNumberChange =
    (field: keyof FoamingDrainFormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const num = raw === "" ? 0 : Number(raw);
      const safe = Number.isFinite(num) && num >= 0 ? num : 0;

      // Special logic for standard drains to auto-clear invalid alt checkboxes
      if (field === "standardDrainCount") {
        const newCount = safe;
        const newIsVolume =
          newCount >= cfg.volumePricing.minimumDrains;
        const newCanSmallAlt =
          state.frequency === "weekly" &&
          newCount > 0 &&
          !newIsVolume;
        const newCanBigAlt =
          state.frequency === "weekly" && newIsVolume;

        updateField("standardDrainCount", newCount);

        // If current selections are no longer valid, clear them
        if (!newCanSmallAlt && state.useSmallAltPricingWeekly) {
          updateField("useSmallAltPricingWeekly", false);
        }
        if (!newCanBigAlt && state.useBigAccountTenWeekly) {
          updateField("useBigAccountTenWeekly", false);
        }

        // If filthyDrainCount is now higher than total drains, clamp via calc
        return;
      }

      updateField(field, safe);
    };

  const handleFrequencyChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newFreq = e.target.value as FoamingDrainFrequency;
    updateField("frequency", newFreq);

    // Alt options only meaningful for weekly; clear if leaving weekly
    if (newFreq !== "weekly") {
      updateField("useSmallAltPricingWeekly", false);
      updateField("useBigAccountTenWeekly", false);
    } else {
      // If we come back to weekly, revalidate with current count
      const count = state.standardDrainCount;
      const newIsVolume =
        count >= cfg.volumePricing.minimumDrains;
      const newCanSmallAlt = count > 0 && !newIsVolume;
      const newCanBigAlt = newIsVolume;

      if (!newCanSmallAlt && state.useSmallAltPricingWeekly) {
        updateField("useSmallAltPricingWeekly", false);
      }
      if (!newCanBigAlt && state.useBigAccountTenWeekly) {
        updateField("useBigAccountTenWeekly", false);
      }
    }
  };

  const handleLocationChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    updateField("location", e.target.value as FoamingDrainLocation);
  };

  const handleConditionChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    updateField(
      "facilityCondition",
      e.target.value as FoamingDrainCondition
    );
  };

  const handleTripChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const raw = e.target.value;
    if (raw === "") {
      // Clear override → fall back to config default
      updateField("tripChargeOverride", undefined as any);
      return;
    }
    const num = Number(raw);
    const safe = Number.isFinite(num) && num >= 0 ? num : 0;
    updateField("tripChargeOverride", safe);
  };

  // Pricing model label
  const pricingLabel = (() => {
    if (breakdown.usedBigAccountAlt) {
      return "Volume – $10/week per drain, install waived (10+ drains)";
    }
    if (breakdown.volumePricingApplied) {
      return "Volume (10+ drains, install-level)";
    }
    if (breakdown.usedSmallAlt) {
      return "Alternative (weekly: $20 + $4/drain)";
    }
    return "Standard ($10/drain)";
  })();

  // Calc-line numbers: qty @ rate = total
  const stdQty = state.standardDrainCount;
  const stdTotal = breakdown.weeklyStandardDrains;
  const stdRate = stdQty > 0 ? stdTotal / stdQty : 0;

  const greaseQty = state.greaseTrapCount;
  const greaseTotal = breakdown.weeklyGreaseTraps;
  const greaseRate = greaseQty > 0 ? greaseTotal / greaseQty : 0;

  const greenQty = state.greenDrainCount;
  const greenTotal = breakdown.weeklyGreenDrains;
  const greenRate = greenQty > 0 ? greenTotal / greenQty : 0;

  const tripInputValue =
    typeof state.tripChargeOverride === "number"
      ? state.tripChargeOverride
      : breakdown.tripCharge;

  return (
    <div className="svc-card">
      <div className="svc-card__inner">
        <div className="svc-h-row">
          <div className="svc-h">FOAMING DRAIN SERVICE</div>
          <button type="button" className="svc-mini" aria-label="add">
            +
          </button>
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
              onChange={handleFrequencyChange}
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
              onChange={handleConditionChange}
            >
              <option value="normal">Normal</option>
              <option value="filthy">Filthy (3× install)</option>
            </select>
          </div>
        </div>

        {/* How many filthy drains (for 3× install) */}
        {state.facilityCondition === "filthy" && (
          <div className="svc-row">
            <div className="svc-label">
              <span>Filthy Drains (3× install)</span>
            </div>
            <div className="svc-field">
              <input
                type="number"
                min={0}
                className="svc-in sm"
                style={{ width: 80 }}
                value={state.filthyDrainCount}
                onChange={handleNumberChange("filthyDrainCount")}
              />{" "}
              <span className="svc-note">
                leave 0 = all {state.standardDrainCount || 0} drains filthy
              </span>
            </div>
          </div>
        )}

        {/* Location / trip */}
        <div className="svc-row">
          <div className="svc-label">
            <span>Location / Trip Band</span>
          </div>
          <div className="svc-field">
            <select
              className="svc-in"
              value={state.location}
              onChange={handleLocationChange}
            >
              <option value="standard">Standard</option>
              <option value="beltway">Inside Beltway</option>
            </select>
          </div>
        </div>

        {/* Extras */}
        <div className="svc-row">
          <div className="svc-label">
            <span>Extras</span>
          </div>
          <div className="svc-field">
            <div className="svc-inline">
              {/* Plumbing */}
              <label>
                <input
                  type="checkbox"
                  checked={state.needsPlumbing}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    updateField("needsPlumbing", checked);
                    if (!checked) {
                      updateField("plumbingDrainCount", 0);
                    }
                  }}
                />{" "}
                Plumbing work (+$10 / drain) – Drains:{" "}
                {state.needsPlumbing && (
                  <input
                    type="number"
                    min={0}
                    className="svc-in sm"
                    style={{ width: 70 }}
                    value={state.plumbingDrainCount}
                    onChange={handleNumberChange("plumbingDrainCount")}
                  />
                )}
              </label>
            </div>
          </div>
        </div>

        {/* Alt pricing options (two checkboxes) */}
        <div className="svc-row">
          <div className="svc-label" />
          <div className="svc-field">
            <div className="svc-inline">
              {/* Small-job alternative */}
              <label>
                <input
                  type="checkbox"
                  disabled={!canUseSmallAlt}
                  checked={state.useSmallAltPricingWeekly && canUseSmallAlt}
                  onChange={(e) => {
                    const checked = e.target.checked && canUseSmallAlt;
                    updateField("useSmallAltPricingWeekly", checked);
                    if (checked && state.useBigAccountTenWeekly) {
                      updateField("useBigAccountTenWeekly", false);
                    }
                  }}
                />{" "}
                Small-job alt:{" "}
                <span className="svc-note">
                  weekly &lt; 10 drains → $20 + $4/drain
                </span>
              </label>
            </div>
            <div className="svc-inline">
              {/* Big-account alternative */}
              <label>
                <input
                  type="checkbox"
                  disabled={!canUseBigAlt}
                  checked={state.useBigAccountTenWeekly && canUseBigAlt}
                  onChange={(e) => {
                    const checked = e.target.checked && canUseBigAlt;
                    updateField("useBigAccountTenWeekly", checked);
                    if (checked && state.useSmallAltPricingWeekly) {
                      updateField("useSmallAltPricingWeekly", false);
                    }
                  }}
                />{" "}
                Big account:{" "}
                <span className="svc-note">
                  weekly 10+ drains → $10/week per drain, install waived
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* All-inclusive */}
        <div className="svc-row">
          <div className="svc-label" />
          <div className="svc-field">
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

        {/* Optional grease trap install */}
        <div className="svc-row">
          <div className="svc-label" />
          <div className="svc-field">
            <label>
              <input
                type="checkbox"
                checked={state.chargeGreaseTrapInstall}
                onChange={(e) =>
                  updateField(
                    "chargeGreaseTrapInstall",
                    e.target.checked
                  )
                }
              />{" "}
              Apply Grease Trap Install (min $300 if possible)
            </label>
          </div>
        </div>

        {/* CALC BREAKDOWN: MAIN INPUT AREA */}
        <div className="svc-summary">
          {/* Standard drains */}
          <div className="svc-row">
            <div className="svc-label">
              <span>Standard Drains</span>
            </div>
            <div className="svc-field">
              <div className="svc-inline">
                {/* QTY = REAL INPUT */}
                <input
                  type="number"
                  min={0}
                  className="svc-in sm"
                  style={{ width: 60 }}
                  value={state.standardDrainCount}
                  onChange={handleNumberChange("standardDrainCount")}
                />
                <span>@</span>
                {/* RATE = AUTO (read-only) */}
                <input
                  readOnly
                  className="svc-in sm"
                  style={{ width: 80 }}
                  value={formatAmount(stdRate)}
                />
                <span>=</span>
                {/* TOTAL = AUTO (read-only) */}
                <input
                  readOnly
                  className="svc-in sm"
                  style={{ width: 90 }}
                  value={formatAmount(stdTotal)}
                />
              </div>
            </div>
          </div>

          {/* Grease traps */}
          <div className="svc-row">
            <div className="svc-label">
              <span>Grease Traps</span>
            </div>
            <div className="svc-field">
              <div className="svc-inline">
                {/* QTY */}
                <input
                  type="number"
                  min={0}
                  className="svc-in sm"
                  style={{ width: 60 }}
                  value={state.greaseTrapCount}
                  onChange={handleNumberChange("greaseTrapCount")}
                />
                <span>@</span>
                {/* RATE */}
                <input
                  readOnly
                  className="svc-in sm"
                  style={{ width: 80 }}
                  value={formatAmount(greaseRate)}
                />
                <span>=</span>
                {/* TOTAL */}
                <input
                  readOnly
                  className="svc-in sm"
                  style={{ width: 90 }}
                  value={formatAmount(greaseTotal)}
                />
              </div>
            </div>
          </div>

          {/* Green drains */}
          <div className="svc-row">
            <div className="svc-label">
              <span>Green Drains</span>
            </div>
            <div className="svc-field">
              <div className="svc-inline">
                {/* QTY */}
                <input
                  type="number"
                  min={0}
                  className="svc-in sm"
                  style={{ width: 60 }}
                  value={state.greenDrainCount}
                  onChange={handleNumberChange("greenDrainCount")}
                />
                <span>@</span>
                {/* RATE */}
                <input
                  readOnly
                  className="svc-in sm"
                  style={{ width: 80 }}
                  value={formatAmount(greenRate)}
                />
                <span>=</span>
                {/* TOTAL */}
                <input
                  readOnly
                  className="svc-in sm"
                  style={{ width: 90 }}
                  value={formatAmount(greenTotal)}
                />
              </div>
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
                value={formatAmount(quote.weeklyService)}
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
                className="svc-in sm"
                type="number"
                value={tripInputValue}
                onChange={handleTripChange}
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
                value={formatAmount(quote.weeklyTotal)}
              />
            </div>
          </div>

          <div className="svc-row">
            <div className="svc-label">
              <span>Monthly Recurring (incl. install)</span>
            </div>
            <div className="svc-field svc-dollar">
              <span>$</span>
              <input
                readOnly
                className="svc-in sm"
                value={formatAmount(quote.monthlyRecurring)}
              />
            </div>
          </div>

          <div className="svc-row">
            <div className="svc-label">
              <span>Annual Recurring (incl. install)</span>
            </div>
            <div className="svc-field svc-dollar">
              <span>$</span>
              <input
                readOnly
                className="svc-in sm"
                value={formatAmount(quote.annualRecurring)}
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
                value={formatAmount(quote.installation)}
              />
            </div>
          </div>

          <div className="svc-row" style={{ marginTop: 6 }}>
            <div className="svc-label" />
            {/* <div className="svc-field">
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
    </div>
  );
};
