// src/features/services/stripWax/StripWaxForm.tsx
import React, { useEffect, useRef } from "react";
import { useStripWaxCalc } from "./useStripWaxCalc";
import type { StripWaxFormState } from "./useStripWaxCalc";
import { stripWaxPricingConfig as cfg } from "./stripWaxConfig";
import type { ServiceInitialData } from "../common/serviceTypes";
import { useServicesContextOptional } from "../ServicesContext";

const fmt = (n: number): string => (n > 0 ? n.toFixed(2) : "0.00");

export const StripWaxForm: React.FC<
  ServiceInitialData<StripWaxFormState>
> = ({ initialData }) => {
  const { form, onChange, calc } = useStripWaxCalc(initialData);
  const servicesContext = useServicesContextOptional();

  // Save form data to context for form submission
  const prevDataRef = useRef<string>("");

  useEffect(() => {
    if (servicesContext) {
      const isActive = (form.sqft ?? 0) > 0;
      const data = isActive ? { ...form, ...calc, isActive } : null;
      const dataStr = JSON.stringify(data);

      if (dataStr !== prevDataRef.current) {
        prevDataRef.current = dataStr;
        servicesContext.updateService("stripwax", data);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, calc]);

  const variantOptions = cfg.variants;

  return (
    <div className="svc-card">
      {/* Header */}
      <div className="svc-h-row">
        <div className="svc-h">STRIP &amp; WAX FLOOR</div>
      </div>

      {/* Frequency row (for per-visit view label only) */}
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

      {/* Floor area row */}
      <div className="svc-row">
        <label>Floor Area (sq ft)</label>
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
          <input
            className="svc-in svc-in-small"
            type="number"
            min={0}
            step={0.01}
            name="ratePerSqFt"
            value={form.ratePerSqFt}
            onChange={onChange}
          />
          <span className="svc-small">$/sq ft</span>
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
          <input
            className="svc-in svc-in-small"
            type="number"
            min={0}
            step={1}
            name="minCharge"
            value={form.minCharge}
            onChange={onChange}
          />
          <span className="svc-small">$/visit minimum</span>
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
