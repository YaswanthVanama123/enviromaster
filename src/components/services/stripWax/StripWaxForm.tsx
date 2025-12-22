// src/features/services/stripWax/StripWaxForm.tsx
import React, { useEffect, useRef, useState, type ChangeEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSync, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { useStripWaxCalc } from "./useStripWaxCalc";
import type { StripWaxFormState } from "./stripWaxTypes";
import { stripWaxPricingConfig as cfg } from "./stripWaxConfig";
import type { ServiceInitialData } from "../common/serviceTypes";
import { useServicesContextOptional } from "../ServicesContext";
import { CustomFieldManager, type CustomField } from "../CustomFieldManager";

export const StripWaxForm: React.FC<
  ServiceInitialData<StripWaxFormState>
> = ({ initialData, onRemove }) => {
  const { form, setForm, onChange, calc, refreshConfig, isLoadingConfig } = useStripWaxCalc(initialData);
  const servicesContext = useServicesContextOptional();

  // Custom fields state - initialize with initialData if available
  const [customFields, setCustomFields] = useState<CustomField[]>(
    initialData?.customFields || []
  );
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

  // Determine if frequency is visit-based (not monthly billing)
  const isVisitBasedFrequency = form.frequency === "oneTime" || form.frequency === "quarterly" ||
    form.frequency === "biannual" || form.frequency === "annual" || form.frequency === "bimonthly";

  // Generate frequency-specific contract month options
  const generateContractMonths = () => {
    const months = [];

    if (form.frequency === "oneTime") {
      return [];
    } else if (form.frequency === "bimonthly") {
      for (let i = 2; i <= cfg.maxContractMonths; i += 2) {
        months.push(i);
      }
    } else if (form.frequency === "quarterly") {
      for (let i = 3; i <= cfg.maxContractMonths; i += 3) {
        months.push(i);
      }
    } else if (form.frequency === "biannual") {
      for (let i = 6; i <= cfg.maxContractMonths; i += 6) {
        months.push(i);
      }
    } else if (form.frequency === "annual") {
      for (let i = 12; i <= cfg.maxContractMonths; i += 12) {
        months.push(i);
      }
    } else {
      for (let i = cfg.minContractMonths; i <= cfg.maxContractMonths; i++) {
        months.push(i);
      }
    }

    return months;
  };

  const contractMonthOptions = generateContractMonths();

  useEffect(() => {
    if (servicesContext) {
      const isActive = (form.floorAreaSqFt ?? 0) > 0;

      const data = isActive ? {
        serviceId: "stripwax",
        displayName: "Strip & Wax",
        isActive: true,

        // Red/Green Line pricing data
        rawPrice: calc.rawPrice,  // Raw price before minimum
        perVisit: calc.perVisit,  // Final price after minimum
        minCharge: form.minCharge,  // Minimum threshold

        frequency: {
          isDisplay: true,
          label: "Frequency",
          type: "text" as const,
          value: typeof form.frequency === 'string'
            ? form.frequency.charAt(0).toUpperCase() + form.frequency.slice(1)
            : String(form.frequency || ''),
        },

        variant: {
          isDisplay: true,
          label: "Service Type",
          type: "text" as const,
          value: cfg.variants[form.serviceVariant]?.label || '',
        },

        service: {
          isDisplay: true,
          label: "Floor Area",
          type: "calc" as const,
          qty: form.floorAreaSqFt,
          rate: form.ratePerSqFt,
          total: calc.perVisit,
          unit: "sq ft",
        },

        totals: {
          perVisit: {
            isDisplay: true,
            label: "Per Visit Total",
            type: "dollar" as const,
            amount: calc.perVisit,
          },
          monthly: {
            isDisplay: true,
            label: form.frequency === "oneTime" ? "Total Price" :
                   isVisitBasedFrequency ? "First Visit Total" : "First Month Total",
            type: "dollar" as const,
            amount: calc.monthly,
          },
          contract: {
            isDisplay: form.frequency !== "oneTime",
            label: "Contract Total",
            type: "dollar" as const,
            months: form.contractMonths,
            amount: calc.contractTotal,
          },
        },

        notes: "", // No notes field in Strip Wax
        customFields: customFields,
      } : null;

      const dataStr = JSON.stringify(data);

      if (dataStr !== prevDataRef.current) {
        prevDataRef.current = dataStr;
        console.log('🔧 [StripWax] Sending to context:', JSON.stringify(data, null, 2));
        servicesContext.updateService("stripwax", data);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, calc, customFields]);

  // Clear custom overrides when base inputs change
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      customPerVisit: undefined,
      customMonthly: undefined,
      customOngoingMonthly: undefined,
      customContractTotal: undefined,
    }));
  }, [
    form.floorAreaSqFt,
    form.ratePerSqFt,
    form.minCharge,
    form.serviceVariant,
    form.frequency,
    form.rateCategory,
    form.contractMonths,
    setForm,
  ]);

  const variantOptions = cfg.variants;

  return (
    <div className="svc-card">
      {/* Header */}
      <div className="svc-h-row">
        <div className="svc-h">STRIP &amp; WAX FLOOR</div>
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

      {/* Frequency row (for per-visit view label only) */}
      <div className="svc-row">
        <label>Frequency</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="frequency"
            value={form.frequency}
            onChange={onChange}
          >
            <option value="oneTime">One Time</option>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Bi-Weekly</option>
            <option value="twicePerMonth">2× / Month</option>
            <option value="monthly">Monthly</option>
            <option value="bimonthly">Every 2 Months</option>
            <option value="quarterly">Quarterly</option>
            <option value="biannual">Bi-Annual</option>
            <option value="annual">Annual</option>
          </select>
        </div>
      </div>

      {/* Floor area row */}
      <div className="svc-row">
        <label>Floor Area</label>
        <div className="svc-row-right">
          <input
            className="svc-in svc-in-small field-qty"
            type="number"
            min="0"
            step={1}
            name="floorAreaSqFt"
            value={form.floorAreaSqFt || ""}
            onChange={onChange}
          />
          <span className="svc-multi">@</span>
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in svc-in-small field-qty"
              type="number"
              min="0"
              step={0.01}
              name="ratePerSqFt"
              value={form.ratePerSqFt || ""}
              onChange={onChange}
              title="Rate per sq ft (from backend, editable)"
            />
          </div>
          <span className="svc-small">/sq ft</span>
          <span className="svc-eq">=</span>
          <span className="svc-dollar">
            ${calc.perVisit.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Floor area calculation info */}
      <div className="svc-row">
        <label></label>
        <div className="svc-row-right">
          <span className="svc-small">
            (Direct: area × $${form.ratePerSqFt.toFixed(2)}/sq ft, min $${form.minCharge.toFixed(2)})
          </span>
        </div>
      </div>

      {/* Minimum charge row */}
      <div className="svc-row">
        <label>Minimum Charge</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in svc-in-small"
              type="number"
              min="0"
              step={1}
              name="minCharge"
              value={form.minCharge || ""}
              onChange={onChange}
              title="Minimum charge per visit (from backend, editable)"
            />
          </div>
          <span className="svc-small">minimum</span>
        </div>
      </div>

      {/* Service variant selection */}
      <div className="svc-row">
        <label>Service Type</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="serviceVariant"
            value={form.serviceVariant}
            onChange={onChange}
          >
            {(
              Object.keys(variantOptions) as Array<
                keyof typeof variantOptions
              >
            ).map((k) => (
              <option key={k} value={k}>
                {variantOptions[k].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Rate category */}
      <div className="svc-row">
        <label>Rate Category</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="rateCategory"
            value={form.rateCategory}
            onChange={onChange}
          >
            <option value="redRate">Red (base)</option>
            <option value="greenRate">Green (+30%)</option>
          </select>
        </div>
      </div>

      {/* Totals */}
      <div className="svc-row svc-row-total">
        <label>Per Visit Total</label>
        <div className="svc-dollar">
          $<input
            type="number"
            min="0"
            step="0.01"
            name="customPerVisit"
            className="svc-in svc-in-small"
            value={getDisplayValue(
              'customPerVisit',
              form.customPerVisit !== undefined
                ? form.customPerVisit
                : calc.perVisit
            )}
            onChange={handleLocalChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={{
              backgroundColor: form.customPerVisit !== undefined ? '#fffacd' : 'white',
              border: 'none',
              width: '100px'
            }}
            title="Per visit total - editable"
          />
        </div>
      </div>

      {/* Redline/Greenline Pricing Indicator */}
      {form.floorAreaSqFt > 0 && (
        <div className="svc-row" style={{ marginTop: '-10px', paddingTop: '5px' }}>
          <label></label>
          <div className="svc-row-right">
            {calc.perVisit <= form.minCharge ? (
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
              step="0.01"
              name="customMonthly"
              className="svc-in svc-in-small"
              value={getDisplayValue(
                'customMonthly',
                form.customMonthly !== undefined
                  ? form.customMonthly
                  : calc.monthly
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{
                backgroundColor: form.customMonthly !== undefined ? '#fffacd' : 'white',
                border: 'none',
                width: '100px'
              }}
              title="Total price for one-time service - editable"
            />
          </div>
        </div>
      )}

      {/* First Visit Total - Show for visit-based (not oneTime) */}
      {isVisitBasedFrequency && form.frequency !== "oneTime" && (
        <div className="svc-row svc-row-total">
          <label>First Visit Total</label>
          <div className="svc-dollar">
            $<input
              type="number"
            min="0"
              step="0.01"
              name="customMonthly"
              className="svc-in svc-in-small"
              value={getDisplayValue(
                'customMonthly',
                form.customMonthly !== undefined
                  ? form.customMonthly
                  : calc.monthly
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{
                backgroundColor: form.customMonthly !== undefined ? '#fffacd' : 'white',
                border: 'none',
                width: '100px'
              }}
              title="First visit total - editable"
            />
          </div>
        </div>
      )}

      {/* First Month Total - Hide for oneTime, quarterly, biannual, annual, bimonthly */}
      {!isVisitBasedFrequency && (
        <div className="svc-row svc-row-total">
          <label>First Month Total</label>
          <div className="svc-dollar">
            $<input
              type="number"
            min="0"
              step="0.01"
              name="customMonthly"
              className="svc-in svc-in-small"
              value={getDisplayValue(
                'customMonthly',
                form.customMonthly !== undefined
                  ? form.customMonthly
                  : calc.monthly
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{
                backgroundColor: form.customMonthly !== undefined ? '#fffacd' : 'white',
                border: 'none',
                width: '100px'
              }}
              title="First month total - editable"
            />
          </div>
        </div>
      )}

      {/* Monthly Recurring - Hide for oneTime, quarterly, biannual, annual, bimonthly */}
      {!isVisitBasedFrequency && (
        <div className="svc-row svc-row-total">
          <label>Monthly Recurring</label>
          <div className="svc-dollar">
            $<input
              type="number"
            min="0"
              step="0.01"
              name="customOngoingMonthly"
              className="svc-in svc-in-small"
              value={getDisplayValue(
                'customOngoingMonthly',
                form.customOngoingMonthly !== undefined
                  ? form.customOngoingMonthly
                  : calc.ongoingMonthly
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{
                backgroundColor: form.customOngoingMonthly !== undefined ? '#fffacd' : 'white',
                border: 'none',
                width: '100px'
              }}
              title="Ongoing monthly - editable"
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
              {contractMonthOptions.map((m) => (
                <option key={m} value={m}>
                  {m} months
                </option>
              ))}
            </select>
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>$</span>
            <input
              type="number"
            min="0"
              step="0.01"
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
