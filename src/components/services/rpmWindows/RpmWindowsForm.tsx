// src/features/services/rpmWindows/RpmWindowsForm.tsx

import React from "react";
import { useRpmWindowsCalc } from "./useRpmWindowsCalc";
import type { RpmWindowsFormState } from "./rpmWindowsTypes";

export const RpmWindowsForm: React.FC<{ initialData: RpmWindowsFormState }> = ({ initialData }) => {
  const { form, handleChange, quote } = useRpmWindowsCalc(initialData);

  return (
    <div className="svc-card">
      <h3 className="svc-card-title">RPM Windows</h3>
      <div className="svc-row">
        <div className="svc-col">
          <label className="svc-label">
            Small windows
            <input
              type="number"
              name="smallWindows"
              className="svc-in"
              value={form.smallWindows}
              onChange={handleChange}
              min={0}
            />
          </label>

          <label className="svc-label">
            Medium windows
            <input
              type="number"
              name="mediumWindows"
              className="svc-in"
              value={form.mediumWindows}
              onChange={handleChange}
              min={0}
            />
          </label>

          <label className="svc-label">
            Large windows
            <input
              type="number"
              name="largeWindows"
              className="svc-in"
              value={form.largeWindows}
              onChange={handleChange}
              min={0}
            />
          </label>

          <label className="svc-label">
            <input
              type="checkbox"
              name="firstTimeInstall"
              className="svc-in-check"
              checked={form.firstTimeInstall}
              onChange={handleChange}
            />
            First time install
          </label>

          <label className="svc-label">
            Frequency
            <select
              name="frequency"
              className="svc-in"
              value={form.frequency}
              onChange={handleChange}
            >
              <option value="quarterly">Quarterly</option>
              <option value="annually">Annually</option>
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
