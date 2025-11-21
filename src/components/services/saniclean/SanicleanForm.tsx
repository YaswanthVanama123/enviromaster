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
      {/* TITLE BAR (matches screenshot) */}
      {/* <div className="svc-title">
        SANICLEAN — RESTROOM &amp; HYGIENE 
      </div> */}
      <div className="svc-h-row">
        <div className="svc-h">SANICLEAN — RESTROOM &amp; HYGIENE</div>
        <button type="button" className="svc-mini" aria-label="add">
          +
        </button>
      </div>

      {/* CORE SETUP */}
      {/* <div className="svc-h">Core Setup</div> */}

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
          <input
            className="svc-in"
            type="number"
            name="fixtureCount"
            value={form.fixtureCount}
            onChange={onChange}
          />
        </div>
      </div>

      {/* Location + Parking */}
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
          {form.location === "insideBeltway" && (
            <label className="svc-inline">
              <input
                type="checkbox"
                name="needsParking"
                checked={form.needsParking}
                onChange={onChange}
              />
              <span>Parking Required</span>
            </label>
          )}
        </div>
      </div>

      {/* Fixture breakdown: sinks / urinals / toilets */}
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
            <div className="svc-inline">
              <span>Bathrooms</span>
              <input
                className="svc-in sm"
                type="number"
                name="microfiberBathrooms"
                value={form.microfiberBathrooms}
                onChange={onChange}
              />
              <span className="svc-label-light">@ $10/bathroom/week</span>
            </div>
          )}
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
          <input
            className="svc-note-line"
            type="text"
            name="notes"
            value={form.notes}
            onChange={onChange}
            placeholder="Internal notes"
          />
        </div>
      </div>

      {/* PRICING SUMMARY (inside same card, under Core Setup) */}
      <div className="svc-h" style={{ marginTop: 10 }}>
        Pricing Summary
      </div>

      <div className="svc-row">
        <label>Method</label>
        <div className="svc-row-right">
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={calc.method}
          />
        </div>
      </div>

      <div className="svc-row">
        <label>Weekly Total (Service)</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in-box"
              type="text"
              readOnly
              value={calc.weeklyTotal.toFixed(2)}
            />
          </div>
        </div>
      </div>

      <div className="svc-row">
        <label>Monthly Recurring</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in-box"
              type="text"
              readOnly
              value={calc.monthlyTotal.toFixed(2)}
            />
          </div>
        </div>
      </div>

      <div className="svc-row">
        <label>Annual Recurring</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in-box"
              type="text"
              readOnly
              value={calc.annualTotal.toFixed(2)}
            />
          </div>
        </div>
      </div>

      <div className="svc-row">
        <label>Dispenser Count (auto)</label>
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
