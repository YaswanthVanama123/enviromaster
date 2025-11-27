// src/features/services/foamingDrain/FoamingDrainForm.tsx
import React, { useEffect, useRef, useState } from "react";
import { useFoamingDrainCalc } from "./useFoamingDrainCalc";
import type {
  FoamingDrainFormState,
  FoamingDrainFrequency,
  FoamingDrainLocation,
  FoamingDrainCondition,
} from "./foamingDrainTypes";
import { FOAMING_DRAIN_CONFIG as cfg } from "./foamingDrainConfig";
import { useServicesContextOptional } from "../ServicesContext";
import { CustomFieldManager, type CustomField } from "../CustomFieldManager";

interface FoamingDrainFormProps {
  initialData?: Partial<FoamingDrainFormState>;
  onRemove?: () => void;
}

// Hide 0.00 when nothing entered
const formatAmount = (n: number): string => (n > 0 ? n.toFixed(2) : "");

export const FoamingDrainForm: React.FC<FoamingDrainFormProps> = ({
  initialData,
  onRemove,
}) => {
  const { state, quote, updateField, reset } =
    useFoamingDrainCalc(initialData);
  const servicesContext = useServicesContextOptional();

  // Custom fields state
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  // Save form data to context for form submission
  const prevDataRef = useRef<string>("");

  useEffect(() => {
    if (servicesContext) {
      const isActive = state.standardDrainCount > 0 || state.greaseTrapCount > 0 || state.greenDrainCount > 0;
      const data = isActive ? { ...state, ...quote, isActive, customFields } : null;
      const dataStr = JSON.stringify(data);

      // Only update if data actually changed
      if (dataStr !== prevDataRef.current) {
        prevDataRef.current = dataStr;
        servicesContext.updateService("foamingDrain", data);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, quote, customFields]);

  const breakdown = quote.breakdown;

  // Availability for alt options
  const isWeekly = state.frequency === "weekly";
  const isVolume = state.standardDrainCount >= cfg.volumePricing.minimumDrains; // 10+

  // Small alt only for weekly, <10 drains
  const canUseSmallAlt =
    isWeekly && state.standardDrainCount > 0 && !isVolume;

  // Big account 10$/drain allowed for ANY frequency when 10+ drains
  const canUseBigAlt = isVolume;

  const isInstallLevelUi =
    isVolume && !state.useBigAccountTenWeekly && !state.isAllInclusive;

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

        updateField("standardDrainCount", newCount);

        // If small-alt selection no longer valid, clear it
        if (!newCanSmallAlt && state.useSmallAltPricingWeekly) {
          updateField("useSmallAltPricingWeekly", false);
        }

        // Big account is allowed for any frequency as long as 10+ drains,
        // so no need to auto-clear it here.

        return;
      }

      updateField(field, safe);
    };

  const handleFrequencyChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newFreq = e.target.value as FoamingDrainFrequency;
    updateField("frequency", newFreq);

    // Small-alt only meaningful for weekly; big-account works for any frequency
    if (newFreq !== "weekly") {
      // Leaving weekly: turn off only the small alt
      updateField("useSmallAltPricingWeekly", false);
    } else {
      // If we come back to weekly, revalidate small-alt with current count
      const count = state.standardDrainCount;
      const newIsVolume =
        count >= cfg.volumePricing.minimumDrains;
      const newCanSmallAlt = count > 0 && !newIsVolume;

      if (!newCanSmallAlt && state.useSmallAltPricingWeekly) {
        updateField("useSmallAltPricingWeekly", false);
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

  // Pricing model label
  const pricingLabel = (() => {
    if (breakdown.usedBigAccountAlt) {
      return "Volume – $10/week per drain, install waived (10+ drains)";
    }
    if (breakdown.volumePricingApplied) {
      return "Volume (10+ drains, separate $20/$10 install-drain)";
    }
    if (breakdown.usedSmallAlt) {
      return "Alternative (weekly: $20 + $4/drain)";
    }
    return "Standard ($10/drain)";
  })();

  // --------- Calc-line numbers: qty @ rate = total ---------

  // Standard drains: show only the drains that are billed as "standard"
  // If 12 total drains and 3 are install drains → show 9 here.
  const stdServiceQty = state.isAllInclusive
    ? 0
    : isInstallLevelUi
    ? Math.max(state.standardDrainCount - state.installDrainCount, 0)
    : state.standardDrainCount;

  const stdQty = stdServiceQty;
  const stdTotal = breakdown.weeklyStandardDrains;
  const stdRate = stdQty > 0 ? stdTotal / stdQty : 0;

  const greaseQty = state.greaseTrapCount;
  const greaseTotal = breakdown.weeklyGreaseTraps;
  const greaseRate = greaseQty > 0 ? greaseTotal / greaseQty : 0;

  const greenQty = state.greenDrainCount;
  const greenTotal = breakdown.weeklyGreenDrains;
  const greenRate = greenQty > 0 ? greenTotal / greenQty : 0;

  // NEW: install-program calc line (qty @ rate = total)
  const installQty = isInstallLevelUi ? state.installDrainCount : 0;
  const installTotal = breakdown.weeklyInstallDrains;
  const installRate =
    installQty > 0
      ? installTotal / installQty
      : isInstallLevelUi
      ? state.frequency === "bimonthly"
        ? cfg.volumePricing.bimonthly.ratePerDrain
        : cfg.volumePricing.weekly.ratePerDrain
      : 0;

  const tripInputValue =
    typeof state.tripChargeOverride === "number"
      ? state.tripChargeOverride
      : breakdown.tripCharge;

  return (
    <div className="svc-card">
      <div className="svc-card__inner">
        <div className="svc-h-row">
          <div className="svc-h">FOAMING DRAIN SERVICE</div>
          <button
            type="button"
            className="svc-mini"
            onClick={() => setShowAddDropdown(!showAddDropdown)}
            title="Add custom field"
          >
            +
          </button>
          {onRemove && (
            <button
              type="button"
              className="svc-mini svc-mini--neg"
              onClick={onRemove}
              title="Remove this service"
            >
              −
            </button>
          )}
        </div>

        {/* Custom fields manager - appears at the top */}
        <CustomFieldManager
          fields={customFields}
          onFieldsChange={setCustomFields}
          showAddDropdown={showAddDropdown}
          onToggleAddDropdown={setShowAddDropdown}
        />

        {/* Frequency */}
        {/* <div className="svc-row">
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
        </div> */}

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

        {/* How many filthy install drains (for 3× install) */}
        {state.facilityCondition === "filthy" && isInstallLevelUi && (
          <div className="svc-row">
            <div className="svc-label">
              <span>Filthy Install Drains (3×)</span>
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
                leave 0 = all install drains filthy
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
                {/* QTY = ACTIVE (non-install) DRAINS */}
                {/* QTY = user input for total standard drains */}
                <input
                  type="number"
                  min={0}
                  className="svc-in sm"
                  style={{ width: 60 }}
                  value={stdQty}
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

          {/* Drains for Install (10+) – now a calc line */}
          {isInstallLevelUi && (
            <div>
                    <div className="svc-row">
          <div className="svc-label">
            <span>Install Frequency</span>
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
            <div className="svc-row">
              <div className="svc-label">
                <span>Drains Install(10+)</span>
              </div>
              <div className="svc-field">
                <div className="svc-inline">
                  {/* QTY = INPUT (how many drains go into install program) */}
                  <input
                    type="number"
                    min={0}
                    max={state.standardDrainCount}
                    className="svc-in sm"
                    style={{ width: 60 }}
                    value={state.installDrainCount}
                    onChange={handleNumberChange("installDrainCount")}
                  />
                  <span>@</span>
                  {/* RATE depends on frequency: weekly 20$, bi-monthly 10$ */}
                  <input
                    readOnly
                    className="svc-in sm"
                    style={{ width: 80 }}
                    value={formatAmount(installRate)}
                  />
                  <span>=</span>
                  {/* TOTAL weekly cost for install drains */}
                  <input
                    readOnly
                    className="svc-in sm"
                    style={{ width: 90 }}
                    value={formatAmount(installTotal)}
                  />
                  {/* <span className="svc-note" style={{ marginLeft: 4 }}>
                    of {state.standardDrainCount || 0} standard drains
                  </span> */}
                </div>
              </div>
            </div>
            </div>
          )}

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

          {/* Weekly per visit */}
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

          {/* Trip charge (locked to 0, display only) */}
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
                readOnly
              />
            </div>
          </div>

          {/* Weekly total */}
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

          {/* Contract length dropdown: 2–36 months */}
          <div className="svc-row">
            <div className="svc-label">
              <span>Contract Length (Months)</span>
            </div>
            <div className="svc-field">
              <select
                className="svc-in sm"
                value={state.contractMonths}
                onChange={(e) =>
                  updateField(
                    "contractMonths",
                    Number(e.target.value) as any
                  )
                }
              >
                {Array.from(
                  {
                    length:
                      cfg.contract.maxMonths - cfg.contract.minMonths + 1,
                  },
                  (_, i) => {
                    const m = cfg.contract.minMonths + i;
                    return (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    );
                  }
                )}
              </select>
            </div>
          </div>

          {/* First month total */}
          <div className="svc-row">
            <div className="svc-label">
              <span>First Month Total</span>
            </div>
            <div className="svc-field svc-dollar">
              <span>$</span>
              <input
                readOnly
                className="svc-in sm"
                value={formatAmount(quote.firstMonthPrice)}
              />
            </div>
          </div>

          {/* Normal month (recurring) */}
          <div className="svc-row">
            <div className="svc-label">
              <span>Normal Month (Recurring)</span>
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

          {/* Total for selected months (contract total) */}
          <div className="svc-row">
            <div className="svc-label">
              <span>
                Total Contract ({quote.contractMonths}{" "}
                {quote.contractMonths === 1 ? "month" : "months"})
              </span>
            </div>
            <div className="svc-field svc-dollar">
              <span>$</span>
              <input
                readOnly
                className="svc-in sm"
                // annualRecurring now holds the contract total, NOT annual
                value={formatAmount(quote.annualRecurring)}
              />
            </div>
          </div>

          {/* Installation total */}
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
