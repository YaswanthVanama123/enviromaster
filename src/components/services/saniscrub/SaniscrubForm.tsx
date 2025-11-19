// src/features/services/saniscrub/SaniscrubForm.tsx

import React from "react";
import { useSaniscrubCalc } from "./useSaniscrubCalc";
import type { SaniscrubFormState } from "./saniscrubTypes";

export const SaniscrubForm: React.FC<{ initialData: SaniscrubFormState }> = ({ initialData }) => {
  const { form, handleChange, quote } = useSaniscrubCalc(initialData);

  return (
    <div className="svc-card">
      <h3 className="svc-card-title">Sani-Scrub</h3>

      <div className="svc-row">
        <div className="svc-col">
          <label className="svc-label">
            Restroom fixtures
            <input
              type="number"
              name="restroomFixtures"
              className="svc-in"
              value={form.restroomFixtures}
              onChange={handleChange}
              min={0}
            />
          </label>

          <label className="svc-label">
            Non-bathroom floor (sq ft)
            <input
              type="number"
              name="nonBathroomSqFt"
              className="svc-in"
              value={form.nonBathroomSqFt}
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
