import React, { useRef, useState } from "react";
import { useSaniscrubCalc } from "./useSaniscrubCalc";
import type { SaniscrubFormState } from "./saniscrubTypes";
import type { ServiceInitialData } from "../common/serviceTypes";
import {
  saniscrubPricingConfig as cfg,
  saniscrubFrequencyLabels,
} from "./saniscrubConfig";
import { useServicesContextOptional } from "../ServicesContext";
import { CustomFieldManager, type CustomField } from "../CustomFieldManager";

/**
 * SaniScrub form with updated rules:
 *  - Trip charge visible but locked to $0 (not used in any math)
 *  - Monthly uses visitsPerYear/12 (weekly would be 4.33 visits/month)
 *  - No "annual" math; instead a 2–36 month contract dropdown
 *  - First visit = install only
 *  - First month = install-only first visit + (monthlyVisits − 1) × normal service
 *  - Contract total is based on that first month + remaining months
 */
export const SaniscrubForm: React.FC<
  ServiceInitialData<SaniscrubFormState>
> = ({ initialData, onQuoteChange }) => {
  const { form, onChange, quote, calc } = useSaniscrubCalc(initialData);
  const servicesContext = useServicesContextOptional();

  // Custom fields state
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  // Check if SaniClean All-Inclusive is active
  const isSanicleanAllInclusive =
    servicesContext?.isSanicleanAllInclusive ?? false;

  // Push quote up whenever it changes
  React.useEffect(() => {
    if (onQuoteChange) onQuoteChange(quote);
  }, [onQuoteChange, quote]);

  // Save form data to context for form submission
  const prevDataRef = React.useRef<string>("");

  React.useEffect(() => {
    if (servicesContext) {
      const isActive = form.fixtureCount > 0 || form.nonBathroomSqFt > 0;
      const data = isActive ? { ...form, ...calc, isActive } : null;
      const dataStr = JSON.stringify(data);

      if (dataStr !== prevDataRef.current) {
        prevDataRef.current = dataStr;
        servicesContext.updateService("saniscrub", data);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, calc]);

  // Headline per-fixture rate for the UI row
  const displayFixtureRate = (() => {
    if (form.frequency === "monthly" || form.frequency === "twicePerMonth") {
      return cfg.fixtureRates.monthly; // $25
    }
    if (form.frequency === "bimonthly") {
      return cfg.fixtureRates.bimonthly; // $35
    }
    return cfg.fixtureRates.quarterly; // $40
  })();

  // For the "= ___" box in the Restroom Fixtures row:
  // - For 2× / month → always show the FULL monthly fixture charge
  //   (2× normal monthly − $15 when combined with SaniClean).
  // - For other frequencies:
  //   - If we hit a minimum → show 175 or 250.
  //   - Else → show raw fixtures × rate (monthly).
  const fixtureLineDisplayAmount =
    form.fixtureCount > 0
      ? form.frequency === "twicePerMonth"
        ? calc.fixtureMonthly
        : calc.fixtureMinimumApplied > 0
        ? calc.fixtureMinimumApplied
        : calc.fixtureRawForMinimum
      : 0;

  return (
    <div className="svc-card">
      <div className="svc-h-row">
        <div className="svc-h">SANISCRUB</div>
      </div>

      {/* Custom fields manager - appears at the top */}
      <CustomFieldManager
        fields={customFields}
        onFieldsChange={setCustomFields}
      />

      {/* Alert when included in SaniClean All-Inclusive */}
      {isSanicleanAllInclusive && (
        <div
          className="svc-row"
          style={{
            backgroundColor: "#e8f5e9",
            border: "2px solid #4caf50",
            padding: "12px",
            marginBottom: "10px",
            borderRadius: "4px",
          }}
        >
          <div style={{ fontWeight: "bold", color: "#2e7d32", fontSize: "14px" }}>
            ✓ INCLUDED in SaniClean All-Inclusive Package
          </div>
          <div style={{ fontSize: "13px", color: "#555", marginTop: "4px" }}>
            Monthly SaniScrub is already included at no additional charge. This
            form is for reference only.
          </div>
        </div>
      )}

      {/* Combined with SaniClean (required for 2×/month discount) */}
      <div className="svc-row">
        <label>Combined with SaniClean?</label>
        <div className="svc-row-right">
          <label className="svc-inline">
            <input
              type="checkbox"
              name="hasSaniClean"
              checked={form.hasSaniClean}
              onChange={onChange}
            />
            <span>Yes</span>
          </label>
        </div>
      </div>

      {/* Restroom fixtures */}
      <div className="svc-row">
        <label>Restroom Fixtures</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="fixtureCount"
            value={form.fixtureCount}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in"
            type="number"
            readOnly
            value={displayFixtureRate}
          />
          <span>=</span>
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={
              fixtureLineDisplayAmount > 0
                ? `$${fixtureLineDisplayAmount.toFixed(2)}`
                : "$0.00"
            }
          />
        </div>
      </div>

      {/* Minimum reminder row */}
      <div className="svc-row svc-row-note">
        <label></label>
        <div className="svc-row-right">
          <span className="svc-micro-note">
            Minimums (fixtures): Monthly = ${cfg.minimums.monthly} ·
            Bi-Monthly/Quarterly = ${cfg.minimums.bimonthly}. 2× / Month with
            SaniClean is priced as 2× Monthly − $
            {cfg.twoTimesPerMonthDiscountFlat}.
          </span>
        </div>
      </div>

      {/* Non-bathroom SaniScrub area */}
      <div className="svc-row">
        <label>Non-Bathroom Sq Ft</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="nonBathroomSqFt"
            value={form.nonBathroomSqFt}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in"
            type="text"
            readOnly
            value="1st 500 = 250; +125/500"
          />
          <span>=</span>
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={
              calc.nonBathroomPerVisit > 0
                ? `$${calc.nonBathroomPerVisit.toFixed(2)} / visit`
                : "$0.00"
            }
          />
        </div>
      </div>

      {/* Frequency selection */}
      <div className="svc-row">
        <label>Frequency</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="frequency"
            value={form.frequency}
            onChange={onChange}
          >
            {Object.entries(saniscrubFrequencyLabels).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              )
            )}
          </select>
        </div>
      </div>

      {/* Trip & location – still visible for UI, but math is locked to $0 */}
      <div className="svc-row">
        <label>Trip &amp; Location</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="location"
            value={form.location}
            onChange={onChange}
          >
            <option value="insideBeltway">Inside Beltway</option>
            <option value="outsideBeltway">Outside Beltway</option>
          </select>

          <label className="svc-inline">
            <input
              type="checkbox"
              name="needsParking"
              checked={form.needsParking}
              onChange={onChange}
            />
            <span>Parking Needed (+$0)</span>
          </label>
        </div>
      </div>

      {/* Trip charge numeric display – locked to $0 */}
      <div className="svc-row">
        <label>Trip Charge</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="text"
            readOnly
            value="$0.00 / visit"
          />
          <span>·</span>
          <input
            className="svc-in"
            type="text"
            readOnly
            value="$0.00 / month"
          />
        </div>
      </div>

      {/* Install (3× dirty / 1× clean) – one-time job, first visit only */}
      <div className="svc-row svc-row-install">
        <label>Install Quote (First Visit Only)</label>
        <div className="svc-row-right">
          <label className="svc-inline">
            <input
              type="checkbox"
              name="includeInstall"
              checked={form.includeInstall}
              onChange={onChange}
            />
            <span>Install</span>
          </label>
          <label className="svc-inline">
            <input
              type="checkbox"
              name="isDirtyInstall"
              checked={form.isDirtyInstall}
              onChange={onChange}
            />
            <span>Dirty (3×)</span>
          </label>
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={
              calc.installOneTime > 0
                ? `$${calc.installOneTime.toFixed(2)} one-time`
                : "$0 one-time"
            }
          />
        </div>
      </div>

      {/* First month total = install-only first visit + (monthlyVisits − 1) × normal service */}
      <div className="svc-row svc-row-charge">
        <label>First Month Total</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="text"
              readOnly
              value={calc.firstMonthTotal.toFixed(2)}
            />
          </div>
        </div>
      </div>

      {/* Normal recurring month (after first) */}
      <div className="svc-row svc-row-charge">
        <label>Monthly SaniScrub</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="text"
              readOnly
              value={calc.monthlyTotal.toFixed(2)}
            />
          </div>
        </div>
      </div>

      {/* Contract total – dropdown 2–36 months */}
      <div className="svc-row svc-row-charge">
        <label>Contract Total</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="contractMonths"
            value={form.contractMonths}
            onChange={onChange}
          >
            {Array.from({ length: 35 }, (_, i) => i + 2).map((months) => (
              <option key={months} value={months}>
                {months} mo
              </option>
            ))}
          </select>
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="text"
              readOnly
              value={calc.annualTotal.toFixed(2)}
            />
          </div>
        </div>
      </div>

      {/* Per-Visit Effective (no install, no trip) */}
      <div className="svc-row svc-row-charge">
        <label>Per-Visit Effective</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="text"
              readOnly
              value={calc.perVisitEffective.toFixed(2)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
