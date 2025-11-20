// src/features/services/saniscrub/SaniscrubForm.tsx
import React from "react";
import { useSaniscrubCalc } from "./useSaniscrubCalc";
import type { SaniscrubFormState } from "./saniscrubTypes";
import type { ServiceInitialData } from "../common/serviceTypes";
import { saniscrubPricingConfig as cfg } from "./saniscrubConfig";

export const SaniscrubForm: React.FC<
  ServiceInitialData<SaniscrubFormState>
> = ({ initialData }) => {
  const { form, onChange, quote, calc } = useSaniscrubCalc(initialData);

  // For display: per-fixture "headline" rate based on frequency
  const displayFixtureRate =
    form.frequency === "monthly"
      ? cfg.fixtureRates.monthly
      : form.frequency === "twicePerMonth"
      ? cfg.fixtureRates.twicePerMonth
      : form.frequency === "bimonthly"
      ? cfg.fixtureRates.bimonthly
      : cfg.fixtureRates.quarterly;

  const fixtureLineTotal = form.fixtureCount * displayFixtureRate;

  return (
    <div className="svc-card">
      <div className="svc-h-row">
        <div className="svc-h">SANISCRUB</div>
        <button type="button" className="svc-mini" aria-label="add">
          +
        </button>
      </div>

      {/* Combined with SaniClean (needed for 2x month discount) */}
      <div className="svc-row">
        <label>Combined with SaniClean?</label>
        <div className="svc-row-right">
          <label className="svc-inline">
            <input
              type="checkbox"
              name="hasSaniClean"
              checked={form.hasSaniClean}
              onChange={onChange}
            />
            <span>Yes</span>
          </label>
        </div>
      </div>

      {/* Restroom fixtures */}
      <div className="svc-row">
        <label>Restroom Fixtures</label>
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
            value={displayFixtureRate}
            readOnly
          />
          <span>=</span>
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={`$${fixtureLineTotal.toFixed(2)}`}
          />
        </div>
      </div>

      {/* Non-bathroom SaniScrub area */}
      <div className="svc-row">
        <label>Non-Bathroom Sq Ft</label>
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
            type="text"
            readOnly
            value="1st 500 = 250; +125/500"
          />
          <span>=</span>
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={
              calc.nonBathroomPerVisit > 0
                ? `$${calc.nonBathroomPerVisit.toFixed(2)} / visit`
                : "$0.00"
            }
          />
        </div>
      </div>

      {/* Frequency selection */}
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
            <option value="twicePerMonth">2× / Month (with Sani)</option>
            <option value="bimonthly">Every 2 Months</option>
            <option value="quarterly">Quarterly</option>
          </select>
        </div>
      </div>

      {/* Location + Parking (trip charge logic) */}
      <div className="svc-row">
        <label>Trip & Location</label>
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

          <label className="svc-inline">
            <input
              type="checkbox"
              name="tripChargeIncluded"
              checked={!!form.tripChargeIncluded}
              onChange={onChange}
            />
            <span>Include Trip</span>
          </label>
        </div>
      </div>

      {/* Install (3× dirty / 1× clean) – one-time job */}
      <div className="svc-row">
        <label>Install Quote</label>
        <div className="svc-row-right">
          <label className="svc-inline">
            <input
              type="checkbox"
              name="includeInstall"
              checked={form.includeInstall}
              onChange={onChange}
            />
            <span>Include Install</span>
          </label>
          <label className="svc-inline">
            <input
              type="checkbox"
              name="isDirtyInstall"
              checked={form.isDirtyInstall}
              onChange={onChange}
            />
            <span>Dirty (3×)</span>
          </label>
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={`$${calc.installOneTime.toFixed(2)} one-time`}
          />
        </div>
      </div>

      {/* Totals – same layout style */}
      <div className="svc-row svc-row-charge">
        <label>Monthly SaniScrub</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="text"
              readOnly
              value={calc.monthlyTotal.toFixed(2)}
            />
          </div>
        </div>
      </div>

      <div className="svc-row svc-row-charge">
        <label>Annual SaniScrub</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="text"
              readOnly
              value={calc.annualTotal.toFixed(2)}
            />
          </div>
        </div>
      </div>

      <div className="svc-row svc-row-charge">
        <label>Effective Per Visit</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="text"
              readOnly
              value={calc.perVisitEffective.toFixed(2)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
