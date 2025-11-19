// src/features/services/foamingDrain/FoamingDrainForm.tsx

import React from "react";
import { useFoamingDrainCalc } from "./useFoamingDrainCalc";
import type { FoamingDrainFormState } from "./foamingDrainTypes";

export const FoamingDrainForm: React.FC<{ initialData: FoamingDrainFormState }> = ({ initialData }) => {
  const { form, handleChange, quote } = useFoamingDrainCalc(initialData);

  return (
    <div className="svc-card">
      <h3 className="svc-card-title">Foaming Drain</h3>
      <div className="svc-row">
        <div className="svc-col">
          <label className="svc-label">
            Number of drains
            <input
              type="number"
              name="numberOfDrains"
              className="svc-in"
              value={form.numberOfDrains}
              onChange={handleChange}
              min={0}
            />
          </label>

          <label className="svc-label">
            <input
              type="checkbox"
              name="includeGreaseTrap"
              className="svc-in-check"
              checked={form.includeGreaseTrap}
              onChange={handleChange}
            />
            Include grease trap
          </label>

          <label className="svc-label">
            <input
              type="checkbox"
              name="includeGreenDrain"
              className="svc-in-check"
              checked={form.includeGreenDrain}
              onChange={handleChange}
            />
            Include green drain
          </label>

          <label className="svc-label">
            Frequency
            <select
              name="frequency"
              className="svc-in"
              value={form.frequency}
              onChange={handleChange}
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-Weekly</option>
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
