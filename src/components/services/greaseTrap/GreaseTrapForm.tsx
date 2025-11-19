// src/features/services/greaseTrap/GreaseTrapForm.tsx

import React from "react";
import { useGreaseTrapCalc } from "./useGreaseTrapCalc";
import type { GreaseTrapFormState } from "./greaseTrapTypes";

export const GreaseTrapForm: React.FC<{ initialData: GreaseTrapFormState }> = ({ initialData }) => {
  const { form, handleChange, quote } = useGreaseTrapCalc(initialData);

  return (
    <div className="svc-card">
      <h3 className="svc-card-title">Grease Trap</h3>

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
