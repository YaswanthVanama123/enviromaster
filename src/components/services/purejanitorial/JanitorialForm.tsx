// src/features/services/janitorial/JanitorialForm.tsx
import React from "react";
import { useJanitorialCalc } from "./useJanitorialCalc";
import type { JanitorialFormState } from "./useJanitorialCalc";
import { janitorialPricingConfig as cfg } from "./janitorialConfig";
import type { ServiceInitialData } from "../common/serviceTypes";

const fmt = (n: number): string => (n > 0 ? n.toFixed(2) : "0.00");

export const JanitorialForm: React.FC<
  ServiceInitialData<JanitorialFormState>
> = ({ initialData }) => {
  const { form, onChange, calc } = useJanitorialCalc(initialData);

  return (
    <div className="svc-card">
      {/* Header */}
      <div className="svc-h-row">
        <div className="svc-h">PURE JANITORIAL ADD-ONS</div>
      </div>

      {/* Frequency row (for per-visit view label only, same as others) */}
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

      {/* Hours line */}
      <div className="svc-row">
        <label>Hours of Extra Service</label>
        <div className="svc-row-right">
          <input
            className="svc-in svc-in-small"
            type="number"
            min={0}
            step={0.25}
            name="hoursPerVisit"
            value={form.hoursPerVisit}
            onChange={onChange}
          />
          <span className="svc-multi">@</span>
          <input
            className="svc-in svc-in-small"
            type="number"
            min={0}
            step={1}
            name="hourlyRate"
            value={form.hourlyRate}
            onChange={onChange}
          />
          <span className="svc-small">$/hr</span>
          <span className="svc-eq">=</span>
          <span className="svc-dollar">
            ${fmt(calc.perVisit)}
          </span>
        </div>
      </div>

      {/* Minimum hours toggle + note about billed hours */}
      <div className="svc-row">
        <label>Minimum Hours</label>
        <div className="svc-row-right">
          <label className="svc-inline">
            <input
              type="checkbox"
              name="enforceMinHours"
              checked={form.enforceMinHours}
              onChange={onChange}
            />{" "}
            <span className="svc-small">
              Enforce {cfg.minHoursPerVisit} hr minimum (bills{" "}
              {calc.billableHours.toFixed(2)} hrs)
            </span>
          </label>
        </div>
      </div>

      {/* Dirty initial clean (3x) */}
      <div className="svc-row">
        <label>Initial Clean</label>
        <div className="svc-row-right">
          <label className="svc-inline">
            <input
              type="checkbox"
              name="dirtyInitial"
              checked={form.dirtyInitial}
              onChange={onChange}
            />{" "}
            <span className="svc-small">
              Dirty initial clean – first visit at {cfg.dirtyInitialMultiplier}
              x
            </span>
          </label>
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
              length: cfg.maxContractMonths - cfg.minContractMonths + 1,
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
