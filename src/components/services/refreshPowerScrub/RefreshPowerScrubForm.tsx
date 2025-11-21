// src/features/services/refreshPowerScrub/RefreshPowerScrubForm.tsx
import React from "react";
import { useRefreshPowerScrubCalc } from "./useRefreshPowerScrubCalc";
import type { RefreshPowerScrubFormState } from "./refreshPowerScrubTypes";
import type { ServiceInitialData } from "../common/serviceTypes";

export const RefreshPowerScrubForm: React.FC<
  ServiceInitialData<RefreshPowerScrubFormState>
> = ({ initialData }) => {
  const { form, onChange, quote } = useRefreshPowerScrubCalc(initialData);

  const labourLine =
    form.workers * form.hours * form.hourlyRatePerWorker;

  // ----- values that will be shown in the table -----
  const amountStr =
    quote.perVisitPrice > 0 ? quote.perVisitPrice.toFixed(2) : "";
  const freqStr = form.frequency || "";

  // put the per-visit amount + freq into the column
  // that matches the selected areaType
  const dumpsterAmount = form.areaType === "dumpster" ? amountStr : "";
  const patioAmount = form.areaType === "patio" ? amountStr : "";
  const walkwayAmount = ""; // we don’t have a separate area type yet
  const fohAmount =
    form.areaType === "frontOfHouse" ? amountStr : "";
  const bohAmount = form.areaType === "kitchen" ? amountStr : "";
  const otherAmount = "";

  const dumpsterFreq = form.areaType === "dumpster" ? freqStr : "";
  const patioFreq = form.areaType === "patio" ? freqStr : "";
  const walkwayFreq = "";
  const fohFreq =
    form.areaType === "frontOfHouse" ? freqStr : "";
  const bohFreq = form.areaType === "kitchen" ? freqStr : "";
  const otherFreq = "";

  return (
    <div className="svc-card">
      <div className="svc-h-row">
        <div className="svc-h">REFRESH POWER SCRUB</div>
        <button type="button" className="svc-mini" aria-label="add">
          +
        </button>
      </div>

      {/* Area selector */}
      <div className="svc-row">
        <label>Area</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="areaType"
            value={form.areaType}
            onChange={onChange}
          >
            <option value="kitchen">Kitchen / BOH</option>
            <option value="frontOfHouse">Front of House</option>
            <option value="patio">Patio</option>
            <option value="dumpster">Dumpster</option>
          </select>
        </div>
      </div>

      {/* Workers / hours line */}
      <div className="svc-row">
        <label>Workers / Hours</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="workers"
            value={form.workers}
            onChange={onChange}
          />
          <span>×</span>
          <input
            className="svc-in"
            type="number"
            step={0.5}
            name="hours"
            value={form.hours}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in"
            type="number"
            name="hourlyRatePerWorker"
            value={form.hourlyRatePerWorker}
            onChange={onChange}
          />
          <span>=</span>
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={`$${labourLine.toFixed(2)}`}
          />
        </div>
      </div>

      {/* Trip charge */}
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

      {/* Minimum visit */}
      <div className="svc-row svc-row-charge">
        <label>Minimum Visit</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="number"
              name="minimumVisit"
              value={form.minimumVisit}
              onChange={onChange}
            />
          </div>
        </div>
      </div>

      {/* Frequency (this is what shows up as "Freq" in the table) */}
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
            <option value="bimonthly">Bi-Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
        </div>
      </div>

      {/* NO separate “Total Price” / “Annual Price” rows now.
          The per-visit price is only surfaced inside the table. */}

      {/* PDF-style table – all numbers land here */}
      <div style={{ marginTop: 16 }}>
        <div className="rps-wrap">
          <table className="rps">
            <tbody>
              {/* Row 1: amounts */}
              <tr>
                <td>
                  <div className="rps-inline">
                    <span className="rps-label">Dumpster $</span>
                    <input
                      className="rps-line"
                      type="text"
                      readOnly
                      value={dumpsterAmount}
                    />
                  </div>
                </td>
                <td>
                  <div className="rps-inline">
                    <span className="rps-label">Patio $</span>
                    <input
                      className="rps-line"
                      type="text"
                      readOnly
                      value={patioAmount}
                    />
                  </div>
                </td>
                <td>
                  <div className="rps-inline">
                    <span className="rps-label">Walkway $</span>
                    <input
                      className="rps-line"
                      type="text"
                      readOnly
                      value={walkwayAmount}
                    />
                  </div>
                </td>
                <td>
                  <div className="rps-inline">
                    <span className="rps-label">FOH $</span>
                    <input
                      className="rps-line"
                      type="text"
                      readOnly
                      value={fohAmount}
                    />
                  </div>
                </td>
                <td>
                  <div className="rps-inline">
                    <span className="rps-label">BOH $</span>
                    <input
                      className="rps-line"
                      type="text"
                      readOnly
                      value={bohAmount}
                    />
                  </div>
                </td>
                <td>
                  <div className="rps-inline">
                    <span className="rps-label">Other $</span>
                    <input
                      className="rps-line"
                      type="text"
                      readOnly
                      value={otherAmount}
                    />
                  </div>
                </td>
              </tr>

              {/* Row 2: frequencies */}
              <tr>
                <td>
                  <div className="rps-inline">
                    <span className="rps-label">Freq</span>
                    <input
                      className="rps-line"
                      type="text"
                      readOnly
                      value={dumpsterFreq}
                    />
                  </div>
                </td>
                <td>
                  <div className="rps-inline">
                    <span className="rps-label">Freq</span>
                    <input
                      className="rps-line"
                      type="text"
                      readOnly
                      value={patioFreq}
                    />
                  </div>
                </td>
                <td>
                  <div className="rps-inline">
                    <span className="rps-label">Freq</span>
                    <input
                      className="rps-line"
                      type="text"
                      readOnly
                      value={walkwayFreq}
                    />
                  </div>
                </td>
                <td>
                  <div className="rps-inline">
                    <span className="rps-label">Freq</span>
                    <input
                      className="rps-line"
                      type="text"
                      readOnly
                      value={fohFreq}
                    />
                  </div>
                </td>
                <td>
                  <div className="rps-inline">
                    <span className="rps-label">Freq</span>
                    <input
                      className="rps-line"
                      type="text"
                      readOnly
                      value={bohFreq}
                    />
                  </div>
                </td>
                <td>
                  <div className="rps-inline">
                    <span className="rps-label">Freq</span>
                    <input
                      className="rps-line"
                      type="text"
                      readOnly
                      value={otherFreq}
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
