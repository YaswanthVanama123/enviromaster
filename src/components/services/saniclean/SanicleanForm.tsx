// src/features/services/saniclean/SanicleanForm.tsx

import React from "react";
import { useSanicleanCalc } from "./useSanicleanCalc";
import type { SanicleanFormState } from "./sanicleanTypes";

export const SanicleanForm: React.FC<{ initialData: SanicleanFormState }> = ({ initialData }) => {
  const { form, handleChange, quote } = useSanicleanCalc(initialData);

  return (
    <div className="svc-card">
      <h3 className="svc-card-title">Sani-Clean</h3>

      <div className="svc-row">
        <div className="svc-col">
          <label className="svc-label">
            Fixture count
            <input
              type="number"
              name="fixtureCount"
              className="svc-in"
              value={form.fixtureCount}
              onChange={handleChange}
              min={0}
            />
          </label>

          <label className="svc-label">
            Region
            <select
              name="region"
              className="svc-in"
              value={form.region}
              onChange={handleChange}
            >
              <option value="standard">Standard</option>
              <option value="inside">Inside</option>
              <option value="outside">Outside</option>
            </select>
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
