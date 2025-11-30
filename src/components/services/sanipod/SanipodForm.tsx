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
  const { form, onChange, calc } = useSanipodCalc(initialData);
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

  // Derive weekly line amounts from calc result
  const pods = Math.max(0, form.podQuantity || 0);
  const bags = Math.max(0, form.extraBagsPerWeek || 0);

  // Calculate the EFFECTIVE rate per pod being used
  const effectiveRatePerPod = pods > 0 ? calc.weeklyPodServiceRed / pods : 0;

  // For display: bag line amount (same base price, unit text depends on checkbox).
  const bagLineAmount = bags * form.extraBagPrice;
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
          />
          <span className="svc-multi">@</span>
          <input
            className="svc-in svc-in-small"
            type="text"
            readOnly
            value={pods > 0 ? effectiveRatePerPod.toFixed(2) : ''}
            style={{ backgroundColor: '#f5f5f5' }}
            title="Effective rate per pod (auto-calculated)"
          />
          <span className="svc-small">$/wk</span>
          <span className="svc-eq">=</span>
          <span className="svc-dollar">
            ${fmt(calc.weeklyPodServiceRed)}
          </span>
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
            value={form.extraBagPrice.toFixed(2)}
            onChange={onChange}
          />
          <span className="svc-small">{bagUnitLabel}</span>
          <span className="svc-eq">=</span>
          <span className="svc-dollar">
            ${fmt(bagLineAmount)}
          </span>
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
            value={form.installRatePerPod.toFixed(2)}
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
                value={form.installRatePerPod.toFixed(2)}
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
                  placeholder={calc.installCost.toFixed(2)}
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
          ${fmt(calc.perVisit)}
        </div>
      </div>

      <div className="svc-row svc-row-total">
        <label>First Month (Install + Service)</label>
        <div className="svc-dollar">
          ${fmt(calc.monthly)}
        </div>
      </div>

      <div className="svc-row svc-row-total">
        <label>
          Contract Total ({form.contractMonths} Months)
        </label>
        <div className="svc-dollar">
          ${fmt(calc.annual)}
        </div>
      </div>
    </div>
  );
};