// src/features/services/microfiberMopping/MicrofiberMoppingForm.tsx
import React from "react";
import { useMicrofiberMoppingCalc } from "./useMicrofiberMoppingCalc";
import type { MicrofiberMoppingFormState } from "./microfiberMoppingTypes";
import type { ServiceInitialData } from "../common/serviceTypes";
import { microfiberMoppingPricingConfig as cfg } from "./microfiberMoppingConfig";

export const MicrofiberMoppingForm: React.FC<
  ServiceInitialData<MicrofiberMoppingFormState>
> = ({ initialData }) => {
  const { form, onChange, quote, calc } =
    useMicrofiberMoppingCalc(initialData);

  // Derived “@” rates (per sq ft) for display only
  const extraAreaRatePerSqFt =
    cfg.extraAreaPricing.extraAreaRatePerUnit /
    cfg.extraAreaPricing.extraAreaSqFtUnit; // 10 / 400 = 0.025

  const standaloneRatePerSqFt =
    cfg.standalonePricing.standaloneRatePerUnit /
    cfg.standalonePricing.standaloneSqFtUnit; // 10 / 200 = 0.05

  return (
    <div className="svc-card">
      <div className="svc-h-row">
        <div className="svc-h">MICROMAX FLOOR</div>
        <button type="button" className="svc-mini" aria-label="add">
          +
        </button>
      </div>

      {/* Is Combined with Sani? */}
      <div className="svc-row">
        <label>Is Combined with Sani?</label>
        <div className="svc-row-right">
          <label className="svc-inline">
            <input
              type="checkbox"
              name="hasExistingSaniService"
              checked={form.hasExistingSaniService}
              onChange={onChange}
            />
            <span>Yes</span>
          </label>
        </div>
      </div>

      {/* Bathrooms Included (bundled with Sani) */}
      <div className="svc-row">
        <label>Bathrooms Included</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="bathroomCount"
            value={form.bathroomCount}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in"
            type="number"
            value={cfg.includedBathroomRate}
            readOnly
          />
          <span>=</span>
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={`$${calc.bathroomPrice.toFixed(2)}`}
          />
        </div>
      </div>

      {/* Extra Non-Bath Area */}
      <div className="svc-row">
        <label>Extra Non-Bath Area</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="extraAreaSqFt"
            value={form.extraAreaSqFt}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in"
            type="number"
            value={extraAreaRatePerSqFt}
            readOnly
          />
          <span>=</span>
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={`$${calc.extraAreaPrice.toFixed(2)}`}
          />
        </div>
      </div>

      {/* Standalone Mopping (when NOT combined with Sani) */}
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
            value={standaloneRatePerSqFt}
            readOnly
          />
          <span>=</span>
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={`$${calc.standaloneTotal.toFixed(2)}`}
          />
        </div>
      </div>

      {/* Standalone Minimum Charge (display only – from config) */}
      <div className="svc-row svc-row-charge">
        <label>Standalone Minimum Charge</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="number"
              value={cfg.standalonePricing.standaloneMinimum}
              readOnly
            />
          </div>
        </div>
      </div>

      {/* Daily Mop Chemical (we treat as gallons of chemical per month) */}
      <div className="svc-row">
        <label>Daily Mop Chemical</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="chemicalGallons"
            value={form.chemicalGallons}
            onChange={onChange}
          />
        </div>
      </div>

      {/* Frequency (for monthly/annual billing) */}
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

      {/* TOTALS – same UI structure, just extra rows */}
      <div className="svc-row svc-row-charge">
        <label>Total Weekly</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="text"
              readOnly
              value={calc.weeklyTotalWithChemicals.toFixed(2)}
            />
          </div>
        </div>
      </div>

      <div className="svc-row svc-row-charge">
        <label>Monthly Recurring</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="text"
              readOnly
              value={calc.monthlyRecurring.toFixed(2)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
