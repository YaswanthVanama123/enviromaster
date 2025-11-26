// src/components/services/microfiberMopping/MicrofiberMoppingForm.tsx
import React, { useEffect, useRef, useState } from "react";
import { useMicrofiberMoppingCalc } from "./useMicrofiberMoppingCalc";
import type { MicrofiberMoppingFormState } from "./microfiberMoppingTypes";
import type { ServiceInitialData } from "../common/serviceTypes";
import { microfiberMoppingPricingConfig as cfg } from "./microfiberMoppingConfig";
import { useServicesContextOptional } from "../ServicesContext";
import { CustomFieldManager, type CustomField } from "../CustomFieldManager";

export const MicrofiberMoppingForm: React.FC<
  ServiceInitialData<MicrofiberMoppingFormState>
> = ({ initialData }) => {
  const { form, onChange, calc } = useMicrofiberMoppingCalc(initialData);
  const servicesContext = useServicesContextOptional();

  // Custom fields state
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  // Check if SaniClean All-Inclusive is active
  const isSanicleanAllInclusive =
    servicesContext?.isSanicleanAllInclusive ?? false;

  // Save form data to context for form submission
  const prevDataRef = useRef<string>("");

  useEffect(() => {
    if (servicesContext) {
      const isActive = (form.bathroomCount ?? 0) > 0 || (form.hugeBathroomSqFt ?? 0) > 0 || (form.extraAreaSqFt ?? 0) > 0;
      const data = isActive ? { ...form, ...calc, isActive } : null;
      const dataStr = JSON.stringify(data);

      if (dataStr !== prevDataRef.current) {
        prevDataRef.current = dataStr;
        servicesContext.updateService("microfiberMopping", data);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, calc]);

  const extraAreaRatePerSqFt =
    cfg.extraAreaPricing.extraAreaRatePerUnit /
    cfg.extraAreaPricing.extraAreaSqFtUnit;

  const isBathroomDisabled =
    form.isHugeBathroom || (form.hugeBathroomSqFt ?? 0) > 0;

  return (
    <div className="svc-card">
      {/* Header */}
      <div className="svc-h-row">
        <div className="svc-h">MICROFIBER MOPPING</div>
        <div className="svc-h-actions">
          <button
            type="button"
            className="svc-btn svc-btn--small"
            onClick={() => setShowAddDropdown(!showAddDropdown)}
          >
            + Field
          </button>
        </div>
      </div>

      {/* Custom fields manager - appears at the top */}
      <CustomFieldManager
        fields={customFields}
        onFieldsChange={setCustomFields}
        showAddDropdown={showAddDropdown}
        onToggleAddDropdown={setShowAddDropdown}
      />

      {/* Alert when included in SaniClean All-Inclusive */}
      {isSanicleanAllInclusive && (
        <div
          className="svc-row"
          style={{
            backgroundColor: "#e8f5e9",
            border: "2px solid #4caf50",
            padding: "12px",
            marginBottom: "10px",
            borderRadius: "4px",
          }}
        >
          <div style={{ fontWeight: "bold", color: "#2e7d32", fontSize: "14px" }}>
            ✓ INCLUDED in SaniClean All-Inclusive Package
          </div>
          <div style={{ fontSize: "13px", color: "#555", marginTop: "4px" }}>
            Microfiber Mopping is already included at no additional charge ($10/bathroom waived).
          </div>
        </div>
      )}

      {/* Link to existing Sani program */}
      <div className="svc-row">
        <label>Combined with existing Sani program?</label>
        <div className="svc-row-right">
          <label className="svc-check">
            <input
              type="checkbox"
              name="hasExistingSaniService"
              checked={form.hasExistingSaniService}
              onChange={onChange}
            />
            <span>Yes, bathrooms already on Sani</span>
          </label>
        </div>
      </div>

      {/* All-inclusive flag */}
      <div className="svc-row">
        <label>Part of all-inclusive package?</label>
        <div className="svc-row-right">
          <label className="svc-check">
            <input
              type="checkbox"
              name="isAllInclusive"
              checked={form.isAllInclusive}
              onChange={onChange}
            />
            <span>Yes, microfiber is included (do not price separately)</span>
          </label>
        </div>
      </div>

      {/* Standard bathrooms */}
      <div className="svc-row">
        <label>Standard bathrooms (#)</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="bathroomCount"
            value={form.bathroomCount}
            onChange={onChange}
            disabled={
              isBathroomDisabled || !form.hasExistingSaniService || form.isAllInclusive
            }
          />
          <span>@</span>
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="text"
              readOnly
              value={cfg.includedBathroomRate.toFixed(2)}
            />
          </div>
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
            disabled={form.isAllInclusive || !form.hasExistingSaniService}
          />
          <span>@</span>
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="text"
              readOnly
              value={cfg.hugeBathroomPricing.ratePerSqFt.toFixed(2)}
            />
          </div>
          {/* <span>per {cfg.hugeBathroomPricing.sqFtUnit} sq ft</span> */}
          <span>=</span>
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={`$${calc.hugeBathroomPrice.toFixed(2)}`}
          />
        </div>
      </div>

      {/* Extra non-bathroom area */}
      <div className="svc-row">
        <label>Extra non-bathroom area (sq ft)</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="extraAreaSqFt"
            value={form.extraAreaSqFt}
            onChange={onChange}
            disabled={form.isAllInclusive}
          />
          <span>@</span>
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="text"
              readOnly
              value={extraAreaRatePerSqFt.toFixed(2)}
            />
          </div>
          {/* <span>per sq ft (min ${cfg.extraAreaPricing.singleLargeAreaRate})</span> */}
          <span>=</span>
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={`$${calc.extraAreaPrice.toFixed(2)}`}
          />
        </div>
      </div>

      {/* Standalone microfiber mopping */}
      <div className="svc-row">
        <label>Standalone microfiber mopping (sq ft)</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="standaloneSqFt"
            value={form.standaloneSqFt}
            onChange={onChange}
            disabled={form.isAllInclusive}
          />
          <span>@</span>
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="text"
              readOnly
              value={cfg.standalonePricing.standaloneRatePerUnit.toFixed(2)}
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

      {/* Standalone trip (location / parking) – layout fixed, math locked to 0 */}
      {/* <div className="svc-row">
        <label>Standalone trip (location / parking)</label>
        <div className="svc-row-right">

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
              <option value="insideBeltway">Inside beltway</option>
              <option value="outsideBeltway">Outside beltway</option>
            </select>
            <label className="svc-check">
              <input
                type="checkbox"
                name="needsParking"
                checked={form.needsParking}
                onChange={onChange}
              />
              <span>Parking / garage fees</span>
            </label>
            <span style={{ fontSize: "0.85rem", opacity: 0.8 }}>
              (Trip charge is visible but not used in math – locked to $0.00)
            </span>
          </div>


          <div
            style={{
              marginTop: "0.25rem",
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
      </div> */}

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
              type="text"
              readOnly
              value={cfg.chemicalProducts.dailyChemicalPerGallon.toFixed(2)}
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
            <option value="biweekly">Bi-weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </div>

      {/* Summary block */}
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

        {/* NEW: contract term dropdown (2–36 months) */}
        <div className="svc-row">
          <label>Contract term (months)</label>
          <div className="svc-row-right">
            <select
              className="svc-in"
              name="contractTermMonths"
              value={form.contractTermMonths}
              onChange={onChange}
            >
              {Array.from({ length: 35 }, (_, i) => i + 2).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* NEW: First month total using 4.33 → 3.33 rule for weekly */}
        <div className="svc-row">
          <label>First month total</label>
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="text"
              readOnly
              value={calc.firstMonthPrice.toFixed(2)}
            />
          </div>
        </div>

        {/* NEW: Total contract price for selected months */}
        <div className="svc-row">
          <label>Total contract value</label>
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="text"
              readOnly
              value={calc.contractTotal.toFixed(2)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
