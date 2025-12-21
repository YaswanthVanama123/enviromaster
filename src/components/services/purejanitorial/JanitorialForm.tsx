// src/features/services/janitorial/JanitorialForm.tsx
import React, { useEffect, useRef, useState, type ChangeEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSync, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { useJanitorialCalc } from "./useJanitorialCalc";
import type { JanitorialFormState } from "./useJanitorialCalc";
import { janitorialPricingConfig as cfg } from "./janitorialConfig";
import type { ServiceInitialData } from "../common/serviceTypes";
import { useServicesContextOptional } from "../ServicesContext";
import { CustomFieldManager, type CustomField } from "../CustomFieldManager";

// Helper function to format numbers without unnecessary decimals
const formatNumber = (num: number | undefined): string => {
  if (num === undefined || num === null || isNaN(num)) {
    return "0";
  }
  return num % 1 === 0 ? num.toString() : num.toFixed(2);
};

const fmt = (n: number): string => (n > 0 ? n.toFixed(2) : "0.00");

export const JanitorialForm: React.FC<
  ServiceInitialData<JanitorialFormState>
> = ({ initialData, onRemove }) => {
  const { form, onChange, calc, refreshConfig, isLoadingConfig } = useJanitorialCalc(initialData);
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

  useEffect(() => {
    if (servicesContext) {
      const isActive = (form.manualHours ?? 0) > 0 || (form.vacuumingHours ?? 0) > 0 || (form.dustingTotalPlaces ?? 0) > 0;

      const data = isActive ? {
        serviceId: "pureJanitorial", // ✅ FIXED: Use correct service ID to match backend
        displayName: "Pure Janitorial",
        isActive: true,

        serviceType: {
          isDisplay: true,
          label: "Service Type",
          type: "text" as const,
          value: form.serviceType === "recurring" ? "Recurring Service" : "One-Time Service",
        },

        service: {
          isDisplay: true,
          label: "Service",
          type: "calc" as const,
          qty: parseFloat(calc.totalHours.toFixed(2)),
          rate: form.serviceType === "recurring" ? form.baseHourlyRate : form.shortJobHourlyRate,
          total: calc.perVisit,
          unit: "hours",
        },

        ...(form.manualHours !== undefined ? {
          otherTasks: {
            isDisplay: true,
            label: "Other Tasks",
            type: "text" as const,
            value: `${form.manualHours} hours`,
          },
        } : {}),

        ...(form.vacuumingHours !== undefined ? {
          vacuuming: {
            isDisplay: true,
            label: "Vacuuming",
            type: "text" as const,
            value: `${form.vacuumingHours} hours`,
          },
        } : {}),

        ...(form.dustingTotalPlaces !== undefined ? {
          dusting: {
            isDisplay: true,
            label: "Dusting",
            type: "text" as const,
            value: `${form.dustingTotalPlaces} places = ${form.dustingCalculatedHours?.toFixed(2) || 0} hours`,
          },
        } : {}),

        ...(form.addonTimeMinutes !== undefined ? {
          addonTime: {
            isDisplay: true,
            label: "Add-on Time",
            type: "text" as const,
            value: `${form.addonTimeMinutes} minutes`,
          },
        } : {}),

        ...(form.serviceType === "recurring" && form.installation ? {
          installation: {
            isDisplay: true,
            label: "Installation",
            type: "text" as const,
            value: "Included",
          },
        } : {}),

        ...(form.serviceType === "recurring" ? {
          visitsPerWeek: {
            isDisplay: true,
            label: "Visits per Week",
            type: "text" as const,
            value: `${form.visitsPerWeek} visit${form.visitsPerWeek !== 1 ? 's' : ''} per week`,
          },
        } : {}),

        totals: form.serviceType === "recurring" ? {
          perVisit: {
            isDisplay: true,
            label: "Per Visit Total",
            type: "dollar" as const,
            amount: calc.perVisit,
          },
          weekly: {
            isDisplay: true,
            label: "Weekly Total",
            type: "dollar" as const,
            amount: calc.weekly,
          },
          monthlyRecurring: {
            isDisplay: true,
            label: "Monthly Recurring",
            type: "dollar" as const,
            amount: calc.recurringMonthly,
          },
          ...(form.installation ? {
            firstMonth: {
              isDisplay: true,
              label: "First Month Total",
              type: "dollar" as const,
              amount: calc.firstMonth,
            },
          } : {}),
          contract: {
            isDisplay: true,
            label: "Contract Total",
            type: "dollar" as const,
            months: form.contractMonths,
            amount: calc.contractTotal,
          },
        } : {
          oneTime: {
            isDisplay: true,
            label: "One-Time Service Total",
            type: "dollar" as const,
            amount: calc.perVisit,
          },
        },

        notes: form.notes || "", // Optional notes field
        customFields: customFields,
      } : null;

      const dataStr = JSON.stringify(data);

      if (dataStr !== prevDataRef.current) {
        console.log('🔄 Janitorial form updating services context with data:');
        console.log('✅ Full data being sent:', JSON.stringify(data, null, 2));
        console.log('✅ Totals section:', JSON.stringify(data?.totals, null, 2));

        prevDataRef.current = dataStr;
        servicesContext.updateService("pureJanitorial", data); // ✅ FIXED: Use correct service ID
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, calc, customFields]);

  return (
    <div className="svc-card">
      {/* Header */}
      <div className="svc-h-row">
        <div className="svc-h">PURE JANITORIAL ADD-ONS</div>
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

      {/* Summary / description */}
      {/* <div className="svc-row">
        <label>Overview</label>
        <div className="svc-row-right">
          <span className="svc-small">
            Vacuuming, dusting, and other light janitorial extras. Base rate $
            {cfg.baseHourlyRate.toFixed(2)}/hr. Normal route has a{" "}
            {cfg.minHoursPerVisit}-hour minimum target (
            {cfg.minHoursPerVisit} × ${cfg.baseHourlyRate} = $
            {cfg.minHoursPerVisit * cfg.baseHourlyRate} minimum per visit). For
            very small standalone jobs you can use $
            {cfg.shortJobHourlyRate.toFixed(2)}/hr.
          </span>
        </div>
      </div> */}

      {/* Service Type: Recurring or One-Time */}
      <div className="svc-row">
        <label>Service Type</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="serviceType"
            value={form.serviceType}
            onChange={onChange}
          >
            <option value="recurring">Recurring Service (${form.baseHourlyRate}/hr)</option>
            <option value="oneTime">One-Time Service (${form.shortJobHourlyRate}/hr)</option>
          </select>
        </div>
      </div>

      {/* Visits per Week (only for recurring) */}
      {form.serviceType === "recurring" && (
        <div className="svc-row">
          <label>Visits per Week</label>
          <div className="svc-row-right">
            <select
              className="svc-in"
              name="visitsPerWeek"
              value={form.visitsPerWeek}
              onChange={onChange}
            >
              <option value={1}>1 visit per week</option>
              <option value={2}>2 visits per week</option>
              <option value={3}>3 visits per week</option>
              <option value={4}>4 visits per week</option>
              <option value={5}>5 visits per week</option>
              <option value={6}>6 visits per week</option>
              <option value={7}>7 visits per week (daily)</option>
            </select>
            <span className="svc-small">
              Monthly visits: {formatNumber((form.weeksPerMonth || 0) * (form.visitsPerWeek || 0))}
            </span>
          </div>
        </div>
      )}

      {/* TASK-SPECIFIC INPUTS */}
      <div className="svc-h-row svc-h-row-sub">
        <div className="svc-h-sub">Task-Specific Inputs</div>
      </div>

      {/* One-Time Service Pricing - Show rate for one-time */}
      {form.serviceType === "oneTime" && (
        <div className="svc-row">
          <label>One-Time Rate</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in svc-in-small"
                type="number"
                min={0}
                step={0.01}
                name="shortJobHourlyRate"
                value={form.shortJobHourlyRate || ""}
                onChange={onChange}
                title="One-time service hourly rate (from backend)"
              />
            </div>
            <span className="svc-small">/hr (min {form.minHoursPerVisit || 0} hours = ${formatNumber((form.minHoursPerVisit || 0) * (form.shortJobHourlyRate || 0))} minimum)</span>
          </div>
        </div>
      )}

      {/* Recurring Service Pricing - Show rate for recurring */}
      {form.serviceType === "recurring" && (
        <div className="svc-row">
          <label>Recurring Rate</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in svc-in-small"
                type="number"
                min={0}
                step={0.01}
                name="baseHourlyRate"
                value={form.baseHourlyRate || ""}
                onChange={onChange}
                title="Recurring service hourly rate (from backend)"
              />
            </div>
            <span className="svc-small">/hr (min {form.minHoursPerVisit || 0} hours = ${formatNumber((form.minHoursPerVisit || 0) * (form.baseHourlyRate || 0))} minimum)</span>
          </div>
        </div>
      )}

      {/* Vacuuming */}
      <div className="svc-row">
        <label>Vacuuming (hours)</label>
        <div className="svc-row-right">
          <input
            className="svc-in svc-in-small"
            type="number"
            min={0}
            step={0.25}
            name="vacuumingHours"
            value={form.vacuumingHours || ""}
            onChange={onChange}
            placeholder={cfg.vacuumingDefaultHours.toString()}
          />
          <span className="svc-small">
            hr
          </span>
        </div>
      </div>

      {/* Installation checkbox - Only for recurring */}
      {/* {form.serviceType === "recurring" && (
        <div className="svc-row">
          <label>Installation</label>
          <div className="svc-row-right">
            <label className="svc-inline">
              <input
                type="checkbox"
                name="installation"
                checked={form.installation}
                onChange={onChange}
              />
              <span className="svc-small">Include installation/setup</span>
            </label>
          </div>
        </div>
      )} */}

      {/* Dusting */}
      <div className="svc-row">
        <label>Dusting (Places → Hours)</label>
        <div className="svc-row-right">
          <input
            className="svc-in svc-in-small field-qty"
            type="number"
            min={0}
            step={1}
            name="dustingTotalPlaces"
            value={form.dustingTotalPlaces || ""}
            onChange={onChange}
            placeholder="90"
          />
          <span className="svc-small">total places ÷ </span>
          <input
            className="svc-in svc-in-small field-qty"
            type="number"
            min={1}
            step={1}
            name="dustingPlacesPerHour"
            value={form.dustingPlacesPerHour || ""}
            onChange={onChange}
            title="Places per hour (from admin panel, editable by salesman)"
          />
          <span className="svc-small">places/hr = </span>
          <input
            className="svc-in svc-in-small field-qty"
            type="number"
              min="0"
            value={form.dustingCalculatedHours?.toFixed(2) || 0}
            readOnly
            style={{ backgroundColor: '#f0f8ff' }}
            title="Calculated hours (auto-calculated)"
          />
          {/* <span className="svc-small">hrs (combined with vacuum & other tasks, priced at hourly rate)</span> */}
        </div>
      </div>

      {/* Other Tasks (hours) */}
      <div className="svc-row">
        <label>Other Tasks (hrs)</label>
        <div className="svc-row-right">
          <input
            className="svc-in svc-in-small"
            type="number"
            min={0}
            step={0.25}
            name="manualHours"
            value={form.manualHours || ""}
            onChange={onChange}
          />
          <span className="svc-small">
            Extra sweeping, spot mopping, small wipe-downs.
          </span>
        </div>
      </div>

      {/* Add-on Time (minutes) - For BOTH recurring and one-time */}
      <div className="svc-row">
        <label>Add-on Time (mins)</label>
        <div className="svc-row-right">
          <input
            className="svc-in svc-in-small"
            type="number"
            min={0}
            step={1}
            name="addonTimeMinutes"
            value={form.addonTimeMinutes || ""}
            onChange={onChange}
            placeholder="0"
          />
          <span className="svc-small">
            mins (Tiered pricing applied automatically based on time entered)
          </span>
        </div>
      </div>

      {/* Contract length - Only show for recurring services */}
      {/* {form.serviceType === "recurring" && (
        <div className="svc-row">
          <label>Contract Length (Months)</label>
          <div className="svc-row-right">
            <input
              className="svc-in svc-in-small"
              type="number"
              min="0"
              min={cfg.minContractMonths}
              max={cfg.maxContractMonths}
              name="contractMonths"
              value={form.contractMonths}
              onChange={onChange}
            />
          </div>
        </div>
      )} */}

      {/* OUTPUTS */}
      <div className="svc-h-row svc-h-row-sub">
        <div className="svc-h-sub">Pricing Summary</div>
      </div>

      {/* Total hours */}
      <div className="svc-row">
        <label>Total Hours (per visit)</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="text"
            readOnly
            value={`${fmt(calc.totalHours)} hrs`}
          />
        </div>
      </div>

      {/* Per-visit price */}
      <div className="svc-row svc-row-charge">
        <label>
          {form.serviceType === "oneTime" ? "One-Time Service Price" : "Per Visit Total"}
        </label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="number"
              min="0"
              readOnly
              step="0.01"
              name="customPerVisit"
              value={getDisplayValue(
                'customPerVisit',
                form.customPerVisit !== undefined
                  ? form.customPerVisit
                  : calc?.perVisit || 0
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
      </div>

      {/* Redline/Greenline Pricing Indicator */}
      {(form.manualHours > 0 || form.vacuumingSqFt > 0 || form.dustingPlaces > 0) && (
        <div className="svc-row" style={{ marginTop: '-10px', paddingTop: '5px' }}>
          <label></label>
          <div className="svc-row-right">
            {(calc?.perVisit || 0) <= (calc?.minimumChargePerVisit || 0) ? (
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

      {/* Weekly total - Only show for recurring */}
      {form.serviceType === "recurring" && (
        <div className="svc-row svc-row-charge">
          <label>Weekly Total ({form.visitsPerWeek} visit{form.visitsPerWeek !== 1 ? 's' : ''})</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                type="text"
                readOnly
                value={formatNumber(calc?.weekly || 0)}
                style={{
                  backgroundColor: 'white',
                  border: 'none',
                  width: '100px'
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Recurring monthly total - Only show for recurring */}
      {form.serviceType === "recurring" && (
        <div className="svc-row svc-row-charge">
          <label>Monthly Recurring ({formatNumber((form.weeksPerMonth || 0) * (form.visitsPerWeek || 0))} visits/month)</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                type="number"
                min="0"
                step="0.01"
                name="customOngoingMonthly"
                value={getDisplayValue(
                  'customOngoingMonthly',
                  form.customOngoingMonthly !== undefined
                    ? form.customOngoingMonthly
                    : calc?.recurringMonthly || 0
                )}
                onChange={handleLocalChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={{
                  backgroundColor: form.customOngoingMonthly !== undefined ? '#fffacd' : 'white',
                  border: 'none',
                  width: '100px'
                }}
                title="Monthly recurring - editable"
              />
            </div>
          </div>
        </div>
      )}

      {/* First month total - Only show for recurring with installation */}
      {form.serviceType === "recurring" && form.installation && (
        <div className="svc-row svc-row-charge">
          <label>First Month Total (incl. installation)</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                type="number"
              min="0"
                step="0.01"
                name="customMonthly"
                value={getDisplayValue(
                  'customMonthly',
                  form.customMonthly !== undefined
                    ? form.customMonthly
                    : calc?.firstMonth || 0
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
        </div>
      )}

      {/* Contract total - Only show for recurring */}
      {form.serviceType === "recurring" && (
        <div className="svc-row svc-row-charge">
          <label>Contract Total</label>
          <div className="svc-row-right">
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
              {(() => {
                const options = [];
                for (let months = cfg.minContractMonths; months <= cfg.maxContractMonths; months++) {
                  options.push(months);
                }
                return options.map((months) => (
                  <option key={months} value={months}>
                    {months} mo
                  </option>
                ));
              })()}
            </select>
            <span style={{ fontSize: '18px', fontWeight: 'bold', marginLeft: '10px' }}>$</span>
            <input
              type="number"
              min="0"
              readOnly
              step="0.01"
              name="customContractTotal"
              className="svc-in"
              value={getDisplayValue(
                'customContractTotal',
                form.customContractTotal !== undefined
                  ? form.customContractTotal
                  : calc?.contractTotal || 0
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
                width: '100px',
                marginLeft: '5px'
              }}
              title="Contract total - editable"
            />
          </div>
        </div>
      )}
    </div>
  );
};
