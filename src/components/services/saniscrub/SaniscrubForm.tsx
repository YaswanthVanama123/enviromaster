// src/features/services/saniscrub/SaniscrubForm.tsx
import React from "react";
import { useSaniscrubCalc } from "./useSaniscrubCalc";
import type { SaniscrubFormState } from "./saniscrubTypes";
import type { ServiceInitialData } from "../common/serviceTypes";
import {
  saniscrubPricingConfig as cfg,
  saniscrubFrequencyLabels,
} from "./saniscrubConfig";

/**
 * SaniScrub form
 *
 * This is 100% driven by the JSON + rules:
 *  - fixtures priced per frequency (with minimums)
 *  - optional non-bathroom sq ft blocks (250/125 rule)
 *  - 2×/month discount when combined with SaniClean
 *  - trip charge based on location + parking
 *  - install = 1× clean / 3× dirty
 */
export const SaniscrubForm: React.FC<
  ServiceInitialData<SaniscrubFormState>
> = ({ initialData, onQuoteChange }) => {
  const { form, onChange, quote, calc } = useSaniscrubCalc(initialData);

  // Push quote up to parent aggregator whenever it changes
  React.useEffect(() => {
    if (onQuoteChange) {
      onQuoteChange(quote);
    }
  }, [onQuoteChange, quote]);

  // Headline per-fixture rate for the UI row
  const displayFixtureRate = (() => {
    if (form.frequency === "monthly") {
      return cfg.fixtureRates.monthly;
    }
    if (form.frequency === "twicePerMonth") {
      // With SaniClean we show the discounted *incremental* rate
      if (form.hasSaniClean) {
        const base = cfg.fixtureRates.monthly;
        const eff = Math.max(
          base - cfg.twoTimesPerMonthDiscountPerFixture,
          0
        );
        return eff;
      }
      // Fallback: behave like plain monthly rate
      return cfg.fixtureRates.twicePerMonth;
    }
    if (form.frequency === "bimonthly") {
      return cfg.fixtureRates.bimonthly;
    }
    return cfg.fixtureRates.quarterly;
  })();

  const fixtureLineTotal = form.fixtureCount * displayFixtureRate;

  return (
    <div className="svc-card">
      <div className="svc-h-row">
        <div className="svc-h">SANISCRUB</div>
        {/* keep + button consistent with other cards (add/duplicate later if needed) */}
        <button type="button" className="svc-mini" aria-label="add">
          +
        </button>
      </div>

      {/* Combined with SaniClean (needed for 2× month discount) */}
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
            readOnly
            value={displayFixtureRate}
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

      {/* Minimum reminder row */}
      <div className="svc-row svc-row-note">
        <label></label>
        <div className="svc-row-right">
          <span className="svc-micro-note">
            Minimums: Monthly/2× = ${cfg.minimums.monthly} ·
            Bi-Monthly/Quarterly = ${cfg.minimums.bimonthly}
          </span>
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
            {Object.entries(saniscrubFrequencyLabels).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              )
            )}
          </select>
        </div>
      </div>

      {/* Trip charge: location + parking */}
      <div className="svc-row">
        <label>Trip &amp; Location</label>
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
            <span>Parking Needed (+${cfg.parkingFee})</span>
          </label>
        </div>
      </div>

      {/* Install (3× dirty / 1× clean) – one-time job */}
      {/* <div className="svc-row"> */}
      {/* Install (3× dirty / 1× clean) – one-time job */}
<div className="svc-row svc-row-install">

        <label>Install Quote</label>
        <div className="svc-row-right">
          <label className="svc-inline">
            <input
              type="checkbox"
              name="includeInstall"
              checked={form.includeInstall}
              onChange={onChange}
            />
            <span>Install</span>
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
            value={
              calc.installOneTime > 0
                ? `$${calc.installOneTime.toFixed(2)} one-time`
                : "$0 one-time"
            }
          />
        </div>
      </div>

      {/* Totals – match SaniClean/RPM layout */}
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
        <label>Per-Visit Effective</label>
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
