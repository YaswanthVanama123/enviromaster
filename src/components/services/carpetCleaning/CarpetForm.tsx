import React, { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSync, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { useCarpetCalc } from "./useCarpetCalc";
import type { CarpetFormState, CarpetFrequency } from "./carpetTypes";
import type { ServiceInitialData } from "../common/serviceTypes";
import {
  carpetFrequencyLabels,
  carpetFrequencyList,
  getContractOptions,
} from "./carpetConfig";
import { useServicesContextOptional } from "../ServicesContext";
import { CustomFieldManager, type CustomField } from "../CustomFieldManager";

/**
 * Carpet Cleaning form – same UI style as SaniScrub:
 *  - Block pricing: 250 (first 500 sq ft) + 125 per extra 500
 *  - Per-visit minimum $250
 *  - No trip charge in math (field shows $0.00)
 *  - Installation fee options (1× clean / 3× dirty)
 *  - First month calculation includes installation + normal service
 *  - Contract term: 2–36 months
 */
export const CarpetForm: React.FC<
  ServiceInitialData<CarpetFormState>
> = ({ initialData, onQuoteChange, onRemove }) => {
  // Custom fields state - initialize with initialData if available
  const [customFields, setCustomFields] = useState<CustomField[]>(
    initialData?.customFields || []
  );

  // ✅ UPDATED: Pass customFields to calculation hook
  const { form, setForm, onChange, quote, calc, refreshConfig, isLoadingConfig } = useCarpetCalc(initialData, customFields);
  const servicesContext = useServicesContextOptional();

  const [showAddDropdown, setShowAddDropdown] = useState(false);

  // ✅ LOCAL STATE: Store raw string values during editing to allow free decimal editing
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  // ✅ NEW: Track original values when focusing to detect actual changes
  const [originalValues, setOriginalValues] = useState<Record<string, string>>({});

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
    // Store current value in editing state AND original value for comparison
    setEditingValues(prev => ({ ...prev, [name]: value }));
    setOriginalValues(prev => ({ ...prev, [name]: value }));
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

    // Get the original value when we started editing
    const originalValue = originalValues[name];

    // Clear editing state for this field
    setEditingValues(prev => {
      const newState = { ...prev };
      delete newState[name];
      return newState;
    });

    // Clear original value
    setOriginalValues(prev => {
      const newState = { ...prev };
      delete newState[name];
      return newState;
    });

    // Parse the value
    const numValue = parseFloat(value);

    // ✅ FIXED: Only update if value actually changed
    if (originalValue !== value) {
      // If empty or invalid, clear the override
      if (value === '' || isNaN(numValue)) {
        onChange({ target: { name, value: '' } } as any);
        return;
      }

      // ✅ Update form state with parsed numeric value ONLY if changed
      onChange({ target: { name, value: String(numValue) } } as any);
    }
  };

  // Save form data to context for form submission
  const prevDataRef = useRef<string>("");

  const monthlyRecurringFrequencies: CarpetFrequency[] = [
    "weekly",
    "biweekly",
    "twicePerMonth",
    "monthly",
  ];
  const visitBasedRecurringFrequencies: CarpetFrequency[] = [
    "bimonthly",
    "quarterly",
    "biannual",
    "annual",
  ];

  const resolveCarpetFrequency = (value: string): CarpetFrequency => {
    if (carpetFrequencyList.includes(value as CarpetFrequency)) {
      return value as CarpetFrequency;
    }
    const normalized = value?.trim().toLowerCase() || "";
    const match = carpetFrequencyList.find(
      (freq) => carpetFrequencyLabels[freq].toLowerCase() === normalized
    );
    return match || "monthly";
  };
  const FIELD_ORDER = {
    frequency: 1,
    location: 2,
    service: 3,
    installation: 4,
    perVisit: 5,
    firstMonth: 6,
    recurringVisit: 7,
    recurringMonth: 8,
    contract: 9,
  };

  useEffect(() => {
    if (servicesContext) {
      const resolvedFrequency = resolveCarpetFrequency(form.frequency);
      const isActive = (form.areaSqFt ?? 0) > 0;
      const shouldShowMonthlyRecurring = monthlyRecurringFrequencies.includes(resolvedFrequency);
      const shouldShowVisitRecurring = visitBasedRecurringFrequencies.includes(resolvedFrequency);
      const displayFrequencyLabel =
        carpetFrequencyLabels[resolvedFrequency] || resolvedFrequency;
      const shouldShowRecurringGap =
        resolvedFrequency !== "oneTime" &&
        (shouldShowMonthlyRecurring || shouldShowVisitRecurring);

      const totalLabel =
        resolvedFrequency === "oneTime"
          ? "Total Price"
          : shouldShowVisitRecurring
            ? "First Visit Total"
            : "First Month Total";
      const totalAmount =
        resolvedFrequency === "oneTime"
          ? calc.perVisitCharge
          : calc.firstMonthTotal;

      const totals: any = {
        perVisit: {
          isDisplay: true,
          orderNo: FIELD_ORDER.perVisit,
          label: "Per Visit Total",
          type: "dollar" as const,
          amount: calc.perVisitCharge,
        },
        firstMonth: {
          isDisplay: true,
          orderNo: FIELD_ORDER.firstMonth,
          label: totalLabel,
          type: "dollar" as const,
          amount: totalAmount,
        },
      };

      if (shouldShowMonthlyRecurring) {
        totals.monthlyRecurring = {
          isDisplay: true,
          orderNo: FIELD_ORDER.recurringMonth,
          label: "Recurring Month Total",
          type: "dollar" as const,
          amount: calc.monthlyTotal,
          gap: "normal",
        };
        }

        if (shouldShowVisitRecurring) {
          totals.recurringVisit = {
            isDisplay: true,
            orderNo: FIELD_ORDER.recurringVisit,
            label: "Recurring Visit Total",
            type: "dollar" as const,
            amount: calc.perVisitCharge,
            gap: "normal",
          };
        }

        if (resolvedFrequency !== "oneTime") {
        totals.contract = {
          isDisplay: true,
          orderNo: FIELD_ORDER.contract,
          label: "Contract Total",
          type: "dollar" as const,
          months: form.contractMonths,
          amount: calc.contractTotal,
        };
      }

      const data = isActive ? {
        serviceId: "carpetclean",
        displayName: "Carpet Cleaning",
        isActive: true,

        // ✅ FIXED: Save EFFECTIVE pricing fields (custom override if set, otherwise base value)
        // This ensures edited values are saved to backend, not just backend defaults
        firstUnitRate: form.customFirstUnitRate ?? form.firstUnitRate,
        additionalUnitRate: form.customAdditionalUnitRate ?? form.additionalUnitRate,
        perVisitMinimum: form.customPerVisitMinimum ?? form.perVisitMinimum,
        installMultiplierDirty: form.installMultiplierDirty,
        installMultiplierClean: form.installMultiplierClean,
        unitSqFt: form.unitSqFt,
        useExactSqft: form.useExactSqft,

        // ✅ NEW: Save quantity inputs for proper loading in edit mode
        areaSqFt: form.areaSqFt,
        frequency: form.frequency,
        contractMonths: form.contractMonths,
        includeInstall: form.includeInstall,
        isDirtyInstall: form.isDirtyInstall,
        location: form.location,

        // Red/Green Line pricing data
        perVisitBase: calc.perVisitBase,  // Raw price before minimum
        perVisitCharge: calc.perVisitCharge,  // Final price after minimum

        frequency: {
          isDisplay: true,
          orderNo: FIELD_ORDER.frequency,
          label: "Frequency",
          type: "text" as const,
          value: displayFrequencyLabel,
          frequencyKey: resolvedFrequency,
        },

        location: {
          isDisplay: false,
          orderNo: FIELD_ORDER.location,
          label: "Location",
          type: "text" as const,
          value: form.location === "insideBeltway" ? "Inside Beltway" : "Outside Beltway",
        },

        service: {
          isDisplay: true,
          orderNo: FIELD_ORDER.service,
          label: "Carpet Area",
          type: "calc" as const,
          qty: form.areaSqFt,
          rate: form.customFirstUnitRate ?? form.firstUnitRate,  // ✅ FIXED: Use effective value for PDF
          total: calc.perVisitCharge,
          unit: "sq ft",
        },

        // Installation data
        ...(form.includeInstall ? {
          installation: {
            isDisplay: true,
             orderNo: FIELD_ORDER.installation,

           label: form.isDirtyInstall ? "Installation (Dirty - 3×)" : "Installation (Clean - 1×)",
            type: "calc" as const,
            qty: 1,
            rate: calc.installOneTime,
            total: calc.installOneTime,
            multiplier: form.isDirtyInstall ? form.installMultiplierDirty : form.installMultiplierClean,
            isDirty: form.isDirtyInstall,
          },
        } : {}),

        totals,

        notes: form.notes || "",
        customFields: customFields,
        pdfFieldVisibility: {
          location: false,
          useExactSqft: false,
          includeInstall: false,
          isDirtyInstall: false,
        },
      } : null;

      const dataStr = JSON.stringify(data);

      if (dataStr !== prevDataRef.current) {
        prevDataRef.current = dataStr;
        console.log('🔧 [CarpetForm] Sending data to context with pricing fields:', {
          firstUnitRate: data?.firstUnitRate,
          additionalUnitRate: data?.additionalUnitRate,
          perVisitMinimum: data?.perVisitMinimum,
          fullData: JSON.stringify(data, null, 2)
        });
        servicesContext.updateService("carpetclean", data);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, calc, customFields]);

  React.useEffect(() => {
    if (onQuoteChange) onQuoteChange(quote);
  }, [onQuoteChange, quote]);

  // ✅ OVERRIDE HIERARCHY: Clear downstream overrides ONLY when base quantity inputs change
  // Do NOT clear when rate overrides change - let the calculation hierarchy handle propagation
  useEffect(() => {
    setForm((prev: any) => ({
      ...prev,
      customPerVisitPrice: undefined,
      customInstallationFee: undefined,  // ✅ Clear installation override when base inputs change
      customMonthlyRecurring: undefined,
      customFirstMonthPrice: undefined,
      customContractTotal: undefined,
    }));
  }, [
    // ✅ ONLY base quantity/selection inputs trigger clearing:
    form.areaSqFt,           // Area changed = recalculate everything
    form.useExactSqft,       // Calculation method changed = recalculate
    form.frequency,          // Frequency changed = recalculate monthly/contract
    form.contractMonths,     // Contract term changed = recalculate contract
    form.includeInstall,     // Installation added/removed = recalculate totals
    form.isDirtyInstall,     // Installation type changed = recalculate installation fee
    // ✅ REMOVED: customFirstUnitRate, customAdditionalUnitRate, customPerVisitMinimum
    // These are RATE overrides - changing them should NOT clear downstream overrides
    // Let the calculation hierarchy handle propagation naturally
    setForm,
  ]);

  return (
    <div className="svc-card">
      <div className="svc-h-row">
        <div className="svc-h">CARPET CLEANING</div>
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
              className="svc-mini"
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
            {Object.entries(carpetFrequencyLabels).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              )
            )}
          </select>
        </div>
      </div>

      {/* Pricing Configuration Rates */}
      <div className="svc-row">
        <label>First {form.unitSqFt || 500} sq ft Rate</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in field-qty"
              type="number"
              min="0"
              step="1"
              name="customFirstUnitRate"
              value={getDisplayValue(
                'customFirstUnitRate',
                form.customFirstUnitRate !== undefined
                  ? form.customFirstUnitRate
                  : form.firstUnitRate
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{ backgroundColor: form.customFirstUnitRate !== undefined ? '#fffacd' : 'white' }}
              title={`Rate for first ${form.unitSqFt || 500} sq ft (from backend, editable)`}
            />
          </div>
          <span className="svc-small">/ {form.unitSqFt || 500} sq ft (${(((form.customFirstUnitRate ?? form.firstUnitRate) || 250) / (form.unitSqFt || 500)).toFixed(2)}/sq ft)</span>
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
              step="1"
              name="customAdditionalUnitRate"
              value={getDisplayValue(
                'customAdditionalUnitRate',
                form.customAdditionalUnitRate !== undefined
                  ? form.customAdditionalUnitRate
                  : form.additionalUnitRate
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{ backgroundColor: form.customAdditionalUnitRate !== undefined ? '#fffacd' : 'white' }}
              title={`Rate per additional ${form.unitSqFt || 500} sq ft block (from backend, editable)`}
            />
          </div>
          <span className="svc-small">/ {form.unitSqFt || 500} sq ft (${(((form.customAdditionalUnitRate ?? form.additionalUnitRate) || 125) / (form.unitSqFt || 500)).toFixed(2)}/sq ft)</span>
        </div>
      </div>

      <div className="svc-row">
        <label>Minimum Charge</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in field-qty"
              type="number"
              min="0"
              step="1"
              name="customPerVisitMinimum"
              value={getDisplayValue(
                'customPerVisitMinimum',
                form.customPerVisitMinimum !== undefined
                  ? form.customPerVisitMinimum
                  : form.perVisitMinimum
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{ backgroundColor: form.customPerVisitMinimum !== undefined ? '#fffacd' : 'white' }}
              title="Minimum charge per visit (from backend, editable)"
            />
          </div>
          <span className="svc-small">/ visit</span>
        </div>
      </div>

      {/* Carpet area row – ____ @ calculated rate = ____ */}
      <div className="svc-row">
        <label>Carpet Area</label>
        <div className="svc-row-right">
          <input
            className="svc-in field-qty"
            type="number"
            min="0"
            name="areaSqFt"
            value={form.areaSqFt || ""}
            onChange={onChange}
          />
          <span className="svc-small">sq ft</span>
          <span>@</span>
          <span className="svc-small">
            {form.areaSqFt > 0 && form.areaSqFt <= (form.unitSqFt || 500)
              ? `first ${form.unitSqFt || 500} rate`
              : `calculated rate`}
          </span>
          <span>=</span>
          <div className="svc-dollar field-qty">
            <span>$</span>
            <input
              className="svc-in-box"
              type="number"
              readOnly
              min="0"
              step="1"
              name="customPerVisitPrice"
              value={getDisplayValue(
                'customPerVisitPrice',
                form.customPerVisitPrice !== undefined
                  ? form.customPerVisitPrice
                  : calc.perVisitCharge
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{ backgroundColor: form.customPerVisitPrice !== undefined ? '#fffacd' : 'white' }}
              title="Per visit total (editable)"
            />
          </div>
        </div>
      </div>

      {/* Exact sq ft calculation checkbox */}
      <div className="svc-row">
        <label>Calculation Method</label>
        <div className="svc-row-right">
          <label className="svc-inline">
            <input
              type="checkbox"
              name="useExactSqft"
              checked={form.useExactSqft}
              onChange={onChange}
            />
            <span>Exact sq ft calculation</span>
          </label>
          <small style={{ color: "#666", fontSize: "11px", marginLeft: "10px" }}>
            {form.useExactSqft
              ? `(Excess × $${(((form.customAdditionalUnitRate ?? form.additionalUnitRate) || 125) / (form.unitSqFt || 500)).toFixed(2)}/sq ft)`
              : `(Excess in ${form.unitSqFt || 500} sq ft blocks × $${(form.customAdditionalUnitRate ?? form.additionalUnitRate) || 125})`}
          </small>
        </div>
      </div>



      {/* Trip & location – visible but $0 in math */}
      {/* <div className="svc-row">
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
      </div> */}

      {/* Trip charge display – locked at 0 */}
      {/* <div className="svc-row">
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
      </div> */}

      {/* Installation options (same as SaniScrub) */}
      <div className="svc-row">
        <label>Installation</label>
        <div className="svc-row-right">
          <label className="svc-inline">
            <input
              type="checkbox"
              name="includeInstall"
              checked={form.includeInstall}
              onChange={onChange}
            />
            <span>Include Install</span>
          </label>

          {form.includeInstall && (
            <>
              <label className="svc-inline">
                <input
                  type="checkbox"
                  name="isDirtyInstall"
                  checked={form.isDirtyInstall}
                  onChange={onChange}
                />
                <span>Dirty</span>
              </label>
              <div className="svc-dollar">
                <span>×</span>
                <input
                  className="svc-in"
                  type="number"
                  min="0"
                  step={1}
                  name={form.isDirtyInstall ? "installMultiplierDirty" : "installMultiplierClean"}
                  value={form.isDirtyInstall ? (form.installMultiplierDirty || "") : (form.installMultiplierClean || "")}
                  onChange={onChange}
                  title={`${form.isDirtyInstall ? 'Dirty' : 'Clean'} install multiplier (from backend)`}
                />
              </div>
              <span className="svc-small">monthly base</span>
            </>
          )}
        </div>
      </div>

      {/* Installation fee display (when enabled) */}
      {form.includeInstall && calc.installOneTime > 0 && (
        <div className="svc-row svc-row-charge">
          <label>Installation Total</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                type="number"
                min="0"
                readOnly
                step="1"
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
                style={{ backgroundColor: form.customInstallationFee !== undefined ? '#fffacd' : 'white' }}
                title="Installation fee total (editable)"
              />
            </div>
          </div>
        </div>
      )}

      {/* Per-Visit Total - Always show */}
      <div className="svc-row svc-row-total">
        <label>
          {/* Dynamic label based on frequency */}
          {form.frequency === "bimonthly" ||
           form.frequency === "quarterly" ||
           form.frequency === "biannual" ||
           form.frequency === "annual"
            ? "Recurring Visit Total"
            : "Per Visit Total"}
        </label>
        <div className="svc-dollar">
          $<input
            type="number"
            min="0"
            step="1"
            readOnly
            name="customPerVisitPrice"
            className="svc-in svc-in-small"
            value={getDisplayValue(
              'customPerVisitPrice',
              form.customPerVisitPrice !== undefined
                ? form.customPerVisitPrice
                : calc.perVisitCharge
            )}
            onChange={handleLocalChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={{
              backgroundColor: form.customPerVisitPrice !== undefined ? '#fffacd' : 'white',
              border: 'none',
              width: '100px'
            }}
            title={form.frequency === "bimonthly" ||
                   form.frequency === "quarterly" ||
                   form.frequency === "biannual" ||
                   form.frequency === "annual"
                    ? "Recurring visit total - editable"
                    : "Per visit total - editable"}
          />
        </div>
      </div>

            {/* Redline/Greenline Pricing Indicator */}
      {form.areaSqFt > 0 && (
        <div className="svc-row" style={{ marginTop: '-10px', paddingTop: '5px' }}>
          <label></label>
          <div className="svc-row-right">
            {calc.perVisitCharge <= (form.customPerVisitMinimum ?? form.perVisitMinimum) ? (
              <span style={{
                color: '#d32f2f',
                fontSize: '13px',
                fontWeight: '600',
                padding: '4px 8px',
                backgroundColor: '#ffebee',
                borderRadius: '4px',
                display: 'inline-block'
              }}>
                🔴 Redline Pricing (At or Below Minimum)
              </span>
            ) : (
              <span style={{
                color: '#388e3c',
                fontSize: '13px',
                fontWeight: '600',
                padding: '4px 8px',
                backgroundColor: '#e8f5e9',
                borderRadius: '4px',
                display: 'inline-block'
              }}>
                🟢 Greenline Pricing (Above Minimum)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Total Price - Show ONLY for oneTime */}
      {form.frequency === "oneTime" && (
        <div className="svc-row svc-row-total">
          <label>Total Price</label>
          <div className="svc-dollar">
            $<input
              type="number"
              min="0"
              readOnly
              step="1"
              name="customFirstMonthPrice"
              className="svc-in svc-in-small"
              value={getDisplayValue(
                'customFirstMonthPrice',
                form.customFirstMonthPrice !== undefined
                  ? form.customFirstMonthPrice
                  : calc.firstMonthTotal
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{
                backgroundColor: form.customFirstMonthPrice !== undefined ? '#fffacd' : 'white',
                border: 'none',
                width: '100px'
              }}
              title="Total price for one-time service - editable"
            />
          </div>
        </div>
      )}

      {/* First Visit Total - Show for visit-based (not oneTime) */}
      {calc.isVisitBasedFrequency && form.frequency !== "oneTime" && (
        <div className="svc-row svc-row-total">
          <label>First Visit Total</label>
          <div className="svc-dollar">
            $<input
              type="number"
              min="0"
              readOnly
              step="1"
              name="customFirstMonthPrice"
              className="svc-in svc-in-small"
              value={getDisplayValue(
                'customFirstMonthPrice',
                form.customFirstMonthPrice !== undefined
                  ? form.customFirstMonthPrice
                  : calc.firstMonthTotal
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{
                backgroundColor: form.customFirstMonthPrice !== undefined ? '#fffacd' : 'white',
                border: 'none',
                width: '100px'
              }}
              title="First visit total - editable"
            />
          </div>
        </div>
      )}

      {/* First Month Total - Hide for oneTime and visit-based */}
      {!calc.isVisitBasedFrequency && form.frequency !== "oneTime" && (
        <div className="svc-row svc-row-total">
          <label>First Month Total</label>
          <div className="svc-dollar">
            $<input
              type="number"
              min="0"
              readOnly
              step="1"
              name="customFirstMonthPrice"
              className="svc-in svc-in-small"
              value={getDisplayValue(
                'customFirstMonthPrice',
                form.customFirstMonthPrice !== undefined
                  ? form.customFirstMonthPrice
                  : calc.firstMonthTotal
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{
                backgroundColor: form.customFirstMonthPrice !== undefined ? '#fffacd' : 'white',
                border: 'none',
                width: '100px'
              }}
              title="First month total - editable"
            />
          </div>
        </div>
      )}

      {/* Monthly Recurring - Show only for weekly, biweekly, monthly, and twicePerMonth */}
      {(form.frequency === "weekly" || form.frequency === "biweekly" || form.frequency === "monthly" || form.frequency === "twicePerMonth") && (
        <div className="svc-row svc-row-total">
          <label>Recurring Month Total</label>
          <div className="svc-dollar">
            $<input
              type="number"
              min="0"
              readOnly
              step="1"
              name="customMonthlyRecurring"
              className="svc-in svc-in-small"
              value={getDisplayValue(
                'customMonthlyRecurring',
                form.customMonthlyRecurring !== undefined
                  ? form.customMonthlyRecurring
                  : calc.monthlyTotal
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{
                backgroundColor: form.customMonthlyRecurring !== undefined ? '#fffacd' : 'white',
                border: 'none',
                width: '100px'
              }}
              title="Recurring month total - editable"
            />
          </div>
        </div>
      )}

      {/* Contract Total - Hide for oneTime */}
      {form.frequency !== "oneTime" && (
        <div className="svc-row svc-row-total">
          <label>Contract Total</label>
          <div className="svc-row-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select
              className="svc-in"
              name="contractMonths"
              value={form.contractMonths}
              onChange={onChange}
              style={{
                borderBottom: '2px solid #000',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                backgroundColor: 'transparent',
                padding: '4px 20px 4px 4px'
              }}
            >
              {getContractOptions(form.frequency).map((m) => (
                <option key={m} value={m}>
                  {m} months
                </option>
              ))}
            </select>
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>$</span>
            <input
              type="number"
              min="0"
              readOnly
              step="1"
              name="customContractTotal"
              className="svc-in"
              value={getDisplayValue(
                'customContractTotal',
                form.customContractTotal !== undefined
                  ? form.customContractTotal
                  : calc.contractTotal
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
      )}
    </div>
  );
};
