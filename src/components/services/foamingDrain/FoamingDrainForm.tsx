import React from "react";
import { useFoamingDrainCalc } from "./useFoamingDrainCalc";
import type { FoamingDrainFormState } from "./foamingDrainTypes";
import type { ServiceInitialData } from "../common/serviceTypes";

export const FoamingDrainForm: React.FC<
  ServiceInitialData<FoamingDrainFormState>
> = ({ initialData }) => {
  const { form, onChange, quote } = useFoamingDrainCalc(initialData);

  const stdLine = form.totalDrains * form.standardPlanRate;
  const largeLine = form.largePlanCount * form.largePlanRate;

  return (
    <div className="svc-card">
      <div className="svc-h-row">
        <div className="svc-h">FOAMING DRAIN</div>
        <button type="button" className="svc-mini" aria-label="add">
          +
        </button>
      </div>

      <div className="svc-row">
        <label>Total Drains</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="totalDrains"
            value={form.totalDrains}
            onChange={onChange}
          />
        </div>
      </div>

      <div className="svc-row">
        <label>No. of Grease Traps</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="greaseTraps"
            value={form.greaseTraps}
            onChange={onChange}
          />
        </div>
      </div>

      <div className="svc-row">
        <label>Standard Drain Service</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="standardPlanRate"
            value={form.standardPlanRate}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={`$${stdLine.toFixed(2)}`}
          />
        </div>
      </div>

      <div className="svc-row">
        <label>Large Drain Plan</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="largePlanRate"
            value={form.largePlanRate}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in"
            type="number"
            name="largePlanCount"
            value={form.largePlanCount}
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

      <div className="svc-row svc-row-charge">
        <label>Base Charge for Large Drain Plan</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="number"
              name="baseChargeForLargePlan"
              value={form.baseChargeForLargePlan}
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
