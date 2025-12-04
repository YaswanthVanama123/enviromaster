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

        serviceType: {
          label: "Service Type",
          type: "text" as const,
          value: form.serviceType === "recurring" ? "Recurring Service" : "One-Time Service",
        },

        service: {
          label: "Service",
          type: "calc" as const,
          qty: calc.totalHours,
          rate: form.serviceType === "recurring" ? form.baseHourlyRate : form.shortJobHourlyRate,
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

        ...(form.addonTimeMinutes > 0 ? {
          addonTime: {
            label: "Add-on Time",
            type: "text" as const,
            value: `${form.addonTimeMinutes} minutes`,
          },
        } : {}),

        ...(form.serviceType === "recurring" && form.installation ? {
          installation: {
            label: "Installation",
            type: "text" as const,
            value: "Included",
          },
        } : {}),

        totals: form.serviceType === "recurring" ? {
          perVisit: {
            label: "Per Visit Total",
            type: "dollar" as const,
            amount: calc.perVisit,
          },
          contract: {
            label: "Contract Total",
            type: "dollar" as const,
            months: form.contractMonths,
            amount: calc.contractTotal,
          },
        } : {
          oneTime: {
            label: "One-Time Service Total",
            type: "dollar" as const,
            amount: calc.perVisit,
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

      {/* Service Type: Recurring or One-Time */}
      <div className="svc-row">
        <label>Service Type</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="serviceType"
            value={form.serviceType}
            onChange={onChange}
          >
            <option value="recurring">Recurring Service (${form.baseHourlyRate}/hr)</option>
            <option value="oneTime">One-Time Service (${form.shortJobHourlyRate}/hr)</option>
          </select>
        </div>
      </div>

      {/* TASK-SPECIFIC INPUTS */}
      <div className="svc-h-row svc-h-row-sub">
        <div className="svc-h-sub">Task-Specific Inputs</div>
      </div>

      {/* One-Time Service Pricing - Show rate for one-time */}
      {form.serviceType === "oneTime" && (
        <div className="svc-row">
          <label>One-Time Service Rate</label>
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
                title="One-time service hourly rate (from backend)"
              />
            </div>
            <span className="svc-small">/hr (min {form.minHoursPerVisit} hours = ${(form.minHoursPerVisit * form.shortJobHourlyRate).toFixed(0)} minimum)</span>
          </div>
        </div>
      )}

      {/* Recurring Service Pricing - Show rate for recurring */}
      {form.serviceType === "recurring" && (
        <div className="svc-row">
          <label>Recurring Service Rate</label>
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
                title="Recurring service hourly rate (from backend)"
              />
            </div>
            <span className="svc-small">/hr (min {form.minHoursPerVisit} hours = ${(form.minHoursPerVisit * form.baseHourlyRate).toFixed(0)} minimum)</span>
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

      {/* Installation checkbox - Only for recurring */}
      {form.serviceType === "recurring" && (
        <div className="svc-row">
          <label>Installation</label>
          <div className="svc-row-right">
            <label className="svc-inline">
              <input
                type="checkbox"
                name="installation"
                checked={form.installation}
                onChange={onChange}
              />
              <span className="svc-small">Include installation/setup</span>
            </label>
          </div>
        </div>
      )}

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

      {/* Other Tasks (hours) */}
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

      {/* Add-on Time (minutes) - For BOTH recurring and one-time */}
      <div className="svc-row">
        <label>Add-on Time (minutes)</label>
        <div className="svc-row-right">
          <input
            className="svc-in svc-in-small"
            type="number"
            min={0}
            step={1}
            name="addonTimeMinutes"
            value={form.addonTimeMinutes}
            onChange={onChange}
            placeholder="0"
          />
          <span className="svc-small">
            mins (Table: 0-15min=$10, 15-30min=$20, 30-60min=$50, 1-2hr=$80, 2-3hr=$100, 3-4hr=$120, 4+hr=$30/hr)
          </span>
        </div>
      </div>

      {/* Contract length - Only show for recurring services */}
      {form.serviceType === "recurring" && (
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
      )}

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
        <label>
          {form.serviceType === "oneTime" ? "One-Time Service Price" : "Per Visit Total"}
        </label>
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

      {/* Contract total - Only show for recurring */}
      {form.serviceType === "recurring" && (
        <div className="svc-row svc-row-charge">
          <label>Contract Total ({form.contractMonths} months)</label>
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
            <span className="svc-small">
              Based on 4.33 visits/month
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
