import React from "react";
import { useRpmWindowsCalc } from "./useRpmWindowsCalc";
import type { RpmWindowsFormState } from "./rpmWindowsTypes";
import type { ServiceInitialData } from "../common/serviceTypes";

export const RpmWindowsForm: React.FC<
  ServiceInitialData<RpmWindowsFormState>
> = ({ initialData }) => {
  const { form, setForm, onChange, quote, calc } =
    useRpmWindowsCalc(initialData);

  // Lines use frequency-adjusted rates
  const smallLine = form.smallQty * calc.effSmallRate;
  const mediumLine = form.mediumQty * calc.effMediumRate;
  const largeLine = form.largeQty * calc.effLargeRate;

  const handleInstallTypeChange = (value: "first" | "clean") => {
    setForm((prev) => ({
      ...prev,
      isFirstTimeInstall: value === "first",
    }));
  };

  // ✅ Only show first-visit total when installation is selected
  const firstVisitDisplay = form.isFirstTimeInstall
    ? calc.firstVisitTotalRated
    : 0;

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
            value={calc.effSmallRate.toFixed(2)}
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
            value={calc.effMediumRate.toFixed(2)}
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
            value={calc.effLargeRate.toFixed(2)}
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

      {/* Trip charge – shows frequency-adjusted trip, but stored weekly */}
      <div className="svc-row svc-row-charge">
        <label>Trip Charge</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="number"
              name="tripCharge"
              value={calc.effTrip.toFixed(2)}
              onChange={onChange}
            />
          </div>
          <label className="svc-inline">
            <input type="checkbox" checked readOnly />
            <span>Include</span>
          </label>
        </div>
      </div>

      {/* Installation fee + first visit – only when First Time is selected */}
      <div className="svc-row svc-row-charge">
        <label>Installation Fee + First Visit</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="text"
              readOnly
              value={firstVisitDisplay.toFixed(2)}
            />
          </div>
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

      {/* Rate category */}
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

      {/* Mirror cleaning */}
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

      {/* Totals */}
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
