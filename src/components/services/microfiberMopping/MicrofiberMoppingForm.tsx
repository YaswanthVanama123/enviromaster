import React from "react";
import { useMicrofiberMoppingCalc } from "./useMicrofiberMoppingCalc";
import type { MicrofiberMoppingFormState } from "./microfiberMoppingTypes";
import type { ServiceInitialData } from "../common/serviceTypes";

export const MicrofiberMoppingForm: React.FC<
  ServiceInitialData<MicrofiberMoppingFormState>
> = ({ initialData }) => {
  const { form, onChange, quote } = useMicrofiberMoppingCalc(initialData);

  const bathLine = form.bathroomsSqFt * form.bathroomsRate;
  const extraLine = form.extraNonBathSqFt * form.extraNonBathRate;
  const standaloneLine = form.standaloneSqFt * form.standaloneRate;

  return (
    <div className="svc-card">
      <div className="svc-h-row">
        <div className="svc-h">MICROMAX FLOOR</div>
        <button type="button" className="svc-mini" aria-label="add">
          +
        </button>
      </div>

      <div className="svc-row">
        <label>Is Combined with Sani?</label>
        <div className="svc-row-right">
          <label className="svc-inline">
            <input
              type="checkbox"
              name="isCombinedWithSani"
              checked={form.isCombinedWithSani}
              onChange={onChange}
            />
            <span>Yes</span>
          </label>
        </div>
      </div>

      <div className="svc-row">
        <label>Bathrooms Included</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="bathroomsSqFt"
            value={form.bathroomsSqFt}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in"
            type="number"
            step={0.0001}
            name="bathroomsRate"
            value={form.bathroomsRate}
            onChange={onChange}
          />
          <span>=</span>
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={`$${bathLine.toFixed(2)}`}
          />
        </div>
      </div>

      <div className="svc-row">
        <label>Extra Non-Bath Area</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="extraNonBathSqFt"
            value={form.extraNonBathSqFt}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in"
            type="number"
            step={0.0001}
            name="extraNonBathRate"
            value={form.extraNonBathRate}
            onChange={onChange}
          />
          <span>=</span>
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={`$${extraLine.toFixed(2)}`}
          />
        </div>
      </div>

      <div className="svc-row">
        <label>Standalone Mopping</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="standaloneSqFt"
            value={form.standaloneSqFt}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in"
            type="number"
            step={0.0001}
            name="standaloneRate"
            value={form.standaloneRate}
            onChange={onChange}
          />
          <span>=</span>
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={`$${standaloneLine.toFixed(2)}`}
          />
        </div>
      </div>

      <div className="svc-row svc-row-charge">
        <label>Standalone Minimum Charge</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="number"
              name="standaloneMinimum"
              value={form.standaloneMinimum}
              onChange={onChange}
            />
          </div>
        </div>
      </div>

      <div className="svc-row">
        <label>Daily Mop Chemical</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="text"
            name="dailyMopChemical"
            value={form.dailyMopChemical ?? ""}
            onChange={onChange}
          />
        </div>
      </div>

      <div className="svc-row">
        <label>Frequency</label>
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
            <option value="bimonthly">Bi-Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
        </div>
      </div>
    </div>
  );
};
