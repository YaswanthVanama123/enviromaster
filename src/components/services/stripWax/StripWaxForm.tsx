// src/features/services/stripWax/StripWaxForm.tsx
import React, { useEffect, useRef, useState } from "react";
import { useStripWaxCalc } from "./useStripWaxCalc";
import type { StripWaxFormState } from "./stripWaxTypes";
import { stripWaxPricingConfig as cfg } from "./stripWaxConfig";
import type { ServiceInitialData } from "../common/serviceTypes";
import { useServicesContextOptional } from "../ServicesContext";
import { CustomFieldManager, type CustomField } from "../CustomFieldManager";

const fmt = (n: number): string => (n > 0 ? n.toFixed(2) : "0.00");

export const StripWaxForm: React.FC<
  ServiceInitialData<StripWaxFormState>
> = ({ initialData, onRemove }) => {
  const { form, onChange, calc } = useStripWaxCalc(initialData);
  const servicesContext = useServicesContextOptional();

  // Custom fields state - initialize with initialData if available
  const [customFields, setCustomFields] = useState<CustomField[]>(
    initialData?.customFields || []
  );
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  // Save form data to context for form submission
  const prevDataRef = useRef<string>("");

  useEffect(() => {
    if (servicesContext) {
      const isActive = (form.floorAreaSqFt ?? 0) > 0;

      const data = isActive ? {
        serviceId: "stripwax",
        displayName: "Strip & Wax",
        isActive: true,

        frequency: {
          label: "Frequency",
          type: "text" as const,
          value: typeof form.frequency === 'string'
            ? form.frequency.charAt(0).toUpperCase() + form.frequency.slice(1)
            : String(form.frequency || ''),
        },

        service: {
          label: "Floor Area",
          type: "calc" as const,
          qty: form.floorAreaSqFt,
          rate: form.ratePerSqFt,
          total: calc.perVisitPrice,
          unit: "sq ft",
        },

        totals: {
          perVisit: {
            label: "Per Visit Price",
            type: "dollar" as const,
            amount: calc.perVisitPrice,
          },
          annual: {
            label: "Annual Price",
            type: "dollar" as const,
            amount: calc.annualPrice,
          },
        },

        notes: form.notes || "",
        customFields: customFields,
      } : null;

      const dataStr = JSON.stringify(data);

      if (dataStr !== prevDataRef.current) {
        prevDataRef.current = dataStr;
        servicesContext.updateService("stripwax", data);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, calc, customFields]);

  const variantOptions = cfg.variants;

  return (
    <div className="svc-card">
      {/* Header */}
      <div className="svc-h-row">
        <div className="svc-h">STRIP &amp; WAX FLOOR</div>
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
            <option value="weekly">Weekly</option>
            <option value="biweekly">Bi-Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </div>

      {/* Floor area row */}
      <div className="svc-row">
        <label>Floor Area</label>
        <div className="svc-row-right">
          <input
            className="svc-in svc-in-small"
            type="number"
            min={0}
            step={1}
            name="floorAreaSqFt"
            value={form.floorAreaSqFt}
            onChange={onChange}
          />
          <span className="svc-multi">@</span>
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in svc-in-small"
              type="number"
              min={0}
              step={0.01}
              name="ratePerSqFt"
              value={form.ratePerSqFt}
              onChange={onChange}
              title="Rate per sq ft (from backend, editable)"
            />
          </div>
          <span className="svc-small">/sq ft</span>
          <span className="svc-eq">=</span>
          <span className="svc-dollar">
            ${fmt(calc.perVisit)}
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
              min={0}
              step={1}
              name="minCharge"
              value={form.minCharge}
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
            {Array.from({
              length:
                cfg.maxContractMonths - cfg.minContractMonths + 1,
            }).map((_, idx) => {
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
        <label>Per Visit Total</label>
        <div className="svc-dollar">
          ${fmt(calc.perVisit)}
        </div>
      </div>

      <div className="svc-row svc-row-total">
        <label>First Month Total</label>
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
