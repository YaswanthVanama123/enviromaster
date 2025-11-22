// src/features/services/saniclean/SanicleanForm.tsx
import React from "react";
import "../ServicesSection.css"; // adjust path if different
import { useSanicleanCalc } from "./useSanicleanCalc";
import type { SanicleanFormState } from "./sanicleanTypes";
import type { ServiceInitialData } from "../common/serviceTypes";

export const SanicleanForm: React.FC<
  ServiceInitialData<SanicleanFormState>
> = ({ initialData }) => {
  const { form, onChange, calc } = useSanicleanCalc(initialData);

  return (
    <div className="svc-card">
      {/* HEADER */}
      {/* <div className="svc-title">
        <div>
          <div className="svc-title-main">SaniClean</div>
          <div className="svc-title-sub">
            Core weekly restroom sanitization service
          </div>
        </div>
      </div> */}

      <div className="svc-h-row">
        <div className="svc-h">Sani Clean</div>
        <button type="button" className="svc-mini" aria-label="add">
          +
        </button>
      </div>



      {/* Pricing Mode */}
      <div className="svc-row">
        <label>Pricing Mode</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="pricingMode"
            value={form.pricingMode}
            onChange={onChange}
          >
            <option value="auto">Auto (recommended)</option>
            <option value="all_inclusive">All Inclusive</option>
            <option value="geographic_standard">Standard</option>
          </select>
        </div>
      </div>

      {/* Total Restroom Fixtures */}
      <div className="svc-row">
        <label>Total Restroom Fixtures</label>
        <div className="svc-row-right">
          {/* fixtureCount is derived, but we show it read-only to match spec */}
          <input
            className="svc-in"
            type="number"
            name="fixtureCount"
            value={form.fixtureCount}
            onChange={onChange}
            readOnly
          />
        </div>
      </div>

      {/* Location */}
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

      {/* Parking (inside beltway) */}
      <div className="svc-row">
        <label>Parking</label>
        <div className="svc-row-right">
          {form.location === "insideBeltway" ? (
            <label className="svc-inline">
              <input
                type="checkbox"
                name="needsParking"
                checked={form.needsParking}
                onChange={onChange}
              />
              <span>Parking needed (+trip parking fee)</span>
            </label>
          ) : (
            <span className="svc-muted">Not applicable outside beltway</span>
          )}
        </div>
      </div>

      {/* FIXTURE BREAKDOWN HEADER */}
      <div className="svc-h" style={{ marginTop: 10 }}>
        Fixture Breakdown
      </div>

      {/* Sinks */}
      <div className="svc-row">
        <label>Sinks</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="sinks"
            value={form.sinks}
            onChange={onChange}
          />
        </div>
      </div>

      {/* Urinals */}
      <div className="svc-row">
        <label>Urinals</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="urinals"
            value={form.urinals}
            onChange={onChange}
          />
        </div>
      </div>

      {/* Male Toilets */}
      <div className="svc-row">
        <label>Male Toilets</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="maleToilets"
            value={form.maleToilets}
            onChange={onChange}
          />
        </div>
      </div>

      {/* Female Toilets */}
      <div className="svc-row">
        <label>Female Toilets</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="femaleToilets"
            value={form.femaleToilets}
            onChange={onChange}
          />
        </div>
      </div>

      {/* Soap & Upgrades */}
      <div className="svc-h" style={{ marginTop: 10 }}>
        Soap, Air Freshener & Upgrades
      </div>

      <div className="svc-row">
        <label>Soap &amp; Upgrades</label>
        <div className="svc-row-right svc-inline">
          <span>Type</span>
          <select
            className="svc-in sm"
            name="soapType"
            value={form.soapType}
            onChange={onChange}
          >
            <option value="standard">Standard</option>
            <option value="luxury">Luxury (+$5/dispenser/wk)</option>
          </select>
          <span>Extra Gallons / Week</span>
          <input
            className="svc-in sm"
            type="number"
            name="excessSoapGallonsPerWeek"
            value={form.excessSoapGallonsPerWeek}
            onChange={onChange}
          />
        </div>
      </div>

      {/* Microfiber Mopping */}
      <div className="svc-row">
        <label>Microfiber Mopping</label>
        <div className="svc-row-right">
          <div className="svc-micro">
            <label className="svc-inline">
              <input
                type="checkbox"
                name="addMicrofiberMopping"
                checked={form.addMicrofiberMopping}
                onChange={onChange}
              />
              <span>Add Microfiber Mopping</span>
            </label>

            {form.addMicrofiberMopping && (
              <div className="svc-micro-inner">
                <div className="svc-inline">
                  <span>Bathrooms</span>
                  <input
                    className="svc-in xs"
                    type="number"
                    name="microfiberBathrooms"
                    value={form.microfiberBathrooms}
                    onChange={onChange}
                  />
                  <span className="svc-muted">
                    $10 / bathroom / week (if not all-inclusive)
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Paper usage (all-inclusive credit) */}
      <div className="svc-row">
        <label>Paper Spend / Week</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="estimatedPaperSpendPerWeek"
            value={form.estimatedPaperSpendPerWeek}
            onChange={onChange}
          />
          {/* <div className="svc-help">
            In all-inclusive, customer gets $5/week per fixture credit.
            Overage is charged.
          </div> */}
        </div>
      </div>

      {/* Rate Tier */}
      <div className="svc-row">
        <label>Rate Tier</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="rateTier"
            value={form.rateTier}
            onChange={onChange}
          >
            <option value="redRate">Red (standard)</option>
            <option value="greenRate">Green (premium)</option>
          </select>
        </div>
      </div>

      {/* Notes */}
      <div className="svc-row">
        <label>Notes</label>
        <div className="svc-row-right">
          <textarea
            className="svc-in"
            name="notes"
            value={form.notes}
            onChange={onChange}
            rows={3}
          />
        </div>
      </div>

      {/* SUMMARY / OUTPUT */}
      <div className="svc-h" style={{ marginTop: 16 }}>
        Pricing Summary
      </div>

      <div className="svc-row">
        <label>Chosen Method</label>
        <div className="svc-row-right">
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={
              calc.method === "all_inclusive"
                ? "All Inclusive"
                : calc.method === "small_facility_minimum"
                ? "Small Facility Minimum"
                : "Geographic Standard"
            }
          />
        </div>
      </div>

      <div className="svc-row">
        <label>Weekly Total (Service + Trip)</label>
        <div className="svc-row-right">
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={`$${calc.weeklyTotal.toFixed(2)}`}
          />
        </div>
      </div>

      <div className="svc-row">
        <label>Monthly Recurring</label>
        <div className="svc-row-right">
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={`$${calc.monthlyTotal.toFixed(2)}`}
          />
        </div>
      </div>

      <div className="svc-row">
        <label>Annual Recurring</label>
        <div className="svc-row-right">
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={`$${calc.annualTotal.toFixed(2)}`}
          />
        </div>
      </div>

      {/* Dispenser Count */}
      <div className="svc-row">
        <label>Total Dispensers (soap + air freshener, auto)</label>
        <div className="svc-row-right">
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={calc.dispenserCount ?? 0}
          />
        </div>
      </div>
    </div>
  );
};

export default SanicleanForm;
