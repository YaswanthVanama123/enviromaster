// src/features/services/sanipod/SanipodForm.tsx
import React, { useEffect, useRef, useState } from "react";
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
  const { form, setForm, onChange, calc } = useSanipodCalc(initialData);
  const servicesContext = useServicesContextOptional();

  // Custom fields state
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  // Save form data to context for form submission
  const prevDataRef = useRef<string>("");

  useEffect(() => {
    if (servicesContext) {
      const isActive = (form.podQuantity ?? 0) > 0;
      const data = isActive ? { ...form, ...calc, isActive, customFields } : null;
      const dataStr = JSON.stringify(data);
 
      if (dataStr !== prevDataRef.current) {
        prevDataRef.current = dataStr;
        servicesContext.updateService("sanipod", data);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, calc, customFields]);

  // Handler to reset custom values to undefined if left empty
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    if (e.target.value === '' || e.target.value === null) {
      setForm((prev) => ({ ...prev, [name]: undefined }));
    }
  };

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

      {/* Frequency used only for per-visit view (kept same UI) */}
      <div className="svc-row">
        <label>Frequency (for per-visit view)</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="frequency"
            value={form.frequency}
            onChange={onChange}
          >
            <option value="weekly">Weekly</option>
            <option value="biweekly">Bi-Weekly</option>
            <option value="monthly">Monthly</option>
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
            <option value="standalone">Standalone (auto-switch: $8 or $3+$40)</option>
            <option value="package">Part of Package (always $8/pod)</option>
          </select>
        </div>
      </div>

      {/* SaniPods line - single rate field that auto-switches */}
      <div className="svc-row">
        <label>No. of SaniPods</label>
        <div className="svc-row-right">
          <input
            className="svc-in svc-in-small"
            type="number"
            min={0}
            name="podQuantity"
            value={form.podQuantity}
            onChange={onChange}
            style={{width:"70px"}}
          />
          <span className="svc-multi">@</span>
          <input
            className="svc-in svc-in-small"
            type="number"
            step="0.01"
            name="customWeeklyPodRate"
            value={
              form.customWeeklyPodRate !== undefined
                ? form.customWeeklyPodRate
                : calc.effectiveRatePerPod
            }
            onChange={onChange}
            onBlur={handleBlur}
            title="Effective rate per pod (editable)"
            style={{ backgroundColor: form.customWeeklyPodRate !== undefined ? '#fffacd' : 'white', width: "70px"}}
          />
          <span className="svc-small">$/wk</span>
          <span className="svc-eq">=</span>
          <input
            className="svc-in svc-in-small"
            type="number"
            step="0.01"
            name="customPodServiceTotal"
            value={
              form.customPodServiceTotal !== undefined
                ? form.customPodServiceTotal
                : calc.adjustedPodServiceTotal
            }
            onChange={onChange}
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
            className="svc-in svc-in-small"
            type="number"
            min={0}
            name="extraBagsPerWeek"
            value={form.extraBagsPerWeek}
            onChange={onChange}
          />
          <span className="svc-multi">@</span>
          <input
            className="svc-in svc-in-small"
            type="number"
            step="0.01"
            name="extraBagPrice"
            value={form.extraBagPrice}
            onChange={onChange}
          />
          <span className="svc-small">{bagUnitLabel}</span>
          <span className="svc-eq">=</span>
          <input
            className="svc-in svc-in-small"
            type="number"
            step="0.01"
            name="customExtraBagsTotal"
            value={
              form.customExtraBagsTotal !== undefined
                ? form.customExtraBagsTotal
                : calc.adjustedBagsTotal
            }
            onChange={onChange}
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
              Recurring each visit
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
            step="0.01"
            name="installRatePerPod"
            value={form.installRatePerPod}
            onChange={onChange}
            style={{ width: "60px" }}
          />
          <span className="svc-small"> / pod (one-time install)</span>
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
                min={0}
                name="installQuantity"
                value={form.installQuantity}
                onChange={onChange}
              />
              <span className="svc-multi">@</span>
              <input
                className="svc-in svc-in-small"
                type="number"
                step="0.01"
                name="installRatePerPod"
                value={form.installRatePerPod}
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
            <label>Installation Total (Editable)</label>
            <div className="svc-row-right">
              <span className="svc-dollar">
                <span>$</span>
                <input
                  className="svc-in svc-in-small"
                  type="number"
                  step="0.01"
                  name="customInstallationFee"
                  value={
                    form.customInstallationFee !== undefined
                      ? form.customInstallationFee
                      : calc.installCost
                  }
                  onChange={onChange}
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

      {/* Contract length (2–36 months) */}
      <div className="svc-row">
        <label>Contract Length (Months)</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="contractMonths"
            value={form.contractMonths}
            onChange={onChange}
          >
            {Array.from({ length: cfg.maxContractMonths - cfg.minContractMonths + 1 })
              .map((_, idx) => {
                const m = cfg.minContractMonths + idx;
                return (
                  <option key={m} value={m}>
                    {m}
                  </option>
                );
              })}
          </select>
        </div>
      </div>

      {/* Totals */}
      <div className="svc-row svc-row-total">
        <label>Per Visit (Service Only)</label>
        <div className="svc-dollar">
          $<input
            className="svc-in svc-in-small"
            type="number"
            step="0.01"
            name="customPerVisitPrice"
            value={form.customPerVisitPrice !== undefined ? form.customPerVisitPrice : calc.adjustedPerVisit}
            onChange={onChange}
            onBlur={handleBlur}
            style={{
              backgroundColor: form.customPerVisitPrice !== undefined ? '#fffacd' : 'white',
              border: 'none',
              width: '100px'
            }}
          />
        </div>
      </div>

      <div className="svc-row svc-row-total">
        <label>First Month (Install + Service)</label>
        <div className="svc-dollar">
          $<input
            className="svc-in svc-in-small"
            type="number"
            step="0.01"
            name="customMonthlyPrice"
            value={form.customMonthlyPrice !== undefined ? form.customMonthlyPrice : calc.adjustedMonthly}
            onChange={onChange}
            onBlur={handleBlur}
            style={{
              backgroundColor: form.customMonthlyPrice !== undefined ? '#fffacd' : 'white',
              border: 'none',
              width: '100px'
            }}
          />
        </div>
      </div>

      <div className="svc-row svc-row-total">
        <label>
          Contract Total ({form.contractMonths} Months)
        </label>
        <div className="svc-dollar">
          $<input
            className="svc-in svc-in-small"
            type="number"
            step="0.01"
            name="customAnnualPrice"
            value={form.customAnnualPrice !== undefined ? form.customAnnualPrice : calc.adjustedAnnual}
            onChange={onChange}
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
  );
};