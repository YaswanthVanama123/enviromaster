// src/features/services/sanipod/SanipodForm.tsx
import React from "react";
import { useSanipodCalc } from "./useSanipodCalc";
import type { SanipodFormState } from "./useSanipodCalc";
import type { ServiceInitialData } from "../common/serviceTypes";

export const SanipodForm: React.FC<ServiceInitialData<SanipodFormState>> = ({
  initialData,
}) => {
  const { form, onChange, calc } = useSanipodCalc(initialData);

  return (
    <div className="svc-card">
      {/* Header row */}
      <div className="svc-h-row">
        <div className="svc-h">SaniPod</div>
      </div>

      {/* Service mode */}
      <div className="svc-row">
        <label>Service Mode</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="serviceMode"
            value={form.serviceMode}
            onChange={onChange}
          >
            <option value="standalone">Standalone (trip charge)</option>
            <option value="withSaniClean">Bundled with SaniClean</option>
            <option value="allInclusive">All-Inclusive Program</option>
          </select>
        </div>
      </div>

      {/* Frequency (used only for per-visit math) */}
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
          </select>
        </div>
      </div>

      {/* Pod quantity */}
      <div className="svc-row">
        <label>No of SaniPods</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            min={0}
            name="podQuantity"
            value={form.podQuantity}
            onChange={onChange}
          />
        </div>
      </div>

      {/* Extra bags per week */}
      <div className="svc-row">
        <label>Extra Bags per Week</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            min={0}
            name="extraBagsPerWeek"
            value={form.extraBagsPerWeek}
            onChange={onChange}
          />
        </div>
      </div>

      {/* Location + parking (standalone trip logic) */}
      <div className="svc-row">
        <label>Location</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="location"
            value={form.location}
            onChange={onChange}
          >
            <option value="insideBeltway">Inside Beltway</option>
            <option value="outsideBeltway">Outside Beltway</option>
          </select>
        </div>
      </div>

      <div className="svc-row">
        <label>Parking Needed</label>
        <div className="svc-row-right">
          <input
            type="checkbox"
            name="needsParking"
            checked={form.needsParking}
            onChange={onChange}
          />{" "}
          <span className="svc-small">Add parking surcharge to trip</span>
        </div>
      </div>

      {/* Install options */}
      <div className="svc-row">
        <label>New Install?</label>
        <div className="svc-row-right">
          <input
            type="checkbox"
            name="isNewInstall"
            checked={form.isNewInstall}
            onChange={onChange}
          />{" "}
          <span className="svc-small">
            $25/pod install, multiplied for dirty conditions
          </span>
        </div>
      </div>

      {form.isNewInstall && (
        <div className="svc-row">
          <label>Install Condition</label>
          <div className="svc-row-right">
            <select
              className="svc-in"
              name="installType"
              value={form.installType}
              onChange={onChange}
            >
              <option value="clean">Clean / Normal (1×)</option>
              <option value="dirty">Dirty / Filthy (3×)</option>
            </select>
          </div>
        </div>
      )}

      {/* Rate category */}
      <div className="svc-row">
        <label>Rate Category</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="rateCategory"
            value={form.rateCategory}
            onChange={onChange}
          >
            <option value="redRate">Red</option>
            <option value="greenRate">Green (+30%)</option>
          </select>
        </div>
      </div>

      {/* Optional extras (not priced here yet, but kept on the form) */}
      {/* <div className="svc-row">
        <label>Toilet Clips Qty</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            min={0}
            name="toiletClipsQty"
            value={form.toiletClipsQty}
            onChange={onChange}
          />
        </div>
      </div>

      <div className="svc-row">
        <label>Seat Cover Dispensers Qty</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            min={0}
            name="seatCoverDispensersQty"
            value={form.seatCoverDispensersQty}
            onChange={onChange}
          />
        </div>
      </div> */}

      {/* Results */}
      <div className="svc-row svc-row-total">
        <label>Per Visit (service + trip)</label>
        <div className="svc-dollar">
          ${calc.perVisit.toFixed(2)}
        </div>
      </div>

      <div className="svc-row svc-row-total">
        <label>Monthly Recurring</label>
        <div className="svc-dollar">
          ${calc.monthly.toFixed(2)}
        </div>
      </div>

      <div className="svc-row svc-row-total">
        <label>Annual Recurring</label>
        <div className="svc-dollar">
          ${calc.annual.toFixed(2)}
        </div>
      </div>

      {calc.installCost > 0 && (
        <div className="svc-row svc-row-total">
          <label>Install (one-time)</label>
          <div className="svc-dollar">
            ${calc.installCost.toFixed(2)}
          </div>
        </div>
      )}
    </div>
  );
};
