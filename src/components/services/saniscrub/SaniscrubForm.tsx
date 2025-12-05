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
> = ({ initialData, onQuoteChange, onRemove }) => {
  const { form, onChange, quote, calc } = useSaniscrubCalc(initialData);
  const servicesContext = useServicesContextOptional();

  // Custom fields state - initialize with initialData if available
  const [customFields, setCustomFields] = useState<CustomField[]>(
    initialData?.customFields || []
  );
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  // Check if SaniClean All-Inclusive is active
  const isSanicleanAllInclusive =
    servicesContext?.isSanicleanAllInclusive ?? false;

  // Push quote up whenever it changes
  React.useEffect(() => {
    if (onQuoteChange) onQuoteChange(quote);
  }, [onQuoteChange, quote]);

  // Save form data to context for form submission
  const prevDataRef = React.useRef<string>("");

  // Headline per-fixture rate for the UI row
  const displayFixtureRate = (() => {
    if (form.frequency === "monthly" || form.frequency === "twicePerMonth") {
      return form.fixtureRateMonthly; // ✅ Uses form value
    }
    if (form.frequency === "bimonthly") {
      return form.fixtureRateBimonthly; // ✅ Uses form value
    }
    return form.fixtureRateQuarterly; // ✅ Uses form value
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

  React.useEffect(() => {
    if (servicesContext) {
      const isActive = form.fixtureCount > 0 || form.nonBathroomSqFt > 0;

      const data = isActive ? {
        serviceId: "saniscrub",
        displayName: "SaniScrub",
        isActive: true,

        frequency: {
          label: "Frequency",
          type: "text" as const,
          value: saniscrubFrequencyLabels[form.frequency] || form.frequency,
        },

        location: {
          label: "Location",
          type: "text" as const,
          value: form.location === "insideBeltway" ? "Inside Beltway" : "Outside Beltway",
        },

        ...(form.fixtureCount > 0 ? {
          restroomFixtures: {
            label: "Restroom Fixtures",
            type: "calc" as const,
            qty: form.fixtureCount,
            rate: displayFixtureRate,
            total: fixtureLineDisplayAmount,
          },
        } : {}),

        ...(form.nonBathroomSqFt > 0 ? {
          nonBathroomArea: {
            label: "Non-Bathroom Area",
            type: "calc" as const,
            qty: form.nonBathroomSqFt,
            rate: form.nonBathroomRatePerSqFt,
            total: calc.nonBathroomMonthly,
            unit: "sq ft",
          },
        } : {}),

        totals: {
          monthly: {
            label: "Monthly Recurring",
            type: "dollar" as const,
            amount: calc.monthlyBase,
          },
          firstMonth: {
            label: "First Month",
            type: "dollar" as const,
            amount: calc.firstMonthTotal,
          },
          contract: {
            label: "Contract Total",
            type: "dollar" as const,
            months: form.contractMonths,
            amount: calc.contractTotal,
          },
        },

        notes: form.notes || "",
        customFields: customFields,
      } : null;

      const dataStr = JSON.stringify(data);

      if (dataStr !== prevDataRef.current) {
        prevDataRef.current = dataStr;
        servicesContext.updateService("saniscrub", data);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, calc, customFields, displayFixtureRate, fixtureLineDisplayAmount]);

  //Get the corresponding rate field name for onChange
  const fixtureRateFieldName = (() => {
    if (form.frequency === "monthly" || form.frequency === "twicePerMonth") {
      return "fixtureRateMonthly";
    }
    if (form.frequency === "bimonthly") {
      return "fixtureRateBimonthly";
    }
    return "fixtureRateQuarterly";
  })();

  return (
    <div className="svc-card">
      <div className="svc-h-row">
        <div className="svc-h">SANISCRUB</div>
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

      {/* Restroom fixtures with editable rate */}
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
            step="0.01"
            name={fixtureRateFieldName}
            value={displayFixtureRate.toFixed(2)}
            onChange={onChange}
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

      {/* Minimum reminder row with editable minimums */}
      <div className="svc-row svc-row-note">
        <label></label>
        <div className="svc-row-right">
          <span className="svc-micro-note">
            Minimums (fixtures): Monthly = $
            <input
              className="svc-in svc-in-small"
              type="number"
              step="0.01"
              name="minimumMonthly"
              value={form.minimumMonthly.toFixed(2)}
              onChange={onChange}
              style={{ width: "60px", display: "inline" }}
            />
            {" · "}
            Bi-Monthly/Quarterly = $
            <input
              className="svc-in svc-in-small"
              type="number"
              step="0.01"
              name="minimumBimonthly"
              value={form.minimumBimonthly.toFixed(2)}
              onChange={onChange}
              style={{ width: "60px", display: "inline" }}
            />
            . 2× / Month with SaniClean is priced as 2× Monthly − $
            <input
              className="svc-in svc-in-small"
              type="number"
              step="0.01"
              name="twoTimesPerMonthDiscount"
              value={form.twoTimesPerMonthDiscount.toFixed(2)}
              onChange={onChange}
              style={{ width: "50px", display: "inline" }}
            />
            .
          </span>
        </div>
      </div>

      {/* Non-bathroom SaniScrub area with editable rates */}
      <div className="svc-row">
        <label>Non-Bathroom Area</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="nonBathroomSqFt"
            value={form.nonBathroomSqFt}
            onChange={onChange}
          />
          <span className="svc-small">sq ft</span>
          <span>@</span>
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="number"
              step="0.01"
              name="nonBathroomAdditionalUnitRate"
              value={form.nonBathroomAdditionalUnitRate.toFixed(2)}
              onChange={onChange}
              title="Rate per 500 sq ft after first 500 (from backend)"
            />
          </div>
          <span className="svc-small">/ 500 sq ft</span>
          <span>=</span>
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in-box"
              type="text"
              readOnly
              value={calc.nonBathroomPerVisit.toFixed(2)}
            />
          </div>
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
        <label>Location</label>
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
            <span>Parking (+$0)</span>
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

      {/* Install (3× dirty / 1× clean) with editable multipliers */}
      <div className="svc-row svc-row-install">
        <label>Install (First Visit Only)</label>
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
            <span>Dirty (</span>
            <input
              className="svc-in svc-in-small"
              type="number"
              step="0.01"
              name="installMultiplierDirty"
              value={form.installMultiplierDirty.toFixed(2)}
              onChange={onChange}
              style={{ width: "50px", display: "inline" }}
            />
            <span>×)</span>
          </label>
          <span className="svc-small">or Clean (</span>
          <input
            className="svc-in svc-in-small"
            type="number"
            step="0.01"
            name="installMultiplierClean"
            value={form.installMultiplierClean.toFixed(2)}
            onChange={onChange}
            style={{ width: "50px", display: "inline" }}
          />
          <span className="svc-small">×)</span>
        </div>
      </div>

      {/* Installation Total - Editable */}
      {form.includeInstall && (
        <div className="svc-row svc-row-charge">
          <label>Installation Total</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                type="number"
                step="0.01"
                name="customInstallationFee"
                value={
                  form.customInstallationFee !== undefined
                    ? form.customInstallationFee.toFixed(2)
                    : calc.installOneTime.toFixed(2)
                }
                onChange={onChange}
              />
            </div>
            <span className="svc-small"> one-time</span>
          </div>
        </div>
      )}

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
        <label>Monthly Recurring</label>
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
        <label>Per-Visit Total</label>
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
