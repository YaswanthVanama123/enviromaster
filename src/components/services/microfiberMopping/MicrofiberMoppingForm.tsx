// src/features/services/microfiberMopping/MicrofiberMoppingForm.tsx

import React from "react";
import { useMicrofiberMoppingCalc } from "./useMicrofiberMoppingCalc";
import type { MicrofiberMoppingFormState } from "./microfiberMoppingTypes";

export const MicrofiberMoppingForm: React.FC<{ initialData: MicrofiberMoppingFormState }> = ({ initialData }) => {
  const { form, handleChange, quote } = useMicrofiberMoppingCalc(initialData);

  return (
    <div className="svc-card">
      <h3 className="svc-card-title">Microfiber Mopping</h3>
      <div className="svc-row">
        <div className="svc-col">
          <label className="svc-label">
            Bathroom area (sq ft)
            <input
              type="number"
              name="bathroomSqFt"
              className="svc-in"
              value={form.bathroomSqFt}
              onChange={handleChange}
              min={0}
            />
          </label>

          <label className="svc-label">
            Non-bathroom area (sq ft)
            <input
              type="number"
              name="nonBathroomSqFt"
              className="svc-in"
              value={form.nonBathroomSqFt}
              onChange={handleChange}
              min={0}
            />
          </label>

          <label className="svc-label svc-label--inline">
            <input
              type="checkbox"
              name="standalone"
              checked={form.standalone}
              onChange={handleChange}
            />
            Standalone (not bundled with Sani)
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
              <option value="bimonthly">Bi-Monthly</option>
              <option value="quarterly">Quarterly</option>
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
              <span>Per Visit Price</span>
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
