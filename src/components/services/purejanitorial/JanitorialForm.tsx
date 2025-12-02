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
> = ({ initialData, onRemove }) => {
  const { form, onChange, calc } = useJanitorialCalc(initialData);
  const servicesContext = useServicesContextOptional();

  // Custom fields state
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  // Save form data to context for form submission
  const prevDataRef = useRef<string>("");

  useEffect(() => {
    if (servicesContext) {
      const isActive = (form.manualHours ?? 0) > 0 || (form.vacuumingHours ?? 0) > 0 || (form.dustingPlaces ?? 0) > 0;

      const data = isActive ? {
        serviceId: "janitorial",
        displayName: "Pure Janitorial",
        isActive: true,

        frequency: {
          label: "Frequency",
          type: "text" as const,
          value: typeof form.frequency === 'string'
            ? form.frequency.charAt(0).toUpperCase() + form.frequency.slice(1)
            : String(form.frequency || ''),
        },

        schedulingMode: {
          label: "Scheduling Mode",
          type: "text" as const,
          value: form.schedulingMode === "normalRoute" ? "Normal Route" : "Service Type",
        },

        service: {
          label: "Service",
          type: "calc" as const,
          qty: calc.totalHours,
          rate: form.schedulingMode === "normalRoute" ? form.baseHourlyRate : form.shortJobHourlyRate,
          total: calc.perVisit,
          unit: "hours",
        },

        ...(form.vacuumingHours > 0 ? {
          vacuuming: {
            label: "Vacuuming",
            type: "text" as const,
            value: `${form.vacuumingHours} hours`,
          },
        } : {}),

        ...(form.dustingPlaces > 0 ? {
          dusting: {
            label: "Dusting",
            type: "text" as const,
            value: `${form.dustingPlaces} places`,
          },
        } : {}),

        totals: {
          weekly: {
            label: "Weekly Total",
            type: "dollar" as const,
            amount: calc.perVisit,
          },
          monthly: {
            label: "Monthly Total",
            type: "dollar" as const,
            amount: calc.monthly,
          },
          contract: {
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
        servicesContext.updateService("janitorial", data);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, calc, customFields]);

  return (
    <div className="svc-card">
      {/* Header */}
      <div className="svc-h-row">
        <div className="svc-h">PURE JANITORIAL ADD-ONS</div>
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

      {/* Scheduling mode with editable rates inline */}
      <div className="svc-row">
        <label>Scheduling Mode</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="schedulingMode"
            value={form.schedulingMode}
            onChange={onChange}
          >
            <option value="normalRoute">Normal Route</option>
            <option value="standalone">Standalone / Short Job</option>
          </select>
        </div>
      </div>

      {/* Normal Route Pricing - shown when normalRoute selected */}
      {form.schedulingMode === "normalRoute" && (
        <div className="svc-row">
          <label>Normal Route Pricing</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in svc-in-small"
                type="number"
                min={0}
                step={0.01}
                name="baseHourlyRate"
                value={form.baseHourlyRate}
                onChange={onChange}
                title="Base hourly rate (from backend)"
              />
            </div>
            <span className="svc-small">/hr, min</span>
            <input
              className="svc-in svc-in-small"
              type="number"
              min={0}
              step={0.25}
              name="minHoursPerVisit"
              value={form.minHoursPerVisit}
              onChange={onChange}
              title="Minimum hours per visit (from backend)"
            />
            <span className="svc-small">hrs (=${(form.minHoursPerVisit * form.baseHourlyRate).toFixed(2)} min)</span>
          </div>
        </div>
      )}

      {/* Standalone Pricing - shown when standalone selected */}
      {form.schedulingMode === "standalone" && (
        <div className="svc-row">
          <label>Standalone Pricing</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in svc-in-small"
                type="number"
                min={0}
                step={0.01}
                name="shortJobHourlyRate"
                value={form.shortJobHourlyRate}
                onChange={onChange}
                title="Standalone hourly rate (from backend)"
              />
            </div>
            <span className="svc-small">/hr</span>
          </div>
        </div>
      )}

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
              {/* <span className="svc-small">
                This is an add-on to a larger route service (SaniClean, RPM,
                etc.)
              </span> */}
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
          <span className="svc-small">places @ </span>
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in svc-in-small"
              type="number"
              min={0}
              step={0.01}
              name="dustingPricePerPlace"
              value={form.dustingPricePerPlace}
              onChange={onChange}
              title="Price per dusting place (from backend)"
            />
          </div>
          <span className="svc-small">
            /place (~{form.dustingPlacesPerHour} places/hr).
            {/* {form.dirtyInitial &&
              " – Dirty initial: first visit dusting at 3× time (non-quarterly)."}
            {form.frequency === "quarterly" &&
              " – Quarterly: from 2nd visit onwards dusting is 3× time each visit; first visit dusting is included in the main installation fee."} */}
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
            {/* <span className="svc-small">
              Dirty initial clean – first visit dusting at{" "}
              {cfg.dirtyInitialMultiplier}× time (non-quarterly only). Ongoing
              visits use normal dusting hours; quarterly already uses 3× time on
              recurring visits with first visit dusting covered by install.
            </span> */}
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
