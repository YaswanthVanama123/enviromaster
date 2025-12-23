// src/features/services/rpmWindows/RpmWindowsForm.tsx
import React, { useEffect, useRef, useState, type ChangeEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSync, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { useRpmWindowsCalc } from "./useRpmWindowsCalc";
import type { RpmWindowsFormState } from "./rpmWindowsTypes";
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

export const RpmWindowsForm: React.FC<
  ServiceInitialData<RpmWindowsFormState>
> = ({ initialData, onRemove }) => {
  const {
    form,
    setForm,
    onChange,
    addExtraCharge,
    updateExtraCharge,
    calc,
    quote,
    refreshConfig,
    isLoadingConfig,
  } = useRpmWindowsCalc(initialData);
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
      const isActive = (form.smallQty ?? 0) > 0 || (form.mediumQty ?? 0) > 0 || (form.largeQty ?? 0) > 0;

      const data = isActive ? {
        serviceId: "rpmWindows",
        displayName: "RPM Window",
        isActive: true,

        // Red/Green Line pricing data
        perVisitBase: calc.subtotal,  // Raw subtotal before minimum
        perVisit: calc.perVisit,  // Final per-visit price after minimum
        minimumChargePerVisit: calc.minimumChargePerVisit,  // Minimum threshold

        windows: [
          ...(form.smallQty > 0 ? [{
            isDisplay: true,
            label: "Small Windows",
            type: "calc" as const,
            qty: form.smallQty,
            rate: calc.effSmall,
            total: form.customSmallTotal ?? (form.smallQty * calc.effSmall),
          }] : []),
          ...(form.mediumQty > 0 ? [{
            isDisplay: true,
            label: "Medium Windows",
            type: "calc" as const,
            qty: form.mediumQty,
            rate: calc.effMedium,
            total: form.customMediumTotal ?? (form.mediumQty * calc.effMedium),
          }] : []),
          ...(form.largeQty > 0 ? [{
            isDisplay: true,
            label: "Large Windows",
            type: "calc" as const,
            qty: form.largeQty,
            rate: calc.effLarge,
            total: form.customLargeTotal ?? (form.largeQty * calc.effLarge),
          }] : []),
        ],
        installationFee: {
          isDisplay: true,
          label: "First Visit",
          type: "dollar" as const,
          amount: form.customInstallationFee ?? calc.installOneTime,
        },
        installType: {
          isDisplay: true,
          label: "Install Type",
          type: "text" as const,
          value: form.isFirstTimeInstall ? "First Time (Install)" : "Ongoing / Clean",
        },
        serviceFrequency: {
          isDisplay: true,
          label: "Service Frequency",
          type: "text" as const,
          value: typeof form.frequency === 'string'
            ? form.frequency.charAt(0).toUpperCase() + form.frequency.slice(1)
            : String(form.frequency || ''),
        },
        mirrorCleaning: {
          isDisplay: true,
          label: "Mirror Cleaning",
          type: "text" as const,
          value: form.includeMirrors ? "Include (same chemicals)" : "Not included",
        },
        rateCategory: {
          isDisplay: true,
          label: "Rate Category",
          type: "text" as const,
          value: form.selectedRateCategory === "redRate" ? "Red Rate" : "Green Rate",
        },
        extraCharges: form.extraCharges.map(charge => ({
          isDisplay: true,
          label: charge.description || "Extra Charge",
          type: "dollar" as const,
          amount: charge.amount,
        })),
        totals: {
          perVisit: {
            isDisplay: true,
            label: "Total Price)",
            type: "dollar" as const,
            amount: form.customPerVisitPrice ?? quote.perVisitPrice,
          },
          firstMonth: {
            isDisplay: true,
            label: "First Month Total",
            type: "dollar" as const,
            amount: form.customFirstMonthTotal ?? calc.firstMonthBillRated,
          },
          monthlyRecurring: {
            isDisplay: true,
            label: "Monthly Recurring",
            type: "dollar" as const,
            amount: form.customMonthlyRecurring ?? calc.monthlyBillRated,
          },
          annual: {
            isDisplay: true,
            label: "Annual Price",
            type: "dollar" as const,
            months: form.contractMonths,
            amount: form.customAnnualPrice ?? quote.annualPrice,
          },
        },
        notes: form.notes || "",
        customFields: customFields,
      } : null;

      const dataStr = JSON.stringify(data);

      if (dataStr !== prevDataRef.current) {
        prevDataRef.current = dataStr;
        servicesContext.updateService("rpmWindows", data);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, calc, quote, customFields]);

  const handleInstallTypeChange = (value: "first" | "clean") =>
    setForm((prev) => ({ ...prev, isFirstTimeInstall: value === "first" }));

  // Clear custom totals when base inputs change
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      customSmallTotal: undefined,
    }));
  }, [form.smallQty, calc.effSmall]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      customMediumTotal: undefined,
    }));
  }, [form.mediumQty, calc.effMedium]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      customLargeTotal: undefined,
    }));
  }, [form.largeQty, calc.effLarge]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      customInstallationFee: undefined,
    }));
  }, [form.isFirstTimeInstall, calc.firstVisitTotalRated]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      customPerVisitPrice: undefined,
      customFirstMonthTotal: undefined,
      customMonthlyRecurring: undefined,
      customAnnualPrice: undefined,
    }));
  }, [
    form.smallQty,
    form.mediumQty,
    form.largeQty,
    calc.effSmall,
    calc.effMedium,
    calc.effLarge,
    form.extraCharges,
    form.frequency,
    form.contractMonths,
  ]);

  // Installation Fee + First Visit (now: install-only first visit)
  const installationFeeDisplay = form.isFirstTimeInstall
    ? calc.firstVisitTotalRated
    : 0;

  return (
    <div className="svc-card">
      <div className="svc-h-row">
        <div className="svc-h">RPM WINDOW</div>
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
          <button
            type="button"
            className="svc-mini"
            onClick={addExtraCharge}
            title="Add extra charge"
            style={{ fontSize: '12px' }}
          >
            $
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

      {/* Frequency */}
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

      {/* Small */}
      <div className="svc-row">
        <label>Small Windows</label>
        <div className="svc-row-right">
          <input
            className="svc-in field-qty"
            name="smallQty"
            type="number"
            min="0"
            value={form.smallQty || ""}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in field-qty"
            name="smallWindowRate"
            type="number"
            min="0"
            step="0.01"
            value={form.smallWindowRate || ""}
            onChange={onChange}
            title="Base weekly rate (from backend)"
          />
          <span>=</span>
          <input
            className="svc-in-box field-qty"
            name="customSmallTotal"
            type="number"
            min="0"
            step="0.01"
            value={getDisplayValue(
              'customSmallTotal',
              form.customSmallTotal !== undefined
                ? form.customSmallTotal
                : (form.smallQty * calc.effSmall)
            )}
            onChange={handleLocalChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={{ backgroundColor: form.customSmallTotal !== undefined ? '#fffacd' : 'white' }}
            title={`Calculated total (Qty × $${formatNumber(calc.effSmall)} effective rate)`}
          />
        </div>
      </div>

      {/* Medium */}
      <div className="svc-row">
        <label>Medium Windows</label>
        <div className="svc-row-right">
          <input
            className="svc-in field-qty"
            name="mediumQty"
            type="number"
            min="0"
            value={form.mediumQty || ""}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in field-qty"
            name="mediumWindowRate"
            type="number"
            min="0"
            step="0.01"
            value={form.mediumWindowRate || ""}
            onChange={onChange}
            title="Base weekly rate (from backend)"
          />
          <span>=</span>
          <input
            className="svc-in-box field-qty"
            name="customMediumTotal"
            type="number"
            min="0"
            step="0.01"
            value={getDisplayValue(
              'customMediumTotal',
              form.customMediumTotal !== undefined
                ? form.customMediumTotal
                : (form.mediumQty * calc.effMedium)
            )}
            onChange={handleLocalChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={{ backgroundColor: form.customMediumTotal !== undefined ? '#fffacd' : 'white' }}
            title={`Calculated total (Qty × $${formatNumber(calc.effMedium)} effective rate)`}
          />
        </div>
      </div>

      {/* Large */}
      <div className="svc-row">
        <label>Large Windows</label>
        <div className="svc-row-right">
          <input
            className="svc-in field-qty"
            name="largeQty"
            type="number"
            min="0"
            value={form.largeQty || ""}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in field-qty"
            name="largeWindowRate"
            type="number"
            min="0"
            step="0.01"
            value={form.largeWindowRate || ""}
            onChange={onChange}
            title="Base weekly rate (from backend)"
          />
          <span>=</span>
          <input
            className="svc-in-box field-qty"
            name="customLargeTotal"
            type="number"
            min="0"
            step="0.01"
            value={getDisplayValue(
              'customLargeTotal',
              form.customLargeTotal !== undefined
                ? form.customLargeTotal
                : (form.largeQty * calc.effLarge)
            )}
            onChange={handleLocalChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={{ backgroundColor: form.customLargeTotal !== undefined ? '#fffacd' : 'white' }}
            title={`Calculated total (Qty × $${formatNumber(calc.effLarge)} effective rate)`}
          />
        </div>
      </div>

      {/* + Added extra lines */}
      {form.extraCharges.map((line) => (
        <div className="svc-row" key={line.id}>
          <div className="svc-row-right">
            <input
              className="svc-in"
              type="text"
              placeholder="Calc"
              value={line.calcText}
              onChange={(e) =>
                updateExtraCharge(line.id, "calcText", e.target.value)
              }
            />
            <input
              className="svc-in"
              type="text"
              placeholder="Text"
              value={line.description}
              onChange={(e) =>
                updateExtraCharge(line.id, "description", e.target.value)
              }
            />
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                type="number"
        min="0"
          min="0"
            min="0"
                value={line.amount}
                onChange={(e) =>
                  updateExtraCharge(line.id, "amount", e.target.value)
                }
              />
            </div>
          </div>
        </div>
      ))}

      {/* Trip Charge */}
      {/* <div className="svc-row svc-row-charge">
        <label>Trip Charge</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="number"
        min="0"
          min="0"
            min="0"
              value={formatNumber(calc.effTrip)}
              readOnly
            />
          </div>
          <label className="svc-inline">
            <input type="checkbox" checked readOnly />
            <span>Include</span>
          </label>
        </div>
      </div> */}

      {/* Install Type */}
      <div className="svc-row">
        <label>Install Type</label>
        <div className="svc-row-right">
          <label className="svc-inline">
            <input
              type="radio"
              value="first"
              checked={form.isFirstTimeInstall}
              onChange={() => handleInstallTypeChange("first")}
            />
            <span>First Time (Install)</span>
          </label>
          <label className="svc-inline">
            <input
              type="radio"
              value="clean"
              checked={!form.isFirstTimeInstall}
              onChange={() => handleInstallTypeChange("clean")}
            />
            <span>Ongoing / Clean</span>
          </label>
        </div>
      </div>





      {/* Installation Multipliers */}
      <div className="svc-row">
        <label>Install Multiplier (Dirty)</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <input
              name="installMultiplierFirstTime"
              type="number"
            min="0"
              step="0.1"
              value={form.installMultiplierFirstTime}
              onChange={onChange}
              style={{ backgroundColor: form.installMultiplierFirstTime !== 3 ? '#fffacd' : 'white' }}
              title="Multiplier for dirty/first-time installations (typically 3×)"
            />
            <span>×</span>
          </div>
        </div>
      </div>

      <div className="svc-row">
        <label>Install Multiplier (Clean)</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <input
              name="installMultiplierClean"
              type="number"
        min="0"
          min="0"
            min="0"
              step="0.1"
              value={form.installMultiplierClean}
              onChange={onChange}
              style={{ backgroundColor: form.installMultiplierClean !== 1 ? '#fffacd' : 'white' }}
              title="Multiplier for clean installations (typically 1×)"
            />
            <span>×</span>
          </div>
        </div>
      </div>



      {/* Rate Category */}
      {/* <div className="svc-row">
        <label>Rate Category</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="selectedRateCategory"
            value={form.selectedRateCategory}
            onChange={onChange}
          >
            <option value="redRate">Red (Standard)</option>
            <option value="greenRate">Green (Premium)</option>
          </select>
        </div>
      </div> */}


            {/* Install Fee + First Visit */}
      <div className="svc-row svc-row-charge">
        <label>Installation + First Visit</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="number"
              min="0"
              readOnly
              step="0.01"
              name="customInstallationFee"
              value={getDisplayValue(
                'customInstallationFee',
                form.customInstallationFee !== undefined ? form.customInstallationFee : installationFeeDisplay
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{ backgroundColor: form.customInstallationFee !== undefined ? '#fffacd' : 'white' }}
            />
          </div>
        </div>
      </div>

      {/* Mirror */}
      {/* <div className="svc-row">
        <label>Mirror Cleaning</label>
        <div className="svc-row-right">
          <label className="svc-inline">
            <input
              type="checkbox"
              name="includeMirrors"
              checked={form.includeMirrors}
              onChange={onChange}
            />
            <span>Include mirrors</span>
          </label>
        </div>
      </div> */}



      {/* Total Per Visit – HIDE for 2×/month and monthly */}
      {form.frequency !== "twicePerMonth" && form.frequency !== "monthly" && (
        <div className="svc-row svc-row-charge">
          <label>
            {form.frequency === "bimonthly" ||
             form.frequency === "quarterly" ||
             form.frequency === "biannual" ||
             form.frequency === "annual"
              ? "Recurring Visit Total"
              : "Per Visit Price"}
          </label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                name="customPerVisitPrice"
                type="number"
                min="0"
                readOnly
                step="0.01"
                value={getDisplayValue(
                  'customPerVisitPrice',
                  form.customPerVisitPrice !== undefined ? form.customPerVisitPrice : quote.perVisitPrice
                )}
                onChange={handleLocalChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={{ backgroundColor: form.customPerVisitPrice !== undefined ? '#fffacd' : 'white' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Redline/Greenline Pricing Indicator */}
      {(form.smallQty > 0 || form.mediumQty > 0 || form.largeQty > 0) && (
        <div className="svc-row" style={{ marginTop: '-10px', paddingTop: '5px' }}>
          <label></label>
          <div className="svc-row-right">
            {quote.perVisitPrice <= calc.minimumChargePerVisit ? (
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

      {/* First Month Total – HIDE for oneTime, quarterly, biannual, annual, bimonthly */}
      {form.frequency !== "oneTime" && form.frequency !== "quarterly" && form.frequency !== "biannual" && form.frequency !== "annual" && form.frequency !== "bimonthly" && (
        <div className="svc-row svc-row-charge">
          <label>First Month Total</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                type="text"
                readOnly
                value={formatNumber(calc.firstMonthBillRated ?? 0)}
                style={{ backgroundColor: 'white', border: 'none', width: '100px' }}
                title={form.isFirstTimeInstall ? "First month including installation + service" : "First month (ongoing service only)"}
              />
            </div>
            {/* <span className="svc-small">{form.isFirstTimeInstall ? "(Install + Service)" : "(Service Only)"}</span> */}
          </div>
        </div>
      )}

      {/* Monthly Recurring – Show for weekly, biweekly, 2×/month, and monthly */}
      {(form.frequency === "weekly" || form.frequency === "biweekly" ||
        form.frequency === "twicePerMonth" || form.frequency === "monthly") && (
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
                readOnly
                step="0.01"
                value={getDisplayValue(
                  'customMonthlyRecurring',
                  form.customMonthlyRecurring !== undefined
                    ? form.customMonthlyRecurring
                    : calc.monthlyBillRated ?? 0
                )}
                onChange={handleLocalChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={{ backgroundColor: form.customMonthlyRecurring !== undefined ? '#fffacd' : 'white' }}
                title="Override monthly recurring calculation (clear to use auto-calculated value)"
              />
            </div>
          </div>
        </div>
      )}



      {/* First Visit Total – SHOW ONLY for oneTime, quarterly, biannual, annual, bimonthly */}
      {(form.frequency === "oneTime" || form.frequency === "quarterly" || form.frequency === "biannual" || form.frequency === "annual" || form.frequency === "bimonthly") && (
        <div className="svc-row svc-row-charge">
          <label>{form.frequency === "oneTime" ? "Total Price" : "First Visit Total"}</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                name="customFirstMonthTotal"
                type="number"
        min="0"
          min="0"
            min="0"
                step="0.01"
                value={getDisplayValue(
                  'customFirstMonthTotal',
                  form.customFirstMonthTotal !== undefined
                    ? form.customFirstMonthTotal
                    : (form.isFirstTimeInstall
                      ? calc.firstVisitTotalRated ?? 0
                      : calc.recurringPerVisitRated ?? 0)
                )}
                onChange={handleLocalChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={{ backgroundColor: form.customFirstMonthTotal !== undefined ? '#fffacd' : 'white' }}
                title={form.isFirstTimeInstall ? "First visit including installation + service" : "First visit (service only)"}
              />
            </div>
          </div>
        </div>
      )}

      {/* Annual Price (now: total for selected months) – HIDE for oneTime */}
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
              {/* Quarterly: multiples of 3 */}
              {form.frequency === "quarterly"
                ? Array.from({ length: 12 }, (_, i) => (i + 1) * 3).map((m) => (
                    <option key={m} value={m}>
                      {m} months
                    </option>
                  ))
                /* Bimonthly: even numbers */
                : form.frequency === "bimonthly"
                ? [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36].map((m) => (
                    <option key={m} value={m}>
                      {m} months
                    </option>
                  ))
                /* Biannual: multiples of 6 */
                : form.frequency === "biannual"
                ? [6, 12, 18, 24, 30, 36].map((m) => (
                    <option key={m} value={m}>
                      {m} months
                    </option>
                  ))
                /* Annual: multiples of 12 */
                : form.frequency === "annual"
                ? [12, 24, 36].map((m) => (
                    <option key={m} value={m}>
                      {m} months
                    </option>
                  ))
                /* All other frequencies: 2-36 months */
                : Array.from({ length: 35 }, (_, i) => i + 2).map((m) => (
                    <option key={m} value={m}>
                      {m} months
                    </option>
                  ))
              }
            </select>
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                name="customAnnualPrice"
                type="number"
                min="0"
                readOnly
                step="0.01"
                value={getDisplayValue(
                  'customAnnualPrice',
                  form.customAnnualPrice !== undefined ? form.customAnnualPrice : quote.annualPrice ?? 0
                )}
                onChange={handleLocalChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={{ backgroundColor: form.customAnnualPrice !== undefined ? '#fffacd' : 'white' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
