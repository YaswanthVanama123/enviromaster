// src/features/services/janitorial/JanitorialForm.tsx
import React, { useEffect, useRef, useState } from "react";
import { useJanitorialCalc } from "./useJanitorialCalc";
import type { JanitorialFormState } from "./useJanitorialCalc";
import { janitorialPricingConfig as cfg } from "./janitorialConfig";
import type { ServiceInitialData } from "../common/serviceTypes";
import { useServicesContextOptional } from "../ServicesContext";
import { CustomFieldManager, type CustomField } from "../CustomFieldManager";

const fmt = (n: number): string => (n > 0 ? n.toFixed(2) : "0.00");

export const JanitorialForm: React.FC<
  ServiceInitialData<JanitorialFormState>
> = ({ initialData }) => {
  const { form, onChange, calc } = useJanitorialCalc(initialData);
  const servicesContext = useServicesContextOptional();

  // Custom fields state
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  // Save form data to context for form submission
  const prevDataRef = useRef<string>("");

  useEffect(() => {
    if (servicesContext) {
      const isActive = (form.hours ?? 0) > 0;
      const data = isActive ? { ...form, ...calc, isActive } : null;
      const dataStr = JSON.stringify(data);

      if (dataStr !== prevDataRef.current) {
        prevDataRef.current = dataStr;
        servicesContext.updateService("janitorial", data);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, calc]);

  return (
    <div className="svc-card">
      {/* Header */}
      <div className="svc-h-row">
        <div className="svc-h">PURE JANITORIAL ADD-ONS</div>
      </div>

      {/* Custom fields manager - appears at the top */}
      <CustomFieldManager
        fields={customFields}
        onFieldsChange={setCustomFields}
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
            <option value="quarterly">
              Quarterly (dusting 3× time on recurring visits; first visit
              dusting covered by install)
            </option>
          </select>
        </div>
      </div>

      {/* TASK-SPECIFIC INPUTS */}
      <div className="svc-h-row svc-h-row-sub">
        <div className="svc-h-sub">Task-Specific Inputs</div>
      </div>

      {/* Scheduling mode */}
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
              Normal Route (bundled with other services, $30/hr, 4 hr min)
            </option>
            <option value="standalone">
              Standalone / Short Job ($50/hr)
            </option>
          </select>
        </div>
      </div>

      {/* Is Addon toggle (kept for info) */}
      {form.schedulingMode === "normalRoute" && (
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
                This is an add-on to a larger route service (SaniClean, RPM,
                etc.)
              </span>
            </label>
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
            value={form.vacuumingHours}
            onChange={onChange}
            placeholder={cfg.vacuumingDefaultHours.toString()}
          />
          <span className="svc-small">
            hr
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
            ~30 places/hr @ ${cfg.dustingPricePerPlace.toFixed(2)}.
            {form.dirtyInitial &&
              " – Dirty initial: first visit dusting at 3× time (non-quarterly)."}
            {form.frequency === "quarterly" &&
              " – Quarterly: from 2nd visit onwards dusting is 3× time each visit; first visit dusting is included in the main installation fee."}
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
            Extra sweeping, spot mopping, small wipe-downs, etc.
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
              Dirty initial clean – first visit dusting at{" "}
              {cfg.dirtyInitialMultiplier}× time (non-quarterly only). Ongoing
              visits use normal dusting hours; quarterly already uses 3× time on
              recurring visits with first visit dusting covered by install.
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
            <option value="greenRate">
              Green Rate (+30%, 25% commission)
            </option>
          </select>
        </div>
      </div>

      {/* Contract length (2–36 months) */}
      <div className="svc-row">
        <label>Contract Length (Months)</label>
        <div className="svc-row-right">
          <input
            className="svc-in svc-in-small"
            type="number"
            min={cfg.minContractMonths}
            max={cfg.maxContractMonths}
            name="contractMonths"
            value={form.contractMonths}
            onChange={onChange}
          />
        </div>
      </div>

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

      {/* First visit */}
      <div className="svc-row svc-row-charge">
        <label>First Visit Total</label>
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

      {/* First month total */}
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
            Based on 4.33 visits/month equivalent (weekly-style rollup).
          </span>
        </div>
      </div>

      {/* Ongoing monthly */}
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

      {/* Contract total */}
      <div className="svc-row svc-row-charge">
        <label>Contract Total</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="text"
              readOnly
              value={fmt(calc.contractTotal)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
