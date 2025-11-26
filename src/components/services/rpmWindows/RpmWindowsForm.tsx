// src/features/services/rpmWindows/RpmWindowsForm.tsx
import React, { useEffect } from "react";
import { useRpmWindowsCalc } from "./useRpmWindowsCalc";
import type { RpmWindowsFormState } from "./rpmWindowsTypes";
import type { ServiceInitialData } from "../common/serviceTypes";
import { useServicesContextOptional } from "../ServicesContext";

export const RpmWindowsForm: React.FC<
  ServiceInitialData<RpmWindowsFormState>
> = ({ initialData }) => {
  const {
    form,
    setForm,
    onChange,
    addExtraCharge,
    updateExtraCharge,
    calc,
    quote,
  } = useRpmWindowsCalc(initialData);
  const servicesContext = useServicesContextOptional();

  // Save form data to context for form submission
  useEffect(() => {
    if (servicesContext) {
      const isActive = (form.smallWindows ?? 0) > 0 || (form.mediumWindows ?? 0) > 0 || (form.largeWindows ?? 0) > 0;
      if (isActive) {
        servicesContext.updateService("rpmWindows", {
          ...form,
          ...calc,
          ...quote,
          isActive,
        });
      } else {
        servicesContext.updateService("rpmWindows", null);
      }
    }
  }, [form, calc, quote, servicesContext]);

  const handleInstallTypeChange = (value: "first" | "clean") =>
    setForm((prev) => ({ ...prev, isFirstTimeInstall: value === "first" }));

  // Installation Fee + First Visit (now: install-only first visit)
  const installationFeeDisplay = form.isFirstTimeInstall
    ? calc.firstVisitTotalRated
    : 0;

  return (
    <div className="svc-card">
      <div className="svc-h-row">
        <div className="svc-h">RPM WINDOW</div>
        <button type="button" className="svc-mini" onClick={addExtraCharge}>
          +
        </button>
      </div>

      {/* Small */}
      <div className="svc-row">
        <label>Small Windows</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            name="smallQty"
            type="number"
            value={form.smallQty}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in"
            name="smallWindowRate"
            type="number"
            value={calc.effSmall.toFixed(2)}
            onChange={onChange}
          />
          <span>=</span>
          <input
            className="svc-in-box"
            readOnly
            value={`$${(form.smallQty * calc.effSmall).toFixed(2)}`}
          />
        </div>
      </div>

      {/* Medium */}
      <div className="svc-row">
        <label>Medium Windows</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            name="mediumQty"
            type="number"
            value={form.mediumQty}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in"
            name="mediumWindowRate"
            type="number"
            value={calc.effMedium.toFixed(2)}
            onChange={onChange}
          />
          <span>=</span>
          <input
            className="svc-in-box"
            readOnly
            value={`$${(form.mediumQty * calc.effMedium).toFixed(2)}`}
          />
        </div>
      </div>

      {/* Large */}
      <div className="svc-row">
        <label>Large Windows</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            name="largeQty"
            type="number"
            value={form.largeQty}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in"
            name="largeWindowRate"
            type="number"
            value={calc.effLarge.toFixed(2)}
            onChange={onChange}
          />
          <span>=</span>
          <input
            className="svc-in-box"
            readOnly
            value={`$${(form.largeQty * calc.effLarge).toFixed(2)}`}
          />
        </div>
      </div>

      {/* + Added extra lines */}
      {form.extraCharges.map((line) => (
        <div className="svc-row" key={line.id}>
          <div className="svc-row-right">
            <input
              className="svc-in"
              type="text"
              placeholder="Calc"
              value={line.calcText}
              onChange={(e) =>
                updateExtraCharge(line.id, "calcText", e.target.value)
              }
            />
            <input
              className="svc-in"
              type="text"
              placeholder="Text"
              value={line.description}
              onChange={(e) =>
                updateExtraCharge(line.id, "description", e.target.value)
              }
            />
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                type="number"
                value={line.amount}
                onChange={(e) =>
                  updateExtraCharge(line.id, "amount", e.target.value)
                }
              />
            </div>
          </div>
        </div>
      ))}

      {/* Trip Charge */}
      {/* <div className="svc-row svc-row-charge">
        <label>Trip Charge</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="number"
              value={calc.effTrip.toFixed(2)}
              readOnly
            />
          </div>
          <label className="svc-inline">
            <input type="checkbox" checked readOnly />
            <span>Include</span>
          </label>
        </div>
      </div> */}

      {/* Install Fee + First Visit */}
      <div className="svc-row svc-row-charge">
        <label>Installation Fee + First Visit</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="text"
              readOnly
              value={installationFeeDisplay.toFixed(2)}
            />
          </div>
        </div>
      </div>

      {/* Install Type */}
      <div className="svc-row">
        <label>Install Type</label>
        <div className="svc-row-right">
          <label className="svc-inline">
            <input
              type="radio"
              value="first"
              checked={form.isFirstTimeInstall}
              onChange={() => handleInstallTypeChange("first")}
            />
            <span>First Time (Install)</span>
          </label>
          <label className="svc-inline">
            <input
              type="radio"
              value="clean"
              checked={!form.isFirstTimeInstall}
              onChange={() => handleInstallTypeChange("clean")}
            />
            <span>Ongoing / Clean</span>
          </label>
        </div>
      </div>

      {/* Frequency */}
      <div className="svc-row">
        <label>Service Frequency</label>
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
            <option value="quarterly">Quarterly</option>
          </select>
        </div>
      </div>

      {/* Rate Category */}
      {/* <div className="svc-row">
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
      </div> */}

      {/* Mirror */}
      <div className="svc-row">
        <label>Mirror Cleaning</label>
        <div className="svc-row-right">
          <label className="svc-inline">
            <input
              type="checkbox"
              name="includeMirrors"
              checked={form.includeMirrors}
              onChange={onChange}
            />
            <span>Include (same chemicals)</span>
          </label>
        </div>
      </div>

      {/* Total Per Visit */}
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

      {/* Monthly Recurring – HIDE for Quarterly */}
      {form.frequency !== "quarterly" && (
        <div className="svc-row svc-row-charge">
          <label>Monthly Recurring</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                type="text"
                readOnly
                value={calc.monthlyBillRated.toFixed(2)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Annual Price (now: total for selected months) */}
      <div className="svc-row svc-row-charge">
        <label>Annual Price</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="contractMonths"
            value={form.contractMonths}
            onChange={onChange}
          >
            {Array.from({ length: 35 }, (_, i) => i + 2).map((m) => (
              <option key={m} value={m}>
                {m} months
              </option>
            ))}
          </select>
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="text"
              readOnly
              value={quote.annualPrice.toFixed(2)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
