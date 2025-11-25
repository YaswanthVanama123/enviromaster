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

      {/* Scheduling Mode */}
      <div className="svc-row">
        <label>Scheduling Mode</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="schedulingMode"
            value={form.schedulingMode}
            onChange={onChange}
          >
            <option value="normalRoute">
              Normal Route (tiered pricing, with route services)
            </option>
            <option value="standalone">
              Standalone/Short Job ($50/hr)
            </option>
          </select>
        </div>
      </div>

      {/* Is Addon toggle (only for normal route and small jobs) */}
      {form.schedulingMode === "normalRoute" && calc.totalHours < 0.5 && (
        <div className="svc-row">
          <label>Service Type</label>
          <div className="svc-row-right">
            <label className="svc-inline">
              <input
                type="checkbox"
                name="isAddonToLargerService"
                checked={form.isAddonToLargerService}
                onChange={onChange}
              />
              <span className="svc-small">
                Part of larger service package (allows addon-only pricing)
              </span>
            </label>
          </div>
        </div>
      )}

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
            <option value="weekly">Weekly</option>
            <option value="biweekly">Bi-Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly (3× multiplier for dusting)</option>
          </select>
        </div>
      </div>

      {/* TASK-SPECIFIC INPUTS */}
      <div className="svc-row">
        <label style={{ fontWeight: 700, fontSize: "15px" }}>
          Task-Specific Inputs
        </label>
      </div>

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
            value={form.vacuumingHours}
            onChange={onChange}
            placeholder="1"
          />
          <span className="svc-small">
            Default: 1 hr (unless huge job)
          </span>
        </div>
      </div>

      {/* Dusting */}
      <div className="svc-row">
        <label>Dusting (# of places)</label>
        <div className="svc-row-right">
          <input
            className="svc-in svc-in-small"
            type="number"
            min={0}
            step={1}
            name="dustingPlaces"
            value={form.dustingPlaces}
            onChange={onChange}
            placeholder="30"
          />
          <span className="svc-small">
            ~30 places/hr @ $1 each
            {(form.dirtyInitial || form.frequency === "quarterly") &&
              " (×3 for dirty/infrequent)"}
          </span>
        </div>
      </div>

      {/* Manual hours for other tasks */}
      <div className="svc-row">
        <label>Other Tasks (hours)</label>
        <div className="svc-row-right">
          <input
            className="svc-in svc-in-small"
            type="number"
            min={0}
            step={0.25}
            name="manualHours"
            value={form.manualHours}
            onChange={onChange}
          />
          <span className="svc-small">
            Additional manual hours
          </span>
        </div>
      </div>

      {/* Total hours display */}
      <div className="svc-row">
        <label>Total Hours (Calculated)</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="text"
            readOnly
            value={fmt(calc.totalHours) + " hrs"}
          />
          <span className="svc-small">
            {calc.breakdown.manualHours > 0 && `Manual: ${fmt(calc.breakdown.manualHours)} `}
            {calc.breakdown.vacuumingHours > 0 && `Vacuum: ${fmt(calc.breakdown.vacuumingHours)} `}
            {calc.breakdown.dustingHours > 0 && `Dust: ${fmt(calc.breakdown.dustingHours)}`}
          </span>
        </div>
      </div>

      {/* Pricing mode indicator */}
      <div className="svc-row">
        <label>Pricing Mode</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="text"
            readOnly
            value={calc.breakdown.pricingMode}
          />
        </div>
      </div>

      {/* Show tiered pricing table for reference */}
      {form.schedulingMode === "normalRoute" && calc.totalHours < 4 && (
        <div className="svc-row">
          <label>Tiered Pricing Guide</label>
          <div className="svc-row-right">
            <span className="svc-small">
              0-15min: $10 (addon) | 15-30min: $20 (addon)/$35 (standalone) |
              0.5-1hr: $50 | 1-2hr: $80 | 2-3hr: $100 | 3-4hr: $120 | 4+hr: $30/hr
            </span>
          </div>
        </div>
      )}

      {/* Dirty initial clean (3×) */}
      <div className="svc-row">
        <label>Initial Clean</label>
        <div className="svc-row-right">
          <label className="svc-inline">
            <input
              type="checkbox"
              name="dirtyInitial"
              checked={form.dirtyInitial}
              onChange={onChange}
            />
            <span className="svc-small">
              Dirty initial clean – first visit at {cfg.dirtyInitialMultiplier}×
              (also affects dusting hours)
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
            <option value="redRate">Red Rate (base, 20% commission)</option>
            <option value="greenRate">Green Rate (+30%, 25% commission)</option>
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

      {/* TOTALS */}
      <div className="svc-row svc-row-charge">
        <label>Per Visit (Service Only)</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="text"
              readOnly
              value={fmt(calc.perVisit)}
            />
          </div>
        </div>
      </div>

      {form.dirtyInitial && calc.firstVisit !== calc.perVisit && (
        <div className="svc-row svc-row-charge">
          <label>First Visit (3× Dirty Initial)</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                type="text"
                readOnly
                value={fmt(calc.firstVisit)}
              />
            </div>
          </div>
        </div>
      )}

      <div className="svc-row svc-row-charge">
        <label>First Month Total</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="text"
              readOnly
              value={fmt(calc.monthly)}
            />
          </div>
          <span className="svc-small">
            (4.33 visits/month)
          </span>
        </div>
      </div>

      <div className="svc-row svc-row-charge">
        <label>Ongoing Monthly</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="text"
              readOnly
              value={fmt(calc.ongoingMonthly)}
            />
          </div>
        </div>
      </div>

      <div className="svc-row svc-row-charge">
        <label>
          Contract Total ({form.contractMonths} Months)
        </label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="text"
              readOnly
              value={fmt(calc.annual)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
