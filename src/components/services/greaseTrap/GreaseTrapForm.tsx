import React, { useEffect, useRef, useState } from "react";
import { useGreaseTrapCalc } from "./useGreaseTrapCalc";
import type { GreaseTrapFormState } from "./greaseTrapTypes";
import { useServicesContextOptional } from "../ServicesContext";
import { CustomFieldManager, type CustomField } from "../CustomFieldManager";
import { GREASE_TRAP_PER_TRAP_RATE } from "./greaseTrapConfig";

export const GreaseTrapForm: React.FC<{ initialData?: GreaseTrapFormState; onRemove?: () => void }> = ({ initialData, onRemove }) => {
  const { form, handleChange, quote } = useGreaseTrapCalc(initialData);
  const servicesContext = useServicesContextOptional();

  // Custom fields state
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  // Save form data to context for form submission
  const prevDataRef = useRef<string>("");

  useEffect(() => {
    if (servicesContext) {
      const isActive = (form.numberOfTraps ?? 0) > 0;

      const data = isActive ? {
        serviceId: "greaseTrap",
        displayName: "Grease Trap",
        isActive: true,

        frequency: {
          label: "Frequency",
          type: "text" as const,
          value: typeof form.frequency === 'string'
            ? form.frequency.charAt(0).toUpperCase() + form.frequency.slice(1)
            : String(form.frequency || ''),
        },

        service: {
          label: "Grease Traps",
          type: "calc" as const,
          qty: form.numberOfTraps,
          rate: GREASE_TRAP_PER_TRAP_RATE,
          total: quote.perVisitTotal,
        },

        totals: {
          perVisit: {
            label: "Per Visit Total",
            type: "dollar" as const,
            amount: quote.perVisitTotal,
          },
          monthly: {
            label: "Monthly Total",
            type: "dollar" as const,
            amount: quote.monthlyTotal,
          },
          contract: {
            label: "Contract Total",
            type: "dollar" as const,
            months: form.contractMonths,
            amount: quote.contractTotal,
          },
        },

        notes: form.notes || "",
        customFields: customFields,
      } : null;

      const dataStr = JSON.stringify(data);

      if (dataStr !== prevDataRef.current) {
        prevDataRef.current = dataStr;
        servicesContext.updateService("greaseTrap", data);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, quote, customFields]);

  return (
    <div className="svc-card">
      <div className="svc-h-row">
        <div className="svc-h">GREASE TRAP</div>
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

      {/* Custom fields manager */}
      <CustomFieldManager
        fields={customFields}
        onFieldsChange={setCustomFields}
        showAddDropdown={showAddDropdown}
        onToggleAddDropdown={setShowAddDropdown}
      />

      <div className="svc-row">
        <div className="svc-col">
          <label className="svc-label">
            Number of traps
            <input
              type="number"
              name="numberOfTraps"
              className="svc-in"
              value={form.numberOfTraps}
              onChange={handleChange}
              min={0}
            />
          </label>

          <label className="svc-label">
            Size of traps (gallons)
            <input
              type="number"
              name="sizeOfTraps"
              className="svc-in"
              value={form.sizeOfTraps}
              onChange={handleChange}
              min={0}
            />
          </label>

          <label className="svc-label">
            Frequency
            <select
              name="frequency"
              className="svc-in"
              value={form.frequency}
              onChange={handleChange}
            >
              <option value="one-time">One-time</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>

          <label className="svc-label">
            Notes
            <input
              type="text"
              name="notes"
              className="svc-in"
              value={form.notes ?? ""}
              onChange={handleChange}
            />
          </label>
        </div>

        <div className="svc-col">
          <div className="svc-summary">
            <div className="svc-summary-row">
              <span>Per Visit</span>
              <span>${quote.perVisitPrice.toFixed(2)}</span>
            </div>
            <div className="svc-summary-row">
              <span>Annual Price</span>
              <span>${quote.annualPrice.toFixed(2)}</span>
            </div>
            <ul className="svc-summary-list">
              {quote.detailsBreakdown.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
