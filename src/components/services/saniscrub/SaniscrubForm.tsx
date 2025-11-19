import React from "react";
import { useSaniscrubCalc } from "./useSaniscrubCalc";
import type { SaniscrubFormState } from "./saniscrubTypes";
import type { ServiceInitialData } from "../common/serviceTypes";

export const SaniscrubForm: React.FC<
  ServiceInitialData<SaniscrubFormState>
> = ({ initialData }) => {
  const { form, onChange, quote } = useSaniscrubCalc(initialData);

  const fixtureLine = Math.max(
    form.fixtureCount * form.fixtureUnitRate,
    form.fixtureMinimumCharge
  );
  const nonBathLine = form.nonBathroomSqFt * form.nonBathroomRate;

  return (
    <div className="svc-card">
      <div className="svc-h-row">
        <div className="svc-h">SCRUB SERVICE</div>
        <button type="button" className="svc-mini" aria-label="add">
          +
        </button>
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

      <div className="svc-row">
        <label>Bathroom Fixtures</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="fixtureCount"
            value={form.fixtureCount}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in"
            type="number"
            name="fixtureUnitRate"
            value={form.fixtureUnitRate}
            onChange={onChange}
          />
          <span>=</span>
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={`$${fixtureLine.toFixed(2)}`}
          />
        </div>
      </div>

      <div className="svc-row svc-row-charge">
        <label>Fixture Minimum Charge</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="number"
              name="fixtureMinimumCharge"
              value={form.fixtureMinimumCharge}
              onChange={onChange}
            />
          </div>
        </div>
      </div>

      <div className="svc-row">
        <label>Non-Bathroom Area</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="nonBathroomSqFt"
            value={form.nonBathroomSqFt}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in"
            type="number"
            name="nonBathroomRate"
            value={form.nonBathroomRate}
            onChange={onChange}
          />
          <span>=</span>
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={`$${nonBathLine.toFixed(2)}`}
          />
        </div>
      </div>

      <div className="svc-row svc-row-charge">
        <label>Additional 500 sq ft Unit Rate</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="number"
              name="addl500SqFtUnitRate"
              value={form.addl500SqFtUnitRate}
              onChange={onChange}
            />
          </div>
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
    </div>
  );
};
