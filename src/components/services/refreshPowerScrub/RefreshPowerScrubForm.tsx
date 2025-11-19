// src/features/services/refreshPowerScrub/RefreshPowerScrubForm.tsx

import React from "react";
import { useRefreshPowerScrubCalc } from "./useRefreshPowerScrubCalc";
import type { RefreshPowerScrubFormState } from "./refreshPowerScrubTypes";

export const RefreshPowerScrubForm: React.FC<{ initialData: RefreshPowerScrubFormState }> = ({ initialData }) => {
  const { form, handleChange, quote } = useRefreshPowerScrubCalc(initialData);

  return (
    <div className="svc-card">
      <h3 className="svc-card-title">Refresh Power Scrub</h3>
      <div className="svc-row">
        <div className="svc-col">
          <label className="svc-label">
            Area type
            <select
              name="areaType"
              className="svc-in"
              value={form.areaType}
              onChange={handleChange}
            >
              <option value="kitchen">Kitchen</option>
              <option value="frontOfHouse">Front of House</option>
              <option value="patio">Patio</option>
              <option value="dumpster">Dumpster</option>
            </select>
          </label>

          <label className="svc-label">
            Estimated hours
            <input
              type="number"
              name="estimatedHours"
              className="svc-in"
              value={form.estimatedHours}
              onChange={handleChange}
              min={0}
            />
          </label>

          <label className="svc-label">
            Workers
            <input
              type="number"
              name="workers"
              className="svc-in"
              value={form.workers}
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
              <option value="monthly">Monthly</option>
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
