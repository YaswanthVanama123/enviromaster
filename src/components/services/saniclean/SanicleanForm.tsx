import React from "react";
import { useSanicleanCalc } from "./useSanicleanCalc";
import type { SanicleanFormState } from "./sanicleanTypes";
import type { ServiceInitialData } from "../common/serviceTypes";

export const SanicleanForm: React.FC<
  ServiceInitialData<SanicleanFormState>
> = ({ initialData }) => {
  const { form, onChange, quote } = useSanicleanCalc(initialData);

  return (
    <div className="svc-card">
      <div className="svc-h-row">
        <div className="svc-h">RESTROOM &amp; HYGIENE</div>
        <button type="button" className="svc-mini" aria-label="add">
          +
        </button>
      </div>

      <div className="svc-row">
        <label>Total Fixtures</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="fixtureCount"
            value={form.fixtureCount}
            onChange={onChange}
          />
        </div>
      </div>

      <div className="svc-row">
        <label>Inside Beltway / Outside / Standard</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="region"
            value={form.region}
            onChange={onChange}
          >
            <option value="inside">Inside Beltway</option>
            <option value="outside">Outside</option>
            <option value="standard">Standard</option>
          </select>
        </div>
      </div>

      <div className="svc-row">
        <label>SaniClean Weekly</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="allInclusiveRatePerFixture"
            value={form.allInclusiveRatePerFixture}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={`$${quote.perVisitPrice.toFixed(2)}`}
          />
        </div>
      </div>

      <div className="svc-row">
        <label>All-Inclusive Rate Per Fixture</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="allInclusiveRatePerFixture"
            value={form.allInclusiveRatePerFixture}
            onChange={onChange}
          />
        </div>
      </div>

      <div className="svc-row svc-row-charge">
        <label>Minimum Weekly Charge</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="number"
              name="minimumWeeklyCharge"
              value={form.minimumWeeklyCharge}
              onChange={onChange}
            />
          </div>
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
