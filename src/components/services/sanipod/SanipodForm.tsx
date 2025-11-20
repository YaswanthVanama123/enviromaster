// src/features/services/sanipod/SanipodForm.tsx
import React from "react";
import { useSanipodCalc } from "./useSanipodCalc";
import type { SanipodFormState } from "./sanipodTypes";
import type { ServiceInitialData } from "../common/serviceTypes";

export const SanipodForm: React.FC<
  ServiceInitialData<SanipodFormState>
> = ({ initialData }) => {
  const { form, onChange, quote, calc } = useSanipodCalc(initialData);

  // line totals for display (not used directly in engine)
  const weeklyLineTotal = form.podQuantity * form.weeklyRatePerUnit;
  const extraBagsLineTotal = form.extraBagsPerWeek * form.extraBagPrice;

  return (
    <div className="svc-card">
      <div className="svc-h-row">
        <div className="svc-h">SANIPOD</div>
        <button type="button" className="svc-mini" aria-label="add">
          +
        </button>
      </div>

      {/* Number of SaniPods @ weekly rate = total */}
      <div className="svc-row">
        <label>Number of SaniPods</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="podQuantity"
            value={form.podQuantity}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in"
            type="number"
            name="weeklyRatePerUnit"
            value={form.weeklyRatePerUnit}
            onChange={onChange}
          />
          <span>=</span>
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={`$${weeklyLineTotal.toFixed(2)}`}
          />
        </div>
      </div>

      {/* Install toggle */}
      <div className="svc-row">
        <label>New Install?</label>
        <div className="svc-row-right">
          <label className="svc-inline">
            <input
              type="checkbox"
              name="isNewInstall"
              checked={form.isNewInstall}
              onChange={onChange}
            />
            <span>Apply install multiplier (3×)</span>
          </label>
        </div>
      </div>

      {/* Extra bags per week */}
      <div className="svc-row">
        <label>Extra Bags per Week</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="extraBagsPerWeek"
            value={form.extraBagsPerWeek}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in"
            type="number"
            name="extraBagPrice"
            value={form.extraBagPrice}
            onChange={onChange}
          />
          <span>=</span>
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={`$${extraBagsLineTotal.toFixed(2)}`}
          />
        </div>
      </div>

      {/* Standalone minimum – display only */}
      <div className="svc-row svc-row-charge">
        <label>Standalone Minimum Charge</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="number"
              value={40}
              readOnly
            />
          </div>
        </div>
      </div>

      {/* Location + parking – used for trip charge */}
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
          <label className="svc-inline">
            <input
              type="checkbox"
              name="needsParking"
              checked={form.needsParking}
              onChange={onChange}
            />
            <span>Parking Needed</span>
          </label>
        </div>
      </div>

      {/* Frequency */}
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

      {/* Add-on related services */}
      <div className="svc-row">
        <label>Add-On Services</label>
        <div className="svc-row-right">
          <div className="svc-row-sub">
            <span>Toilet Clips</span>
            <input
              className="svc-in"
              type="number"
              name="toiletClipsQty"
              value={form.toiletClipsQty}
              onChange={onChange}
            />
          </div>
          <div className="svc-row-sub">
            <span>Seat Cover Disp.</span>
            <input
              className="svc-in"
              type="number"
              name="seatCoverDispensersQty"
              value={form.seatCoverDispensersQty}
              onChange={onChange}
            />
          </div>
        </div>
      </div>

      {/* TOTALS */}
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
        <label>Monthly Bill</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="text"
              readOnly
              value={calc.monthlyBill.toFixed(2)}
            />
          </div>
        </div>
      </div>

      <div className="svc-row svc-row-charge">
        <label>Annual Bill</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="text"
              readOnly
              value={calc.annualBill.toFixed(2)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
