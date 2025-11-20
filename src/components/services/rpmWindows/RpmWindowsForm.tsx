import React from "react";
import { useRpmWindowsCalc } from "./useRpmWindowsCalc";
import type { RpmWindowsFormState } from "./rpmWindowsTypes";
import type { ServiceInitialData } from "../common/serviceTypes";

export const RpmWindowsForm: React.FC<
  ServiceInitialData<RpmWindowsFormState>
> = ({ initialData }) => {
  const { form, setForm, onChange, quote, calc } =
    useRpmWindowsCalc(initialData);

  const smallLine = form.smallQty * form.smallWindowRate;
  const mediumLine = form.mediumQty * form.mediumWindowRate;
  const largeLine = form.largeQty * form.largeWindowRate;

  const handleInstallTypeChange = (value: "first" | "clean") => {
    setForm((prev) => ({
      ...prev,
      isFirstTimeInstall: value === "first",
    }));
  };

  return (
    <div className="svc-card">
      <div className="svc-h-row">
        <div className="svc-h">RPM WINDOW</div>
        <button type="button" className="svc-mini" aria-label="add">
          +
        </button>
      </div>

      {/* Small windows */}
      <div className="svc-row">
        <label>Small Windows</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="smallQty"
            value={form.smallQty}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in"
            type="number"
            name="smallWindowRate"
            value={form.smallWindowRate}
            onChange={onChange}
          />
          <span>=</span>
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={`$${smallLine.toFixed(2)}`}
          />
        </div>
      </div>

      {/* Medium windows */}
      <div className="svc-row">
        <label>Medium Windows</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="mediumQty"
            value={form.mediumQty}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in"
            type="number"
            name="mediumWindowRate"
            value={form.mediumWindowRate}
            onChange={onChange}
          />
          <span>=</span>
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={`$${mediumLine.toFixed(2)}`}
          />
        </div>
      </div>

      {/* Large windows */}
      <div className="svc-row">
        <label>Large Windows</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="largeQty"
            value={form.largeQty}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in"
            type="number"
            name="largeWindowRate"
            value={form.largeWindowRate}
            onChange={onChange}
          />
          <span>=</span>
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={`$${largeLine.toFixed(2)}`}
          />
        </div>
      </div>

      {/* Trip charge – editable and now used in calc */}
      <div className="svc-row svc-row-charge">
        <label>Trip Charge</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="number"
              name="tripCharge"
              value={form.tripCharge}
              onChange={onChange}
            />
          </div>
          <label className="svc-inline">
            <input type="checkbox" checked readOnly />
            <span>Include</span>
          </label>
        </div>
      </div>

      {/* Install type */}
      <div className="svc-row">
        <label>Install Type</label>
        <div className="svc-row-right">
          <label className="svc-inline">
            <input
              type="radio"
              name="installType"
              value="first"
              checked={form.isFirstTimeInstall}
              onChange={() => handleInstallTypeChange("first")}
            />
            <span>First Time (Install)</span>
          </label>
          <label className="svc-inline">
            <input
              type="radio"
              name="installType"
              value="clean"
              checked={!form.isFirstTimeInstall}
              onChange={() => handleInstallTypeChange("clean")}
            />
            <span>Ongoing / Clean</span>
          </label>
        </div>
      </div>

      {/* Service frequency */}
      <div className="svc-row">
        <label>Service Frequency</label>
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
            <option value="quarterly">Quarterly</option>
          </select>
        </div>
      </div>

      {/* Rate category (red / green) */}
      <div className="svc-row">
        <label>Rate Category</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="selectedRateCategory"
            value={form.selectedRateCategory}
            onChange={onChange}
          >
            <option value="redRate">Red (Standard)</option>
            <option value="greenRate">Green (Premium)</option>
          </select>
        </div>
      </div>

      {/* Mirror cleaning flag */}
      <div className="svc-row">
        <label>Mirror Cleaning</label>
        <div className="svc-row-right">
          <label className="svc-inline">
            <input
              type="checkbox"
              name="includeMirrors"
              checked={form.includeMirrors}
              onChange={onChange}
            />
            <span>Include (same chemicals)</span>
          </label>
        </div>
      </div>

      {/* TOTAL PRICE fields */}
      <div className="svc-row svc-row-charge">
        <label>Total Price (Per Visit)</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="text"
              readOnly
              value={quote.perVisitPrice.toFixed(2)}
            />
          </div>
        </div>
      </div>

      <div className="svc-row svc-row-charge">
        <label>Annual Price</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="text"
              readOnly
              value={quote.annualPrice.toFixed(2)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
