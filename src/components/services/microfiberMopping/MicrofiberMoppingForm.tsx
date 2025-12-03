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
> = ({ initialData, onRemove }) => {
  const { form, setForm, onChange, calc } = useMicrofiberMoppingCalc(initialData);
  const servicesContext = useServicesContextOptional();

  // Custom fields state
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  // Check if SaniClean All-Inclusive is active
  const isSanicleanAllInclusive =
    servicesContext?.isSanicleanAllInclusive ?? false;

  // Save form data to context for form submission
  const prevDataRef = useRef<string>("");

  // Calculate effective rates for each service type
  const bathroomRate = form.bathroomCount > 0 && calc.bathroomTotal > 0
    ? calc.bathroomTotal / form.bathroomCount
    : form.includedBathroomRate;

  const hugeBathroomRate = form.hugeBathroomSqFt > 0 && calc.hugeBathroomTotal > 0
    ? calc.hugeBathroomTotal / form.hugeBathroomSqFt
    : form.hugeBathroomRatePerSqFt;

  const extraAreaRate = form.extraAreaSqFt > 0 && calc.extraAreaTotal > 0
    ? calc.extraAreaTotal / form.extraAreaSqFt
    : form.extraAreaRatePerUnit;

  useEffect(() => {
    if (servicesContext) {
      const isActive = (form.bathroomCount ?? 0) > 0 || (form.hugeBathroomSqFt ?? 0) > 0 || (form.extraAreaSqFt ?? 0) > 0 || (form.standaloneSqFt ?? 0) > 0 || (form.chemicalGallons ?? 0) > 0;

      const data = isActive ? {
        serviceId: "microfiberMopping",
        displayName: "Microfiber Mopping",
        isActive: true,

        frequency: {
          label: "Frequency",
          type: "text" as const,
          value: typeof form.frequency === 'string'
            ? form.frequency.charAt(0).toUpperCase() + form.frequency.slice(1)
            : String(form.frequency || ''),
        },

        serviceBreakdown: [
          ...(form.bathroomCount > 0 ? [{
            label: "Bathrooms",
            type: "calc" as const,
            qty: form.bathroomCount,
            rate: bathroomRate,
            total: calc.bathroomTotal,
          }] : []),
          ...(form.hugeBathroomSqFt > 0 ? [{
            label: "Huge Bathrooms",
            type: "calc" as const,
            qty: form.hugeBathroomSqFt,
            rate: hugeBathroomRate,
            total: calc.hugeBathroomTotal,
            unit: "sq ft",
          }] : []),
          ...(form.extraAreaSqFt > 0 ? [{
            label: "Extra Area",
            type: "calc" as const,
            qty: form.extraAreaSqFt,
            rate: extraAreaRate,
            total: calc.extraAreaTotal,
            unit: "sq ft",
          }] : []),
          ...(form.standaloneSqFt > 0 ? [{
            label: "Standalone Service",
            type: "calc" as const,
            qty: form.standaloneSqFt,
            rate: form.standaloneRatePerUnit,
            total: calc.standaloneServicePrice,
            unit: "sq ft",
          }] : []),
          ...(form.chemicalGallons > 0 ? [{
            label: "Chemical Supply",
            type: "calc" as const,
            qty: form.chemicalGallons,
            rate: form.dailyChemicalPerGallon,
            total: calc.chemicalSupplyMonthly,
            unit: "gallons",
          }] : []),
        ],

        totals: {
          perVisit: {
            label: "Per Visit Total",
            type: "dollar" as const,
            amount: calc.perVisitPrice,
          },
          monthly: {
            label: "Monthly Total",
            type: "dollar" as const,
            amount: calc.monthlyRecurring,
          },
          contract: {
            label: "Contract Total",
            type: "dollar" as const,
            months: form.contractMonths,
            amount: calc.contractTotal,
          },
        },

        notes: form.notes || "",
        customFields: customFields,
      } : null;

      const dataStr = JSON.stringify(data);

      if (dataStr !== prevDataRef.current) {
        prevDataRef.current = dataStr;
        console.log('🔧 [MicrofiberMopping] Sending to context:', JSON.stringify(data, null, 2));
        servicesContext.updateService("microfiberMopping", data);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, calc, customFields]);

  // Handler to reset custom values to undefined if left empty
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (value === '' || value === null) {
      setForm((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // Track previous values to detect actual changes (not just re-renders)
  const prevInputsRef = useRef({
    bathroomCount: form.bathroomCount,
    hugeBathroomSqFt: form.hugeBathroomSqFt,
    extraAreaSqFt: form.extraAreaSqFt,
    standaloneSqFt: form.standaloneSqFt,
    chemicalGallons: form.chemicalGallons,
    includedBathroomRate: form.includedBathroomRate,
    hugeBathroomRatePerSqFt: form.hugeBathroomRatePerSqFt,
    extraAreaRatePerUnit: form.extraAreaRatePerUnit,
    standaloneRatePerUnit: form.standaloneRatePerUnit,
    dailyChemicalPerGallon: form.dailyChemicalPerGallon,
    frequency: form.frequency,
    contractTermMonths: form.contractTermMonths,
  });

  // Clear custom totals when base inputs change
  useEffect(() => {
    const prev = prevInputsRef.current;
    const hasChanged =
      prev.bathroomCount !== form.bathroomCount ||
      prev.hugeBathroomSqFt !== form.hugeBathroomSqFt ||
      prev.extraAreaSqFt !== form.extraAreaSqFt ||
      prev.standaloneSqFt !== form.standaloneSqFt ||
      prev.chemicalGallons !== form.chemicalGallons ||
      prev.includedBathroomRate !== form.includedBathroomRate ||
      prev.hugeBathroomRatePerSqFt !== form.hugeBathroomRatePerSqFt ||
      prev.extraAreaRatePerUnit !== form.extraAreaRatePerUnit ||
      prev.standaloneRatePerUnit !== form.standaloneRatePerUnit ||
      prev.dailyChemicalPerGallon !== form.dailyChemicalPerGallon ||
      prev.frequency !== form.frequency ||
      prev.contractTermMonths !== form.contractTermMonths;

    if (hasChanged) {
      setForm((prev) => ({
        ...prev,
        customStandardBathroomTotal: undefined,
        customHugeBathroomTotal: undefined,
        customExtraAreaTotal: undefined,
        customStandaloneTotal: undefined,
        customChemicalTotal: undefined,
        customPerVisitPrice: undefined,
        customMonthlyRecurring: undefined,
        customFirstMonthPrice: undefined,
        customContractTotal: undefined,
      }));

      prevInputsRef.current = {
        bathroomCount: form.bathroomCount,
        hugeBathroomSqFt: form.hugeBathroomSqFt,
        extraAreaSqFt: form.extraAreaSqFt,
        standaloneSqFt: form.standaloneSqFt,
        chemicalGallons: form.chemicalGallons,
        includedBathroomRate: form.includedBathroomRate,
        hugeBathroomRatePerSqFt: form.hugeBathroomRatePerSqFt,
        extraAreaRatePerUnit: form.extraAreaRatePerUnit,
        standaloneRatePerUnit: form.standaloneRatePerUnit,
        dailyChemicalPerGallon: form.dailyChemicalPerGallon,
        frequency: form.frequency,
        contractTermMonths: form.contractTermMonths,
      };
    }
  }, [
    form.bathroomCount,
    form.hugeBathroomSqFt,
    form.extraAreaSqFt,
    form.standaloneSqFt,
    form.chemicalGallons,
    form.includedBathroomRate,
    form.hugeBathroomRatePerSqFt,
    form.extraAreaRatePerUnit,
    form.standaloneRatePerUnit,
    form.dailyChemicalPerGallon,
    form.frequency,
    form.contractTermMonths,
    setForm,
  ]);

  const extraAreaRatePerSqFt =
    form.extraAreaRatePerUnit /
    cfg.extraAreaPricing.extraAreaSqFtUnit;

  const isBathroomDisabled =
    form.isHugeBathroom || (form.hugeBathroomSqFt ?? 0) > 0;

  return (
    <div className="svc-card">
      {/* Header */}
      <div className="svc-h-row">
        <div className="svc-h">MICROFIBER MOPPING</div>
        <button
          type="button"
          className="svc-mini"
          onClick={() => setShowAddDropdown(!showAddDropdown)}
          title="Add custom field"
        >
          +
        </button>
        {onRemove && (
          <button
            type="button"
            className="svc-mini svc-mini--neg"
            onClick={onRemove}
            title="Remove this service"
          >
            −
          </button>
        )}
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
              type="number"
              step="0.01"
              name="includedBathroomRate"
              value={form.includedBathroomRate}
              onChange={onChange}
            />
          </div>
          <span>=</span>
          <input
            className="svc-in-box"
            type="number"
            step="0.01"
            name="customStandardBathroomTotal"
            value={
              form.customStandardBathroomTotal !== undefined
                ? form.customStandardBathroomTotal
                : calc.standardBathroomPrice
            }
            onChange={onChange}
            onBlur={handleBlur}
            style={{
              backgroundColor: form.customStandardBathroomTotal !== undefined ? '#fffacd' : 'white'
            }}
          />
        </div>
      </div>

      {/* Huge bathroom exception */}
      <div className="svc-row">
        <label>Huge bathroom(sq ft)</label>
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
              type="number"
              step="0.01"
              name="hugeBathroomRatePerSqFt"
              value={form.hugeBathroomRatePerSqFt}
              onChange={onChange}
            />
          </div>
          {/* <span className="svc-small">per {cfg.hugeBathroomPricing.sqFtUnit} sq ft</span> */}
          <span>=</span>
          <input
            className="svc-in-box"
            type="number"
            step="0.01"
            name="customHugeBathroomTotal"
            value={
              form.customHugeBathroomTotal !== undefined
                ? form.customHugeBathroomTotal
                : calc.hugeBathroomPrice
            }
            onChange={onChange}
            onBlur={handleBlur}
            style={{
              backgroundColor: form.customHugeBathroomTotal !== undefined ? '#fffacd' : 'white'
            }}
          />
        </div>
      </div>

      {/* Extra non-bathroom area */}
      <div className="svc-row">
        <label>Extra non-bathroom(sq ft)</label>
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
          <div className="svc-row-right">
            <span>$</span>
            <input
              className="svc-in"
              type="number"
              step="0.01"
              name="extraAreaRatePerUnit"
              value={extraAreaRatePerSqFt.toFixed(4)}
              onChange={onChange}
              title="Rate per 400 sq ft unit (from backend)"
            />
          </div>
          {/* <span className="svc-small">per {cfg.extraAreaPricing.extraAreaSqFtUnit} sq ft</span> */}
          <span>=</span>
          <input
            className="svc-in-box"
            type="number"
            step="0.01"
            name="customExtraAreaTotal"
            value={
              form.customExtraAreaTotal !== undefined
                ? form.customExtraAreaTotal
                : calc.extraAreaPrice
            }
            onChange={onChange}
            onBlur={handleBlur}
            style={{
              backgroundColor: form.customExtraAreaTotal !== undefined ? '#fffacd' : 'white'
            }}
          />
          {/* <span className="svc-small" style={{ marginLeft: "8px", fontStyle: "italic", color: "#666" }}>
            (≈${extraAreaRatePerSqFt.toFixed(4)}/sq ft; max: $100 flat OR rate × area)
          </span> */}
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
              type="number"
              step="0.01"
              name="standaloneRatePerUnit"
              value={form.standaloneRatePerUnit}
              onChange={onChange}
            />
          </div>
          {/* <span className="svc-small">per {cfg.standalonePricing.standaloneSqFtUnit} sq ft</span> */}
          <span>=</span>
          <input
            className="svc-in-box"
            type="number"
            step="0.01"
            name="customStandaloneTotal"
            value={
              form.customStandaloneTotal !== undefined
                ? form.customStandaloneTotal
                : calc.standaloneServicePrice
            }
            onChange={onChange}
            onBlur={handleBlur}
            style={{
              backgroundColor: form.customStandaloneTotal !== undefined ? '#fffacd' : 'white'
            }}
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
              type="number"
              step="0.01"
              name="dailyChemicalPerGallon"
              value={form.dailyChemicalPerGallon}
              onChange={onChange}
            />
          </div>
          <span>=</span>
          <input
            className="svc-in-box"
            type="number"
            step="0.01"
            name="customChemicalTotal"
            value={
              form.customChemicalTotal !== undefined
                ? form.customChemicalTotal
                : calc.chemicalSupplyMonthly
            }
            onChange={onChange}
            onBlur={handleBlur}
            style={{
              backgroundColor: form.customChemicalTotal !== undefined ? '#fffacd' : 'white'
            }}
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
              type="number"
              step="0.01"
              name="customPerVisitPrice"
              value={
                form.customPerVisitPrice !== undefined
                  ? form.customPerVisitPrice
                  : calc.perVisitPrice
              }
              onChange={onChange}
              onBlur={handleBlur}
              style={{
                backgroundColor: form.customPerVisitPrice !== undefined ? '#fffacd' : 'white',
                border: 'none'
              }}
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
              type="number"
              step="0.01"
              name="customMonthlyRecurring"
              value={
                form.customMonthlyRecurring !== undefined
                  ? form.customMonthlyRecurring
                  : calc.monthlyRecurring
              }
              onChange={onChange}
              onBlur={handleBlur}
              style={{
                backgroundColor: form.customMonthlyRecurring !== undefined ? '#fffacd' : 'white',
                border: 'none'
              }}
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
              type="number"
              step="0.01"
              name="customFirstMonthPrice"
              value={
                form.customFirstMonthPrice !== undefined
                  ? form.customFirstMonthPrice
                  : calc.firstMonthPrice
              }
              onChange={onChange}
              onBlur={handleBlur}
              style={{
                backgroundColor: form.customFirstMonthPrice !== undefined ? '#fffacd' : 'white',
                border: 'none'
              }}
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
              type="number"
              step="0.01"
              name="customContractTotal"
              value={
                form.customContractTotal !== undefined
                  ? form.customContractTotal
                  : calc.contractTotal
              }
              onChange={onChange}
              onBlur={handleBlur}
              style={{
                backgroundColor: form.customContractTotal !== undefined ? '#fffacd' : 'white',
                border: 'none'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};