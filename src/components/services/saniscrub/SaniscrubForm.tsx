import React, { useRef, useState, type ChangeEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSync, faSpinner } from "@fortawesome/free-solid-svg-icons";
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

// Helper function to format numbers without unnecessary decimals
const formatNumber = (num: number): string => {
  return num % 1 === 0 ? num.toString() : num.toFixed(2);
};
export const SaniscrubForm: React.FC<
  ServiceInitialData<SaniscrubFormState>
> = ({ initialData, onQuoteChange, onRemove }) => {
  const { form, setForm, onChange, quote, calc, refreshConfig, isLoadingConfig } = useSaniscrubCalc(initialData);
  const servicesContext = useServicesContextOptional();

  // Custom fields state - initialize with initialData if available
  const [customFields, setCustomFields] = useState<CustomField[]>(
    initialData?.customFields || []
  );
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  // ✅ LOCAL STATE: Store raw string values during editing to allow free decimal editing
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});

  // ✅ Helper to get display value (local state while editing, or calculated value)
  const getDisplayValue = (fieldName: string, calculatedValue: number | undefined): string => {
    // If currently editing, show the raw input
    if (editingValues[fieldName] !== undefined) {
      return editingValues[fieldName];
    }
    // Otherwise show the calculated/override value
    return calculatedValue !== undefined ? String(calculatedValue) : '';
  };

  // ✅ Handler for starting to edit a field
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Store current value in editing state
    setEditingValues(prev => ({ ...prev, [name]: value }));
  };

  // ✅ Handler for typing in a field (updates both local state AND form state)
  const handleLocalChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Update local state for display (allows free editing)
    setEditingValues(prev => ({ ...prev, [name]: value }));

    // Also parse and update form state immediately (triggers calculations)
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      onChange({ target: { name, value: String(numValue) } } as any);
    } else if (value === '') {
      // If field is cleared, update form to clear the override
      onChange({ target: { name, value: '' } } as any);
    }
  };

  // ✅ Handler for finishing editing (blur) - parse and update form only
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Clear editing state for this field
    setEditingValues(prev => {
      const newState = { ...prev };
      delete newState[name];
      return newState;
    });

    // Parse the value
    const numValue = parseFloat(value);

    // If empty or invalid, clear the override
    if (value === '' || isNaN(numValue)) {
      onChange({ target: { name, value: '' } } as any);
      return;
    }

    // ✅ Update form state with parsed numeric value
    // DO NOT auto-clear overrides - they persist until refresh button is clicked
    onChange({ target: { name, value: String(numValue) } } as any);
  };

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
    // ✅ FIXED: Use backend rates from form state instead of hardcoded values
    if (form.frequency === "monthly" || form.frequency === "twicePerMonth") {
      return form.fixtureRateMonthly; // Use backend monthly rate
    }
    if (form.frequency === "bimonthly") {
      return form.fixtureRateBimonthly; // Use backend bimonthly rate
    }
    return form.fixtureRateQuarterly; // Use backend quarterly rate (for quarterly, biannual, annual)
  })();

  // For the "= ___" box in the Restroom Fixtures row:
  // Show the BASE amount with minimum applied (not frequency-adjusted)
  const fixtureLineDisplayAmount = (() => {
    if (form.fixtureCount <= 0) return 0;

    // ✅ FIXED: Use base amount with minimum applied (before frequency adjustments)
    return calc.fixtureBaseAmount || 0;
  })();

  // For the Non-Bathroom Area "= ___" box:
  // Show the FINAL amount that gets used in calculations (after minimum applied)
  const nonBathroomLineDisplayAmount = (() => {
    if (form.nonBathroomSqFt <= 0) return 0;

    // Show the actual final amount (either raw calculation or minimum, whichever is higher)
    return calc.nonBathroomPerVisit;
  })();

  React.useEffect(() => {
    if (servicesContext) {
      const isActive = form.fixtureCount > 0 || form.nonBathroomSqFt > 0;

      const data = isActive ? {
        serviceId: "saniscrub",
        displayName: "SaniScrub",
        isActive: true,

        frequency: {
          isDisplay: true,
          label: "Frequency",
          type: "text" as const,
          value: saniscrubFrequencyLabels[form.frequency] || form.frequency,
        },

        location: {
          isDisplay: true,
          label: "Location",
          type: "text" as const,
          value: form.location === "insideBeltway" ? "Inside Beltway" : "Outside Beltway",
        },

        ...(form.fixtureCount > 0 ? {
          restroomFixtures: {
            isDisplay: true,
            label: "Restroom Fixtures",
            type: "calc" as const,
            qty: form.fixtureCount,
            rate: displayFixtureRate,
            total: fixtureLineDisplayAmount,
          },
        } : {}),

        ...(form.nonBathroomSqFt > 0 ? {
          nonBathroomArea: {
            isDisplay: true,
            label: "Non-Bathroom Area",
            type: "calc" as const,
            qty: form.nonBathroomSqFt,
            rate: form.useExactNonBathroomSqft
              ? `${form.nonBathroomFirstUnitRate}/${calc.nonBathroomUnitSqFt}+${form.nonBathroomAdditionalUnitRate}`
              : (form.nonBathroomAdditionalUnitRate / calc.nonBathroomUnitSqFt).toFixed(2),
            total: nonBathroomLineDisplayAmount,
            unit: "sq ft",
          },
        } : {}),

        totals: {
          perVisit: {
            isDisplay: true,
            label: "Per Visit Total",
            type: "dollar" as const,
            amount: calc.perVisitEffective,
          },
          monthly: {
            isDisplay: form.frequency !== "oneTime",
            label: form.frequency === "oneTime" ? "Total Price" :
                   calc.isVisitBasedFrequency ? "First Visit Total" : "First Month Total",
            type: "dollar" as const,
            amount: calc.firstMonthTotal,
          },
          ...(form.frequency !== "oneTime" && !calc.isVisitBasedFrequency ? {
            recurring: {
              isDisplay: true,
              label: "Monthly Recurring",
              type: "dollar" as const,
              amount: calc.monthlyTotal,
            }
          } : {}),
          contract: {
            isDisplay: form.frequency !== "oneTime",
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
      {/* Header */}
      <div className="svc-h-row">
        <div className="svc-h">SANISCRUB</div>
        <div className="svc-h-actions">
          <button
            type="button"
            className="svc-mini"
            onClick={refreshConfig}
            disabled={isLoadingConfig}
            title="Refresh config from database"
          >
            <FontAwesomeIcon
              icon={isLoadingConfig ? faSpinner : faSync}
              spin={isLoadingConfig}
            />
          </button>
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
            className="svc-in field-qty"
            type="number"
            min="0"
            name="fixtureCount"
            value={form.fixtureCount || ""}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in field-qty"
            type="number"
        min="0"
          min="0"
            min="0"
            step="0.01"
            name={fixtureRateFieldName}
            value={displayFixtureRate.toFixed(2)}
            onChange={onChange}
          />
          <span>=</span>
          <input
            className="svc-in-box field-qty"
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
      {/* <div className="svc-row svc-row-note">
        <label></label>
        <div className="svc-row-right">
          <span className="svc-micro-note">
            Minimum per Monthly = $
            <input
              className="svc-in svc-in-small"
              type="number"
        min="0"
          min="0"
            min="0"
              step="0.01"
              name="minimumMonthly"
              value={form.minimumMonthly.toFixed(2)}
              onChange={onChange}
              className="field-qty" style={{ display: "inline" }}
            />
            {" · "}
            Bi-Monthly/Quarterly = $
            <input
              className="svc-in svc-in-small"
              type="number"
        min="0"
          min="0"
            min="0"
              step="0.01"
              name="minimumBimonthly"
              value={form.minimumBimonthly.toFixed(2)}
              onChange={onChange}
              className="field-qty" style={{ display: "inline" }}
            />
            . 2× / Month with SaniClean is priced as 2× Monthly − $
            <input
              className="svc-in percentage-field"
              type="number"
        min="0"
          min="0"
            min="0"
              step="0.01"
              name="twoTimesPerMonthDiscount"
              value={form.twoTimesPerMonthDiscount.toFixed(2)}
              onChange={onChange}
              style={{ display: "inline" }}
            />
            .
          </span>
        </div>
      </div> */}

      {/* Non-bathroom SaniScrub pricing configuration */}
      <div className="svc-row">
        <label>First 500 sq ft Rate</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in field-qty"
              type="number"
              min="0"
              step={0.01}
              name="nonBathroomFirstUnitRate"
              value={form.nonBathroomFirstUnitRate || ""}
              onChange={onChange}
              title="Rate for first 500 sq ft (from backend, editable)"
            />
          </div>
          <span className="svc-small">/ 500 sq ft (${((form.nonBathroomFirstUnitRate || 250) / 500).toFixed(2)}/sq ft)</span>
        </div>
      </div>

      <div className="svc-row">
        <label>Additional Rate</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in field-qty"
              type="number"
              min="0"
              step={0.01}
              name="nonBathroomAdditionalUnitRate"
              value={form.nonBathroomAdditionalUnitRate || ""}
              onChange={onChange}
              title="Rate per additional 500 sq ft block (from backend, editable)"
            />
          </div>
          <span className="svc-small">/ 500 sq ft (${((form.nonBathroomAdditionalUnitRate || 125) / 500).toFixed(2)}/sq ft)</span>
        </div>
      </div>

      {/* Non-bathroom SaniScrub area calculation */}
      <div className="svc-row">
        <label>Non-Bathroom Area</label>
        <div className="svc-row-right">
          <input
            className="svc-in field-qty"
            type="number"
            min="0"
            name="nonBathroomSqFt"
            value={form.nonBathroomSqFt || ""}
            onChange={onChange}
          />
          <span className="svc-small">sq ft</span>
          <span>@</span>
          <span className="svc-small">calculated rate</span>
          <span>=</span>
          <div className="svc-dollar field-qty">
            <span>$</span>
            <input
              className="svc-in-box"
              type="text"
              readOnly
              value={nonBathroomLineDisplayAmount.toFixed(2)}
              title="Calculated non-bathroom area total per visit"
            />
          </div>
        </div>
      </div>

      {/* Exact sq ft calculation checkbox for non-bathroom */}
      <div className="svc-row">
        <label>Calculation Method</label>
        <div className="svc-row-right">
          <label className="svc-inline">
            <input
              type="checkbox"
              name="useExactNonBathroomSqft"
              checked={form.useExactNonBathroomSqft}
              onChange={onChange}
            />
            <span>Exact SqFt Calculation</span>
          </label>
          <span className="svc-small">
            {form.useExactNonBathroomSqft
              ? `(Exact: $${form.nonBathroomFirstUnitRate} + extra sq ft × $${((form.nonBathroomAdditionalUnitRate || 125) / 500).toFixed(2)}/sq ft)`
              : `(Block: $${form.nonBathroomFirstUnitRate} + blocks × $${form.nonBathroomAdditionalUnitRate})`}
          </span>
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
              className="svc-in multiplier-field"
              type="number"
        min="0"
          min="0"
            min="0"
              step="0.1"
              name="installMultiplierDirty"
              value={form.installMultiplierDirty % 1 === 0 ? form.installMultiplierDirty.toString() : form.installMultiplierDirty.toFixed(1)}
              onChange={onChange}
              style={{ display: "inline" }}
            />
            <span>×)</span>
          </label>
          <span className="svc-small">or Clean (</span>
          <input
            className="svc-in multiplier-field"
            type="number"
        min="0"
          min="0"
            min="0"
            step="0.1"
            name="installMultiplierClean"
            value={form.installMultiplierClean % 1 === 0 ? form.installMultiplierClean.toString() : form.installMultiplierClean.toFixed(1)}
            onChange={onChange}
            style={{ display: "inline" }}
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
        min="0"
          min="0"
            min="0"
                step="0.01"
                name="customInstallationFee"
                value={getDisplayValue(
                  'customInstallationFee',
                  form.customInstallationFee !== undefined
                    ? form.customInstallationFee
                    : calc.installOneTime
                )}
                onChange={handleLocalChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>
            <span className="svc-small"> one-time</span>
          </div>
        </div>
      )}

      {/* First month/visit total = install-only first visit + (monthlyVisits − 1) × normal service */}
      <div className="svc-row svc-row-charge">
        <label>{calc.isVisitBasedFrequency ? "First Visit Total" : "First Month Total"}</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              name="customFirstMonthPrice"
              type="number"
        min="0"
          min="0"
            min="0"
              step="0.01"
              value={getDisplayValue(
                'customFirstMonthPrice',
                form.customFirstMonthPrice !== undefined
                  ? form.customFirstMonthPrice
                  : calc.firstMonthTotal
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{ backgroundColor: form.customFirstMonthPrice !== undefined ? '#fffacd' : 'white' }}
              title="Override first month calculation (clear to use auto-calculated value)"
            />
          </div>
        </div>
      </div>

      {/* Per Visit Price Override – Show for 2×/month to annually */}
      {(form.frequency === "twicePerMonth" || form.frequency === "monthly" ||
        form.frequency === "bimonthly" || form.frequency === "quarterly" ||
        form.frequency === "biannual" || form.frequency === "annual") && (
        <div className="svc-row svc-row-charge">
          <label>Per Visit Price</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                name="customPerVisitPrice"
                type="number"
        min="0"
          min="0"
            min="0"
                step="0.01"
                value={getDisplayValue(
                  'customPerVisitPrice',
                  form.customPerVisitPrice !== undefined
                    ? form.customPerVisitPrice
                    : calc.perVisitEffective
                )}
                onChange={handleLocalChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={{ backgroundColor: form.customPerVisitPrice !== undefined ? '#fffacd' : 'white' }}
                title="Override per visit calculation (clear to use auto-calculated value)"
              />
            </div>
          </div>
        </div>
      )}

      {/* Monthly Recurring – Show only for weekly and biweekly */}
      {(form.frequency === "weekly" || form.frequency === "biweekly") && (
        <div className="svc-row svc-row-charge">
          <label>Monthly Recurring</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                name="customMonthlyRecurring"
                type="number"
        min="0"
          min="0"
            min="0"
                step="0.01"
                value={form.customMonthlyRecurring !== undefined
                  ? formatNumber(form.customMonthlyRecurring)
                  : formatNumber(calc.monthlyTotal)}
                onChange={onChange}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    setForm(prev => ({ ...prev, customMonthlyRecurring: undefined }));
                  }
                }}
                style={{ backgroundColor: form.customMonthlyRecurring !== undefined ? '#fffacd' : 'white' }}
                title="Override monthly recurring calculation (clear to use auto-calculated value)"
              />
            </div>
          </div>
        </div>
      )}

      {/* Normal recurring month (after first) or per visit for bi-monthly/quarterly */}
      {/* <div className="svc-row svc-row-charge">
        <label>{calc.isVisitBasedFrequency ? "Per Visit" : "Monthly Recurring"}</label>
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
      </div> */}

      {/* Contract total – dropdown with frequency-specific months */}
      {form.frequency !== "oneTime" && (
        <div className="svc-row svc-row-charge">
          <label>Contract Total</label>
          <div className="svc-row-right">
            <select
              className="svc-in"
              name="contractMonths"
              value={form.contractMonths}
              onChange={onChange}
            >
              {(() => {
                // ✅ FIXED: Generate frequency-specific contract month options
                const options = [];

                if (calc.frequency === "bimonthly") {
                  // Bi-monthly: Even numbers only (2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36)
                  for (let months = 2; months <= 36; months += 2) {
                    options.push(months);
                  }
                } else if (calc.frequency === "quarterly") {
                  // Quarterly: Quarterly values (3,6,9,12,15,18,21,24,27,30,33,36)
                  for (let months = 3; months <= 36; months += 3) {
                    options.push(months);
                  }
                } else if (calc.frequency === "biannual") {
                  // Bi-annual: Multiples of 6 (6,12,18,24,30,36)
                  for (let months = 6; months <= 36; months += 6) {
                    options.push(months);
                  }
                } else if (calc.frequency === "annual") {
                  // Annual: Multiples of 12 (12,24,36)
                  for (let months = 12; months <= 36; months += 12) {
                    options.push(months);
                  }
                } else {
                  // Monthly, weekly, biweekly, 2X/monthly: All months (2,3,4,5...36)
                  for (let months = 2; months <= 36; months++) {
                    options.push(months);
                  }
                }

                return options.map((months) => (
                  <option key={months} value={months}>
                    {months} mo
                  </option>
                ));
              })()}
            </select>
            <div className="svc-dollar">
              <span style={{ fontSize: '18px', fontWeight: 'bold' }}>$</span>
              <input
                type="number"
        min="0"
          min="0"
            min="0"
                step="0.01"
                name="customContractTotal"
                className="svc-in"
                value={getDisplayValue(
                  'customContractTotal',
                  form.customContractTotal !== undefined
                    ? form.customContractTotal
                    : calc.annualTotal
                )}
                onChange={handleLocalChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={{
                  borderBottom: '2px solid #ff0000',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  backgroundColor: form.customContractTotal !== undefined ? '#fffacd' : 'transparent',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  padding: '4px',
                  width: '100px'
                }}
                title="Contract total - editable"
              />
            </div>
          </div>
        </div>
      )}

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
