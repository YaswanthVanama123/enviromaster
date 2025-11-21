// src/components/services/microfiberMopping/MicrofiberMoppingForm.tsx
import React from "react";
import { useMicrofiberMoppingCalc } from "./useMicrofiberMoppingCalc";
import type { MicrofiberMoppingFormState } from "./microfiberMoppingTypes";
import type { ServiceInitialData } from "../common/serviceTypes";
import { microfiberMoppingPricingConfig as cfg } from "./microfiberMoppingConfig";

export const MicrofiberMoppingForm: React.FC<
  ServiceInitialData<MicrofiberMoppingFormState>
> = ({ initialData }) => {
  const { form, onChange, calc } = useMicrofiberMoppingCalc(initialData);

  const extraAreaRatePerSqFt =
    cfg.extraAreaPricing.extraAreaRatePerUnit /
    cfg.extraAreaPricing.extraAreaSqFtUnit;

  // disable bathrooms when huge bathroom path is used
  const isBathroomDisabled =
    form.isHugeBathroom || (form.hugeBathroomSqFt ?? 0) > 0;

  return (
    <div className="svc-card">
      <div className="svc-h-row">
        <div className="svc-h">MICROFIBER MOPPING</div>
      </div>

      {/* Is combined with Sani? */}
      <div className="svc-row">
        <label>Is combined with Sani?</label>
        <div className="svc-row-right">
          <label className="svc-inline">
            <input
              type="checkbox"
              name="hasExistingSaniService"
              checked={form.hasExistingSaniService}
              onChange={onChange}
            />
            <span>Yes (bathrooms are bundled with Sani)</span>
          </label>
        </div>
      </div>

      {/* Bathrooms (bundled) */}
      <div className="svc-row">
        <label>Bathrooms (bundled)</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="bathroomCount"
            value={form.bathroomCount}
            onChange={onChange}
            disabled={isBathroomDisabled}
          />
          <span>@</span>
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="number"
              value={cfg.includedBathroomRate}
              readOnly
            />
          </div>
          <span>each</span>
          <span>=</span>
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={`$${calc.standardBathroomPrice.toFixed(2)}`}
          />
        </div>
      </div>

      {/* Huge bathroom exception */}
      <div className="svc-row">
        <label>Huge bathroom exception (sq ft)</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="hugeBathroomSqFt"
            value={form.hugeBathroomSqFt}
            onChange={onChange}
          />
          <span>@</span>
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="number"
              value={cfg.hugeBathroomPricing.ratePerSqFt}
              readOnly
            />
          </div>
          <span>
            {/* per {cfg.hugeBathroomPricing.sqFtUnit} sq ft units */}
          </span>
          <span>=</span>
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={`$${calc.hugeBathroomPrice.toFixed(2)}`}
          />
          <label className="svc-inline" style={{ marginLeft: "0.5rem" }}>
            <input
              type="checkbox"
              name="isHugeBathroom"
              checked={form.isHugeBathroom}
              onChange={onChange}
            />
          </label>
        </div>
      </div>

      {/* Extra non-bath area */}
      <div className="svc-row">
        <label>Extra non-bath area (sq ft)</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="extraAreaSqFt"
            value={form.extraAreaSqFt}
            onChange={onChange}
          />
          <span>@</span>
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="number"
              value={extraAreaRatePerSqFt.toFixed(2)}
              readOnly
            />
          </div>
          <span>
            {/* per sq ft (min ${cfg.extraAreaPricing.singleLargeAreaRate}) */}
          </span>
          <span>=</span>
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={`$${calc.extraAreaPrice.toFixed(2)}`}
          />
        </div>
      </div>

      {/* Standalone mopping area */}
      <div className="svc-row">
        <label>Standalone mopping area (sq ft)</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="standaloneSqFt"
            value={form.standaloneSqFt}
            onChange={onChange}
          />
          <span>@</span>
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="number"
              value={cfg.standalonePricing.standaloneRatePerUnit}
              readOnly
            />
          </div>
          {/* <span>per {cfg.standalonePricing.standaloneSqFtUnit} sq ft</span> */}
          <span>=</span>
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={`$${calc.standaloneServicePrice.toFixed(2)}`}
          />
        </div>
      </div>

      {/* Standalone trip (location / parking) – layout fixed */}
      <div className="svc-row">
        <label>Standalone trip (location / parking)</label>
        <div className="svc-row-right">
          {/* First line: location + parking checkbox */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <select
              className="svc-in"
              name="location"
              value={form.location}
              onChange={onChange}
            >
              <option value="insideBeltway">Inside Beltway</option>
              <option value="outsideBeltway">Outside Beltway</option>
            </select>

            <label
              className="svc-inline"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
              }}
            >
              <input
                type="checkbox"
                name="needsParking"
                checked={form.needsParking}
                onChange={onChange}
              />
              <span>Needs paid parking</span>
            </label>
          </div>

          {/* Second line: = $xx.xx */}
          <div
            style={{
              marginTop: 4,
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
          >
            <span>=</span>
            <input
              className="svc-in-box"
              type="text"
              readOnly
              value={`$${calc.standaloneTripCharge.toFixed(2)}`}
            />
          </div>
        </div>
      </div>

      {/* Daily mop chemical */}
      <div className="svc-row">
        <label>Daily mop chemical (gallons / month)</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="chemicalGallons"
            value={form.chemicalGallons}
            onChange={onChange}
          />
          <span>@</span>
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="number"
              value={cfg.chemicalProducts.dailyChemicalPerGallon}
              readOnly
            />
          </div>
          <span>=</span>
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={`$${calc.chemicalSupplyMonthly.toFixed(2)}`}
          />
        </div>
      </div>

      {/* All-inclusive toggle */}
      <div className="svc-row">
        <label>Included in all-inclusive package?</label>
        <div className="svc-row-right">
          <label className="svc-inline">
            <input
              type="checkbox"
              name="isAllInclusive"
              checked={form.isAllInclusive}
              onChange={onChange}
            />
            <span>Yes (no extra service fee – chemicals still bill)</span>
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

      {/* Summary */}
      <div className="svc-summary">
        <div className="svc-row">
          <label>Per-visit service total</label>
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="text"
              readOnly
              value={calc.perVisitPrice.toFixed(2)}
            />
          </div>
        </div>

        <div className="svc-row">
          <label>Approx. weekly service (no chem)</label>
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="text"
              readOnly
              value={calc.weeklyServiceTotal.toFixed(2)}
            />
          </div>
        </div>

        <div className="svc-row">
          <label>Approx. weekly total (service + chem)</label>
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

        <div className="svc-row">
          <label>Estimated monthly recurring</label>
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
