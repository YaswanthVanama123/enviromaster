// src/features/services/sanipod/SanipodForm.tsx
import React, { useEffect, useRef, useState, type ChangeEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSync, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { useSanipodCalc } from "./useSanipodCalc";
import type { SanipodFormState } from "./useSanipodCalc";
import { sanipodPricingConfig as cfg } from "./sanipodConfig";
import type { ServiceInitialData } from "../common/serviceTypes";
import { useServicesContextOptional } from "../ServicesContext";
import { CustomFieldManager, type CustomField } from "../CustomFieldManager";

const fmt = (n: number): string => (n > 0 ? n.toFixed(2) : "0.00");

export const SanipodForm: React.FC<ServiceInitialData<SanipodFormState>> = ({
  initialData,
  onRemove,
}) => {
  const { form, setForm, onChange, calc, refreshConfig, isLoadingConfig } = useSanipodCalc(initialData);
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

  // Calculate effective rate per pod for payload
  const effectiveRate = form.podQuantity > 0 && calc.monthlyTotal > 0
    ? calc.monthlyTotal / form.podQuantity
    : calc.effectiveRatePerPod || 0;

  // Determine if frequency is visit-based (not monthly billing)
  const isVisitBasedFrequency = form.frequency === "oneTime" || form.frequency === "quarterly" ||
    form.frequency === "biannual" || form.frequency === "annual" || form.frequency === "bimonthly";

  // Generate frequency-specific contract month options
  const generateContractMonths = () => {
    const months = [];

    if (form.frequency === "oneTime") {
      // For oneTime: no contract (handled separately in UI)
      return [];
    } else if (form.frequency === "bimonthly") {
      // For bi-monthly: show only even numbers (2, 4, 6, 8, ...)
      for (let i = 2; i <= cfg.maxContractMonths; i += 2) {
        months.push(i);
      }
    } else if (form.frequency === "quarterly") {
      // For quarterly: show only multiples of 3 (3, 6, 9, 12, ...)
      for (let i = 3; i <= cfg.maxContractMonths; i += 3) {
        months.push(i);
      }
    } else if (form.frequency === "biannual") {
      // For biannual: show only multiples of 6 (6, 12, 18, 24, 30, 36)
      for (let i = 6; i <= cfg.maxContractMonths; i += 6) {
        months.push(i);
      }
    } else if (form.frequency === "annual") {
      // For annual: show only multiples of 12 (12, 24, 36)
      for (let i = 12; i <= cfg.maxContractMonths; i += 12) {
        months.push(i);
      }
    } else {
      // For weekly, bi-weekly, twicePerMonth, monthly: show all months
      for (let i = cfg.minContractMonths; i <= cfg.maxContractMonths; i++) {
        months.push(i);
      }
    }

    return months;
  };

  const contractMonthOptions = generateContractMonths();

  useEffect(() => {
    if (servicesContext) {
      const isActive = (form.podQuantity ?? 0) > 0;

      const data = isActive ? {
        serviceId: "sanipod",
        displayName: "SaniPod",
        isActive: true,

        service: {
          isDisplay: true,
          label: "SaniPods",
          type: "calc" as const,
          qty: form.podQuantity,
          rate: effectiveRate,
          total: calc.perVisit,
        },

        // Extra bags (if any)
        ...(form.extraBagsPerWeek > 0 ? {
          extraBags: {
            isDisplay: true,
            label: form.extraBagsRecurring ? "Extra Bags (Weekly)" : "Extra Bags (One-time)",
            type: "calc" as const,
            qty: form.extraBagsPerWeek,
            rate: form.extraBagPrice,
            total: form.extraBagsPerWeek * form.extraBagPrice,
            recurring: form.extraBagsRecurring,
          },
        } : {}),

        // Installation (if new install)
        ...(form.isNewInstall && form.installQuantity > 0 ? {
          installation: {
            isDisplay: true,
            label: "Installation",
            type: "calc" as const,
            qty: form.installQuantity,
            rate: form.installRatePerPod,
            total: calc.installCost,
          },
        } : {}),

        totals: {
          perVisit: {
            isDisplay: true,
            label: "Per Visit Total",
            type: "dollar" as const,
            amount: calc.perVisit,
          },
          monthly: {
            isDisplay: true,
            label: "Monthly Total",
            type: "dollar" as const,
            amount: calc.monthly,
          },
          contract: {
            isDisplay: true,
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
        console.log('🔧 [SaniPod] Sending to context:', JSON.stringify(data, null, 2));
        servicesContext.updateService("sanipod", data);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, calc, customFields]);

  // Track previous values to detect actual changes (not just re-renders)
  const prevInputsRef = useRef({
    podQuantity: form.podQuantity,
    extraBagsPerWeek: form.extraBagsPerWeek,
    weeklyRatePerUnit: form.weeklyRatePerUnit,
    altWeeklyRatePerUnit: form.altWeeklyRatePerUnit,
    extraBagPrice: form.extraBagPrice,
    standaloneExtraWeeklyCharge: form.standaloneExtraWeeklyCharge,
    contractMonths: form.contractMonths,
    frequency: form.frequency,
    rateCategory: form.rateCategory,
    isStandalone: form.isStandalone,
    extraBagsRecurring: form.extraBagsRecurring,
  });

  // Clear custom totals when base inputs change
  useEffect(() => {
    const prev = prevInputsRef.current;
    const hasChanged =
      prev.podQuantity !== form.podQuantity ||
      prev.extraBagsPerWeek !== form.extraBagsPerWeek ||
      prev.weeklyRatePerUnit !== form.weeklyRatePerUnit ||
      prev.altWeeklyRatePerUnit !== form.altWeeklyRatePerUnit ||
      prev.extraBagPrice !== form.extraBagPrice ||
      prev.standaloneExtraWeeklyCharge !== form.standaloneExtraWeeklyCharge ||
      prev.contractMonths !== form.contractMonths ||
      prev.frequency !== form.frequency ||
      prev.rateCategory !== form.rateCategory ||
      prev.isStandalone !== form.isStandalone ||
      prev.extraBagsRecurring !== form.extraBagsRecurring;

    if (hasChanged) {
      setForm((prev) => ({
        ...prev,
        customWeeklyPodRate: undefined,
        customPodServiceTotal: undefined,
        customExtraBagsTotal: undefined,
        customPerVisitPrice: undefined,
        customMonthlyPrice: undefined,
        customAnnualPrice: undefined,
      }));

      prevInputsRef.current = {
        podQuantity: form.podQuantity,
        extraBagsPerWeek: form.extraBagsPerWeek,
        weeklyRatePerUnit: form.weeklyRatePerUnit,
        altWeeklyRatePerUnit: form.altWeeklyRatePerUnit,
        extraBagPrice: form.extraBagPrice,
        standaloneExtraWeeklyCharge: form.standaloneExtraWeeklyCharge,
        contractMonths: form.contractMonths,
        frequency: form.frequency,
        rateCategory: form.rateCategory,
        isStandalone: form.isStandalone,
        extraBagsRecurring: form.extraBagsRecurring,
      };
    }
  }, [
    form.podQuantity,
    form.extraBagsPerWeek,
    form.weeklyRatePerUnit,
    form.altWeeklyRatePerUnit,
    form.extraBagPrice,
    form.standaloneExtraWeeklyCharge,
    form.contractMonths,
    form.frequency,
    form.rateCategory,
    form.isStandalone,
    form.extraBagsRecurring,
    setForm,
  ]);

  // Track previous install values
  const prevInstallRef = useRef({
    isNewInstall: form.isNewInstall,
    installQuantity: form.installQuantity,
    installRatePerPod: form.installRatePerPod,
  });

  // Clear installation fee when install-related inputs change
  useEffect(() => {
    const prev = prevInstallRef.current;
    const hasChanged =
      prev.isNewInstall !== form.isNewInstall ||
      prev.installQuantity !== form.installQuantity ||
      prev.installRatePerPod !== form.installRatePerPod;

    if (hasChanged) {
      setForm((prev) => ({ ...prev, customInstallationFee: undefined }));

      prevInstallRef.current = {
        isNewInstall: form.isNewInstall,
        installQuantity: form.installQuantity,
        installRatePerPod: form.installRatePerPod,
      };
    }
  }, [form.isNewInstall, form.installQuantity, form.installRatePerPod, setForm]);

  // Track previous custom override values to clear dependent fields
  const prevCustomRef = useRef({
    customWeeklyPodRate: form.customWeeklyPodRate,
    customPodServiceTotal: form.customPodServiceTotal,
    customExtraBagsTotal: form.customExtraBagsTotal,
    customInstallationFee: form.customInstallationFee,
  });

  // Clear dependent custom totals when upstream custom fields change
  useEffect(() => {
    const prev = prevCustomRef.current;

    // If pod service rate or total changed, clear all downstream
    if (prev.customWeeklyPodRate !== form.customWeeklyPodRate ||
        prev.customPodServiceTotal !== form.customPodServiceTotal ||
        prev.customExtraBagsTotal !== form.customExtraBagsTotal ||
        prev.customInstallationFee !== form.customInstallationFee) {

      setForm((prevForm) => ({
        ...prevForm,
        customPerVisitPrice: undefined,
        customMonthlyPrice: undefined,
        customAnnualPrice: undefined,
      }));
    }

    prevCustomRef.current = {
      customWeeklyPodRate: form.customWeeklyPodRate,
      customPodServiceTotal: form.customPodServiceTotal,
      customExtraBagsTotal: form.customExtraBagsTotal,
      customInstallationFee: form.customInstallationFee,
    };
  }, [
    form.customWeeklyPodRate,
    form.customPodServiceTotal,
    form.customExtraBagsTotal,
    form.customInstallationFee,
    setForm,
  ]);

  // Derive weekly line amounts from calc result
  const pods = Math.max(0, form.podQuantity || 0);

  // For display: bag unit label
  const bagUnitLabel = form.extraBagsRecurring
    ? "$/bag/wk"
    : "$/bag one-time";

  // Decide the label that appears after "@"
  const ruleLabel = form.isStandalone
    ? (calc.chosenServiceRule === "perPod8" ? "8" : "3+40")
    : "8 (always)";

  return (
    <div className="svc-card">
      {/* Header row */}
      <div className="svc-h-row">
        <div className="svc-h">SANIPOD (STANDALONE ONLY)</div>
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

      {/* Frequency used only for per-visit view (kept same UI) */}
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

      {/* Standalone service checkbox */}
      <div className="svc-row">
        <label>Service Type</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="isStandalone"
            value={form.isStandalone ? "standalone" : "package"}
            onChange={(e) => {
              const event = {
                target: {
                  name: "isStandalone",
                  type: "checkbox",
                  checked: e.target.value === "standalone",
                  value: e.target.value === "standalone",
                }
              } as any;
              onChange(event);
            }}
          >
            <option value="standalone">Standalone (auto-switch: ${form.weeklyRatePerUnit.toFixed(2)} or ${form.altWeeklyRatePerUnit.toFixed(2)}+${form.standaloneExtraWeeklyCharge.toFixed(2)})</option>
            <option value="package">Part of Package (always ${form.weeklyRatePerUnit.toFixed(2)}/pod)</option>
          </select>
        </div>
      </div>

      {/* SaniPods line - single rate field that auto-switches */}
      <div className="svc-row">
        <label>SaniPods</label>
        <div className="svc-row-right">
          <input
            className="svc-in svc-in-small field-qty"
            type="number"
            min="0"
            name="podQuantity"
            value={form.podQuantity || ""}
            onChange={onChange}
            style={{width:"70px"}}
          />
          <span className="svc-multi">@</span>
          <input
            className="svc-in svc-in-small field-qty"
            type="number"
            min="0"
            step="0.01"
            name="customWeeklyPodRate"
            value={getDisplayValue(
              'customWeeklyPodRate',
              form.customWeeklyPodRate !== undefined
                ? form.customWeeklyPodRate
                : parseFloat(calc.effectiveRatePerPod.toFixed(2))
            )}
            onChange={handleLocalChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            title="Effective rate per pod (editable)"
            style={{ backgroundColor: form.customWeeklyPodRate !== undefined ? '#fffacd' : 'white', width: "70px"}}
          />
          <span className="svc-small">$/wk</span>
          <span className="svc-eq">=</span>
          <input
            className="svc-in svc-in-small field-qty"
            type="number"
            min="0"
            step="0.01"
            name="customPodServiceTotal"
            value={getDisplayValue(
              'customPodServiceTotal',
              form.customPodServiceTotal !== undefined
                ? form.customPodServiceTotal
                : parseFloat(calc.adjustedPodServiceTotal.toFixed(2))
            )}
            onChange={handleLocalChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={{
              backgroundColor: form.customPodServiceTotal !== undefined ? '#fffacd' : 'white',
              width: '70px'
            }}
          />
          <span className="svc-small" style={{ marginLeft: "8px" }}>
            (using {ruleLabel})
          </span>
        </div>
      </div>

      {/* Extra bags line with editable rate and recurring checkbox */}
      <div className="svc-row">
        <label>Extra Bags</label>
        <div className="svc-row-right">
          <input
            className="svc-in svc-in-small field-qty"
            type="number"
            min="0"
            name="extraBagsPerWeek"
            value={form.extraBagsPerWeek || ""}
            onChange={onChange}
          />
          <span className="svc-multi">@</span>
          <input
            className="svc-in svc-in-small field-qty"
            type="number"
            min="0"
            step="0.01"
            name="extraBagPrice"
            value={form.extraBagPrice || ""}
            onChange={onChange}
          />
          <span className="svc-small">{bagUnitLabel}</span>
          <span className="svc-eq">=</span>
          <input
            className="svc-in svc-in-small field-qty"
            type="number"
            min="0"
            step="0.01"
            name="customExtraBagsTotal"
            value={getDisplayValue(
              'customExtraBagsTotal',
              form.customExtraBagsTotal !== undefined
                ? form.customExtraBagsTotal
                : parseFloat(calc.adjustedBagsTotal.toFixed(2))
            )}
            onChange={handleLocalChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={{
              backgroundColor: form.customExtraBagsTotal !== undefined ? '#fffacd' : 'white',
              width: '80px'
            }}
          />
          <label className="svc-inline" style={{ marginLeft: "8px" }}>
            <input
              type="checkbox"
              name="extraBagsRecurring"
              checked={form.extraBagsRecurring}
              onChange={onChange}
            />{" "}
            <span className="svc-small">
              Recurring
            </span>
          </label>
        </div>
      </div>

      {/* Trip charge row (visible, but locked to 0 and ignored in pricing) */}
      {/* <div className="svc-row">
        <label>Trip Charge</label>
        <div className="svc-row-right">
          <input
            className="svc-in svc-in-small"
            type="number"
            min="0"
            step="0.01"
            name="tripChargePerVisit"
            value={form.tripChargePerVisit}
            disabled
            readOnly
          />
          <span className="svc-small">$/visit (not used)</span>
          <label className="svc-inline">
            <input
              type="checkbox"
              checked={false}
              disabled
            />{" "}
            Include
          </label>
        </div>
      </div> */}

      {/* Install toggle */}
      <div className="svc-row">
        <label>New Install?</label>
        <div className="svc-row-right">
          <input
            type="checkbox"
            name="isNewInstall"
            checked={form.isNewInstall}
            onChange={onChange}
          />{" "}
          <span className="svc-small">$</span>
          <input
            className="svc-in svc-in-small"
            type="number"
            min="0"
            step="0.01"
            name="installRatePerPod"
            value={form.installRatePerPod || ""}
            onChange={onChange}
            style={{ width: "60px" }}
          />
          <span className="svc-small"> / pod install</span>
        </div>
      </div>

      {/* Install details */}
      {form.isNewInstall && (
        <>
          <div className="svc-row">
            <label>Install Pods</label>
            <div className="svc-row-right">
              <input
                className="svc-in svc-in-small"
                type="number"
                min="0"
                name="installQuantity"
                value={form.installQuantity || ""}
                onChange={onChange}
              />
              <span className="svc-multi">@</span>
              <input
                className="svc-in svc-in-small"
                type="number"
                step="0.01"
                name="installRatePerPod"
                value={form.installRatePerPod || ""}
                onChange={onChange}
              />
              <span className="svc-small">$/pod install</span>
              <span className="svc-eq">=</span>
              <span className="svc-dollar">
                ${fmt(form.installQuantity * form.installRatePerPod)}
              </span>
            </div>
          </div>

          {/* Installation Total - Editable */}
          <div className="svc-row">
            <label>Installation Total</label>
            <div className="svc-row-right">
              <span className="svc-dollar">
                <span>$</span>
                <input
                  className="svc-in svc-in-small"
                  type="number"
                  min="0"
                  step="0.01"
                  name="customInstallationFee"
                  value={getDisplayValue(
                    'customInstallationFee',
                    form.customInstallationFee !== undefined
                      ? form.customInstallationFee
                      : parseFloat(calc.installCost.toFixed(2))
                  )}
                  onChange={handleLocalChange}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  style={{ backgroundColor: form.customInstallationFee !== undefined ? '#fffacd' : 'white' }}
                />
              </span>
            </div>
          </div>
        </>
      )}

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
        <label>
          {/* Dynamic label based on frequency */}
          {form.frequency === "bimonthly" ||
           form.frequency === "quarterly" ||
           form.frequency === "biannual" ||
           form.frequency === "annual"
            ? "Recurring Visit Total"
            : "Per Visit Service"}
        </label>
        <div className="svc-dollar">
          $<input
            className="svc-in svc-in-small"
            type="number"
            min="0"
            step="0.01"
            name="customPerVisitPrice"
            value={getDisplayValue(
              'customPerVisitPrice',
              form.customPerVisitPrice !== undefined
                ? form.customPerVisitPrice
                : parseFloat(calc.adjustedPerVisit.toFixed(2))
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
                    : "Per visit service - editable"}
          />
        </div>
      </div>

      {/* First Visit Total - for debugging partial installation */}
      {!isVisitBasedFrequency && (
        <div className="svc-row svc-row-total">
          <label>First Visit Total</label>
          <div className="svc-dollar">
            <span className="svc-dollar">
              ${parseFloat(calc.firstVisit.toFixed(2))}
            </span>
          </div>
        </div>
      )}

      {/* First Month Total - Hide for oneTime, quarterly, biannual, annual, bimonthly */}
      {!isVisitBasedFrequency && (
        <div className="svc-row svc-row-total">
          <label>First Month Total</label>
          <div className="svc-dollar">
            $<input
              className="svc-in svc-in-small"
              type="number"
              step="0.01"
              name="customMonthlyPrice"
              value={getDisplayValue(
                'customMonthlyPrice',
                form.customMonthlyPrice !== undefined
                  ? form.customMonthlyPrice
                  : parseFloat(calc.adjustedMonthly.toFixed(2))
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{
                backgroundColor: form.customMonthlyPrice !== undefined ? '#fffacd' : 'white',
                border: 'none',
                width: '100px'
              }}
            />
          </div>
        </div>
      )}

      {/* Total Price - Show ONLY for oneTime */}
      {form.frequency === "oneTime" && (
        <div className="svc-row svc-row-total">
          <label>Total Price</label>
          <div className="svc-dollar">
            $<input
              className="svc-in svc-in-small"
              type="number"
              step="0.01"
              name="customMonthlyPrice"
              value={getDisplayValue(
                'customMonthlyPrice',
                form.customMonthlyPrice !== undefined
                  ? form.customMonthlyPrice
                  : parseFloat(calc.adjustedMonthly.toFixed(2))
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{
                backgroundColor: form.customMonthlyPrice !== undefined ? '#fffacd' : 'white',
                border: 'none',
                width: '100px'
              }}
            />
          </div>
        </div>
      )}

      {/* First Visit Total for visit-based (not oneTime) */}
      {isVisitBasedFrequency && form.frequency !== "oneTime" && (
        <div className="svc-row svc-row-total">
          <label>First Visit Total</label>
          <div className="svc-dollar">
            $<input
              className="svc-in svc-in-small"
              type="number"
              step="0.01"
              name="customMonthlyPrice"
              value={getDisplayValue(
                'customMonthlyPrice',
                form.customMonthlyPrice !== undefined
                  ? form.customMonthlyPrice
                  : parseFloat(calc.adjustedMonthly.toFixed(2))
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{
                backgroundColor: form.customMonthlyPrice !== undefined ? '#fffacd' : 'white',
                border: 'none',
                width: '100px'
              }}
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
              className="svc-in svc-in-small"
              type="text"
              readOnly
              value={calc.ongoingMonthly.toFixed(2)}
              style={{
                backgroundColor: '#f5f5f5',
                border: 'none',
                width: '100px'
              }}
            />
          </div>
        </div>
      )}

      {/* Contract Total - Hide for oneTime */}
      {form.frequency !== "oneTime" && (
        <div className="svc-row svc-row-total">
          <label>Contract Total</label>
          <div className="svc-row-right">
            <select
              className="svc-in"
              name="contractMonths"
              value={form.contractMonths}
              onChange={onChange}
            >
              {contractMonthOptions.map((m) => (
                <option key={m} value={m}>
                  {m} months
                </option>
              ))}
            </select>
            <div className="svc-dollar">
              $<input
                className="svc-in svc-in-small"
                type="number"
                step="0.01"
                name="customAnnualPrice"
                value={getDisplayValue(
                  'customAnnualPrice',
                  form.customAnnualPrice !== undefined
                    ? form.customAnnualPrice
                    : parseFloat(calc.adjustedAnnual.toFixed(2))
                )}
                onChange={handleLocalChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={{
                  backgroundColor: form.customAnnualPrice !== undefined ? '#fffacd' : 'white',
                  border: 'none',
                  width: '100px'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};