import React from "react";
import { useRefreshPowerScrubCalc } from "./useRefreshPowerScrubCalc";
import type { RefreshPowerScrubFormState } from "./refreshPowerScrubTypes";
import type { ServiceInitialData } from "../common/serviceTypes";

export const RefreshPowerScrubForm: React.FC<
  ServiceInitialData<RefreshPowerScrubFormState>
> = ({ initialData }) => {
  const { form, onChange, quote } = useRefreshPowerScrubCalc(initialData);

  const labourLine =
    form.workers * form.hours * form.hourlyRatePerWorker;

  return (
    <div className="svc-card">
      <div className="svc-h-row">
        <div className="svc-h">REFRESH POWER SCRUB</div>
        <button type="button" className="svc-mini" aria-label="add">
          +
        </button>
      </div>

      <div className="svc-row">
        <label>Area</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="areaType"
            value={form.areaType}
            onChange={onChange}
          >
            <option value="kitchen">Kitchen / BOH</option>
            <option value="frontOfHouse">Front of House</option>
            <option value="patio">Patio</option>
            <option value="dumpster">Dumpster Area</option>
          </select>
        </div>
      </div>

      <div className="svc-row">
        <label>Workers / Hours</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="workers"
            value={form.workers}
            onChange={onChange}
          />
          <span>×</span>
          <input
            className="svc-in"
            type="number"
            step={0.5}
            name="hours"
            value={form.hours}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in"
            type="number"
            name="hourlyRatePerWorker"
            value={form.hourlyRatePerWorker}
            onChange={onChange}
          />
          <span>=</span>
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={`$${labourLine.toFixed(2)}`}
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

      <div className="svc-row svc-row-charge">
        <label>Minimum Visit</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="number"
              name="minimumVisit"
              value={form.minimumVisit}
              onChange={onChange}
            />
          </div>
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
            <option value="monthly">Monthly</option>
            <option value="bimonthly">Bi-Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
        </div>
      </div>
    </div>
  );
};
