import React from "react";
import { useRpmWindowsCalc } from "./useRpmWindowsCalc";
import type { RpmWindowsFormState } from "./rpmWindowsTypes";
import type { ServiceInitialData } from "../common/serviceTypes";

export const RpmWindowsForm: React.FC<
  ServiceInitialData<RpmWindowsFormState>
> = ({ initialData }) => {
  const { form, onChange, quote } = useRpmWindowsCalc(initialData);

  const smallTotal = form.small * form.smallRate;
  const mediumTotal = form.medium * form.mediumRate;
  const largeTotal = form.large * form.largeRate;

  return (
    <div className="svc-card">
      <div className="svc-h-row">
        <div className="svc-h">RPM WINDOW</div>
        <button type="button" className="svc-mini" aria-label="add">
          +
        </button>
      </div>

      <div className="svc-row">
        <label>Small Windows</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="small"
            value={form.small}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in"
            type="number"
            name="smallRate"
            value={form.smallRate}
            onChange={onChange}
          />
          <span>=</span>
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={`$${smallTotal.toFixed(2)}`}
          />
        </div>
      </div>

      <div className="svc-row">
        <label>Medium Windows</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="medium"
            value={form.medium}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in"
            type="number"
            name="mediumRate"
            value={form.mediumRate}
            onChange={onChange}
          />
          <span>=</span>
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={`$${mediumTotal.toFixed(2)}`}
          />
        </div>
      </div>

      <div className="svc-row">
        <label>Large Windows</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="large"
            value={form.large}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in"
            type="number"
            name="largeRate"
            value={form.largeRate}
            onChange={onChange}
          />
          <span>=</span>
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={`$${largeTotal.toFixed(2)}`}
          />
        </div>
      </div>

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
            <input
              type="checkbox"
              name="tripChargeIncluded"
              checked={!!form.tripChargeIncluded}
              onChange={onChange}
            />
            <span>Include</span>
          </label>
        </div>
      </div>

      <div className="svc-row">
        <label>Install Multiplier</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            step={0.5}
            name="installMultiplier"
            value={form.installMultiplier}
            onChange={onChange}
          />
        </div>
      </div>

      <div className="svc-row">
        <label>Service Frequency</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="frequency"
            value={form.frequency}
            onChange={onChange}
          >
            <option value="monthly">Monthly</option>
            <option value="bimonthly">Bi-Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
        </div>
      </div>
    </div>
  );
};
