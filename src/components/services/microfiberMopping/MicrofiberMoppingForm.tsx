// src/components/services/microfiberMopping/MicrofiberMoppingForm.tsx
import React, { useEffect, useRef, useState, type ChangeEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSync, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { useMicrofiberMoppingCalc } from "./useMicrofiberMoppingCalc";
import type { MicrofiberMoppingFormState } from "./microfiberMoppingTypes";
import type { ServiceInitialData } from "../common/serviceTypes";
import { microfiberMoppingPricingConfig as cfg } from "./microfiberMoppingConfig";
import { useServicesContextOptional } from "../ServicesContext";
import { CustomFieldManager, type CustomField } from "../CustomFieldManager";

export const MicrofiberMoppingForm: React.FC<
  ServiceInitialData<MicrofiberMoppingFormState>
> = ({ initialData, onRemove }) => {
  const { form, setForm, onChange, calc, refreshConfig, isLoadingConfig, activeConfig } = useMicrofiberMoppingCalc(initialData);
  const servicesContext = useServicesContextOptional();

  // Custom fields state - initialize with initialData if available
  const [customFields, setCustomFields] = useState<CustomField[]>(
    initialData?.customFields || []
  );
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  // ✅ LOCAL STATE: Store raw string values during editing to allow free decimal editing
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});

  // ✅ Helper to get display value (local state while editing, or calculated value)
  const getDisplayValue = (fieldName: string, calculatedValue: number | undefined): string => {
    // If currently editing, show the raw input
    if (editingValues[fieldName] !== undefined) {
      return editingValues[fieldName];
    }
    // Otherwise show the calculated/override value
    return calculatedValue !== undefined ? String(calculatedValue) : '';
  };

  // ✅ Handler for starting to edit a field
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Store current value in editing state
    setEditingValues(prev => ({ ...prev, [name]: value }));
  };

  // ✅ Handler for typing in a field (updates both local state AND form state)
  const handleLocalChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Update local state for display (allows free editing)
    setEditingValues(prev => ({ ...prev, [name]: value }));

    // Also parse and update form state immediately (triggers calculations)
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      onChange({ target: { name, value: String(numValue) } } as any);
    } else if (value === '') {
      // If field is cleared, update form to clear the override
      onChange({ target: { name, value: '' } } as any);
    }
  };

  // ✅ Handler for finishing editing (blur) - parse and update form only
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Clear editing state for this field
    setEditingValues(prev => {
      const newState = { ...prev };
      delete newState[name];
      return newState;
    });

    // Parse the value
    const numValue = parseFloat(value);

    // If empty or invalid, clear the override
    if (value === '' || isNaN(numValue)) {
      onChange({ target: { name, value: '' } } as any);
      return;
    }

    // ✅ Update form state with parsed numeric value
    // DO NOT auto-clear overrides - they persist until refresh button is clicked
    onChange({ target: { name, value: String(numValue) } } as any);
  };

  // Check if SaniClean All-Inclusive is active
  const isSanicleanAllInclusive =
    servicesContext?.isSanicleanAllInclusive ?? false;

  // Save form data to context for form submission
  const prevDataRef = useRef<string>("");

  // Calculate effective rates for each service type
  const bathroomRate = form.bathroomCount > 0 && calc.standardBathroomPrice > 0
    ? calc.standardBathroomPrice / form.bathroomCount
    : form.includedBathroomRate;

  const hugeBathroomRate = form.hugeBathroomSqFt > 0 && calc.hugeBathroomPrice > 0
    ? calc.hugeBathroomPrice / form.hugeBathroomSqFt
    : form.hugeBathroomRatePerSqFt;

  const extraAreaRate = form.extraAreaSqFt > 0 && calc.extraAreaPrice > 0
    ? calc.extraAreaPrice / form.extraAreaSqFt
    : form.extraAreaRatePerUnit;

  useEffect(() => {
    if (servicesContext) {
      const isActive = (form.bathroomCount ?? 0) > 0 || (form.hugeBathroomSqFt ?? 0) > 0 || (form.extraAreaSqFt ?? 0) > 0 || (form.standaloneSqFt ?? 0) > 0 || (form.chemicalGallons ?? 0) > 0;

      const data = isActive ? {
        serviceId: "microfiberMopping",
        displayName: "Microfiber Mopping",
        isActive: true,

        frequency: {
          isDisplay: true,
          label: "Frequency",
          type: "text" as const,
          value: typeof form.frequency === 'string'
            ? form.frequency.charAt(0).toUpperCase() + form.frequency.slice(1)
            : String(form.frequency || ''),
        },

        serviceBreakdown: [
          ...(form.bathroomCount > 0 ? [{
            isDisplay: true,
            label: "Bathrooms",
            type: "calc" as const,
            qty: form.bathroomCount,
            rate: bathroomRate,
            total: calc.standardBathroomPrice,
          }] : []),
          ...(form.hugeBathroomSqFt > 0 ? [{
            isDisplay: true,
            label: "Huge Bathrooms",
            type: "calc" as const,
            qty: form.hugeBathroomSqFt,
            rate: hugeBathroomRate,
            total: calc.hugeBathroomPrice,
            unit: "sq ft",
          }] : []),
          ...(form.extraAreaSqFt > 0 ? [{
            isDisplay: true,
            label: "Extra Area",
            type: "calc" as const,
            qty: form.extraAreaSqFt,
            rate: extraAreaRate,
            total: calc.extraAreaPrice,
            unit: "sq ft",
          }] : []),
          ...(form.standaloneSqFt > 0 ? [{
            isDisplay: true,
            label: "Standalone Service",
            type: "calc" as const,
            qty: form.standaloneSqFt,
            rate: form.standaloneRatePerUnit,
            total: calc.standaloneServicePrice,
            unit: "sq ft",
          }] : []),
          ...(form.chemicalGallons > 0 ? [{
            isDisplay: true,
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
            isDisplay: true,
            label: "Per Visit Total",
            type: "dollar" as const,
            amount: calc.perVisitPrice,
          },
          monthly: {
            isDisplay: true,
            label: "Monthly Total",
            type: "dollar" as const,
            amount: calc.monthlyRecurring,
          },
          contract: {
            isDisplay: true,
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
        <div className="svc-h-actions">
          <button
            type="button"
            className="svc-mini"
            onClick={refreshConfig}
            disabled={isLoadingConfig}
            title="Refresh config from database"
          >
            <FontAwesomeIcon
              icon={isLoadingConfig ? faSpinner : faSync}
              spin={isLoadingConfig}
            />
          </button>
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
        <label>Combined with Sani program?</label>
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
        <label>All-inclusive package?</label>
        <div className="svc-row-right">
          <label className="svc-check">
            <input
              type="checkbox"
              name="isAllInclusive"
              checked={form.isAllInclusive}
              onChange={onChange}
            />
            <span>Microfiber included (no separate pricing)</span>
          </label>
        </div>
      </div>

      {/* Standard bathrooms */}
      <div className="svc-row">
        <label>Standard Bathrooms</label>
        <div className="svc-row-right">
          <input
            className="svc-in field-qty"
            type="number"
            min="0"
            name="bathroomCount"
            value={form.bathroomCount || ""}
            onChange={onChange}
            disabled={
              isBathroomDisabled || !form.hasExistingSaniService || form.isAllInclusive
            }
          />
          <span>@</span>
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in field-qty"
              type="number"
              min="0"
              step="0.01"
              name="includedBathroomRate"
              value={form.includedBathroomRate || ""}
              onChange={onChange}
            />
          </div>
          <span>=</span>
          <input
            className="svc-in-box field-qty"
            type="number"
            min="0"
            step="0.01"
            name="customStandardBathroomTotal"
            value={getDisplayValue(
              'customStandardBathroomTotal',
              form.customStandardBathroomTotal !== undefined
                ? form.customStandardBathroomTotal
                : calc.standardBathroomPrice
            )}
            onChange={handleLocalChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={{
              backgroundColor: form.customStandardBathroomTotal !== undefined ? '#fffacd' : 'white'
            }}
          />
        </div>
      </div>

      {/* Huge bathroom exception */}
      <div className="svc-row">
        <label>Huge Bathroom (sq ft)</label>
        <div className="svc-row-right">
          <input
            className="svc-in field-qty"
            type="number"
            min="0"
            name="hugeBathroomSqFt"
            value={form.hugeBathroomSqFt || ""}
            onChange={onChange}
            disabled={form.isAllInclusive || !form.hasExistingSaniService}
          />
          <span>@</span>
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in field-qty"
              type="number"
              min="0"
              step="0.01"
              name="hugeBathroomRatePerSqFt"
              value={form.hugeBathroomRatePerSqFt || ""}
              onChange={onChange}
            />
          </div>
          {/* <span className="svc-small">per {cfg.hugeBathroomPricing.sqFtUnit} sq ft</span> */}
          <span>=</span>
          <input
            className="svc-in-box field-qty"
            type="number"
            min="0"
            step="0.01"
            name="customHugeBathroomTotal"
            value={getDisplayValue(
              'customHugeBathroomTotal',
              form.customHugeBathroomTotal !== undefined
                ? form.customHugeBathroomTotal
                : calc.hugeBathroomPrice
            )}
            onChange={handleLocalChange}
            onFocus={handleFocus}
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
            className="svc-in field-qty"
            type="number"
            min="0"
            name="extraAreaSqFt"
            value={form.extraAreaSqFt || ""}
            onChange={onChange}
            disabled={form.isAllInclusive}
          />
          <span>@</span>
          <div className="svc-row-right">
            <span>$</span>
            <input
              className="svc-in field-qty"
              type="number"
            min="0"
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
            className="svc-in-box field-qty"
            type="number"
            min="0"
            step="0.01"
            name="customExtraAreaTotal"
            value={getDisplayValue(
              'customExtraAreaTotal',
              form.customExtraAreaTotal !== undefined
                ? form.customExtraAreaTotal
                : calc.extraAreaPrice
            )}
            onChange={handleLocalChange}
            onFocus={handleFocus}
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

      {/* Extra non-bathroom area calculation method checkbox */}
      <div className="svc-row">
        <label></label>
        <div className="svc-row-right">
          <label className="svc-inline">
            <input
              type="checkbox"
              name="useExactExtraAreaSqft"
              checked={form.useExactExtraAreaSqft}
              onChange={onChange}
            />
            <span>Exact SqFt Calculation</span>
          </label>
          <span className="svc-small">
            {form.useExactExtraAreaSqft
              ? `(${activeConfig.extraAreaPricing.extraAreaSqFtUnit} sq ft units: $${activeConfig.extraAreaPricing.singleLargeAreaRate} first + $${form.extraAreaRatePerUnit.toFixed(2)} per extra)`
              : `(Direct: $${activeConfig.extraAreaPricing.singleLargeAreaRate} for first ${activeConfig.extraAreaPricing.extraAreaSqFtUnit} sq ft + area × $${(form.extraAreaRatePerUnit / activeConfig.extraAreaPricing.extraAreaSqFtUnit).toFixed(4)}/sq ft)`}
          </span>
        </div>
      </div>

      {/* Standalone microfiber mopping */}
      <div className="svc-row">
        <label>Standalone microfiber mopping (sq ft)</label>
        <div className="svc-row-right">
          <input
            className="svc-in field-qty"
            type="number"
            min="0"
            name="standaloneSqFt"
            value={form.standaloneSqFt || ""}
            onChange={onChange}
            disabled={form.isAllInclusive}
          />
          <span>@</span>
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in field-qty"
              type="number"
              min="0"
              step="0.01"
              name="standaloneRatePerUnit"
              value={form.standaloneRatePerUnit || ""}
              onChange={onChange}
            />
          </div>
          {/* <span className="svc-small">per {cfg.standalonePricing.standaloneSqFtUnit} sq ft</span> */}
          <span>=</span>
          <input
            className="svc-in-box field-qty"
            type="number"
            min="0"
            step="0.01"
            name="customStandaloneTotal"
            value={getDisplayValue(
              'customStandaloneTotal',
              form.customStandaloneTotal !== undefined
                ? form.customStandaloneTotal
                : calc.standaloneServicePrice
            )}
            onChange={handleLocalChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={{
              backgroundColor: form.customStandaloneTotal !== undefined ? '#fffacd' : 'white'
            }}
          />
        </div>
      </div>

      {/* Standalone microfiber mopping calculation method checkbox */}
      <div className="svc-row">
        <label></label>
        <div className="svc-row-right">
          <label className="svc-inline">
            <input
              type="checkbox"
              name="useExactStandaloneSqft"
              checked={form.useExactStandaloneSqft}
              onChange={onChange}
            />
            <span>Exact SqFt Calculation</span>
          </label>
          <span className="svc-small">
            {form.useExactStandaloneSqft
              ? `(${activeConfig.standalonePricing.standaloneSqFtUnit} sq ft units: $${activeConfig.standalonePricing.standaloneMinimum} first + $${form.standaloneRatePerUnit.toFixed(2)} per extra)`
              : `(Direct: $${activeConfig.standalonePricing.standaloneMinimum} for first ${activeConfig.standalonePricing.standaloneSqFtUnit} sq ft + area × $${(form.standaloneRatePerUnit / activeConfig.standalonePricing.standaloneSqFtUnit).toFixed(4)}/sq ft)`}
          </span>
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
      {/* <div className="svc-row">
        <label>Daily mop chemical (gallons / month)</label>
        <div className="svc-row-right">
          <input
            className="svc-in field-qty"
            type="number"
            min="0"
            name="chemicalGallons"
            value={form.chemicalGallons}
            onChange={onChange}
          />
          <span>@</span>
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in field-qty"
              type="number"
            min="0"
              step="0.01"
              name="dailyChemicalPerGallon"
              value={form.dailyChemicalPerGallon}
              onChange={onChange}
            />
          </div>
          <span>=</span>
          <input
            className="svc-in-box field-qty"
            type="number"
            min="0"
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
      </div> */}

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
            <option value="oneTime">One Time</option>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Bi-weekly</option>
            <option value="twicePerMonth">2× / Month</option>
            <option value="monthly">Monthly</option>
            <option value="bimonthly">Every 2 Months</option>
            <option value="quarterly">Quarterly</option>
            <option value="biannual">Bi-Annual</option>
            <option value="annual">Annual</option>
          </select>
        </div>
      </div>

      {/* Summary block */}
      <div className="svc-summary">
        {/* Per-visit service total - always shown */}
        <div className="svc-row">
          <label>Per-visit service total</label>
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="number"
            min="0"
              step="0.01"
              name="customPerVisitPrice"
              value={getDisplayValue(
                'customPerVisitPrice',
                form.customPerVisitPrice !== undefined
                  ? form.customPerVisitPrice
                  : calc.perVisitPrice
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{
                backgroundColor: form.customPerVisitPrice !== undefined ? '#fffacd' : 'white',
                border: 'none'
              }}
            />
          </div>
        </div>

        {/* Weekly approximations - shown for month-based frequencies */}
        {form.frequency !== "oneTime" && form.frequency !== "quarterly" &&
         form.frequency !== "biannual" && form.frequency !== "annual" &&
         form.frequency !== "bimonthly" && (
          <>
            {/* <div className="svc-row">
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
            </div> */}

            {/* <div className="svc-row">
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
            </div> */}
          </>
        )}

        {/* Monthly Recurring – HIDE for oneTime, quarterly, biannual, annual, bimonthly */}
        {form.frequency !== "oneTime" && form.frequency !== "quarterly" &&
         form.frequency !== "biannual" && form.frequency !== "annual" &&
         form.frequency !== "bimonthly" && (
          <div className="svc-row">
            <label>Monthly recurring</label>
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                type="text"
                step="0.01"
                name="customMonthlyRecurring"
                value={getDisplayValue(
                  'customMonthlyRecurring',
                  form.customMonthlyRecurring !== undefined
                    ? form.customMonthlyRecurring
                    : calc.monthlyRecurring
                )}
                onChange={handleLocalChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={{
                  backgroundColor: form.customMonthlyRecurring !== undefined ? '#fffacd' : 'white',
                  border: 'none'
                }}
              />
            </div>
          </div>
        )}

        {/* First month total – HIDE for oneTime, quarterly, biannual, annual, bimonthly */}
        {form.frequency !== "oneTime" && form.frequency !== "quarterly" &&
         form.frequency !== "biannual" && form.frequency !== "annual" &&
         form.frequency !== "bimonthly" && (
          <div className="svc-row">
            <label>First month total</label>
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                type="number"
            min="0"
                step="0.01"
                name="customFirstMonthPrice"
                value={getDisplayValue(
                  'customFirstMonthPrice',
                  form.customFirstMonthPrice !== undefined
                    ? form.customFirstMonthPrice
                    : calc.firstMonthPrice
                )}
                onChange={handleLocalChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={{
                  backgroundColor: form.customFirstMonthPrice !== undefined ? '#fffacd' : 'white',
                  border: 'none'
                }}
              />
            </div>
          </div>
        )}

        {/* First Visit Total – SHOW ONLY for oneTime, quarterly, biannual, annual, bimonthly */}
        {(form.frequency === "oneTime" || form.frequency === "quarterly" ||
          form.frequency === "biannual" || form.frequency === "annual" ||
          form.frequency === "bimonthly") && (
          <div className="svc-row">
            <label>{form.frequency === "oneTime" ? "Total Price" : "First Visit Total"}</label>
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                type="number"
            min="0"
                step="0.01"
                name="customFirstMonthPrice"
                value={getDisplayValue(
                  'customFirstMonthPrice',
                  form.customFirstMonthPrice !== undefined
                    ? form.customFirstMonthPrice
                    : calc.firstMonthPrice
                )}
                onChange={handleLocalChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={{
                  backgroundColor: form.customFirstMonthPrice !== undefined ? '#fffacd' : 'white',
                  border: 'none'
                }}
              />
            </div>
          </div>
        )}

        {/* Contract total with inline dropdown – HIDE for oneTime */}
        {form.frequency !== "oneTime" && (
          <div className="svc-row">
            <label>Contract Total</label>
            <div className="svc-row-right">
              <select
                className="svc-in"
                name="contractTermMonths"
                value={form.contractTermMonths}
                onChange={onChange}
              >
                {/* Quarterly: multiples of 3 */}
                {form.frequency === "quarterly"
                  ? Array.from({ length: 12 }, (_, i) => (i + 1) * 3).map((m) => (
                      <option key={m} value={m}>
                        {m} months
                      </option>
                    ))
                  /* Bimonthly: even numbers */
                  : form.frequency === "bimonthly"
                  ? [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36].map((m) => (
                      <option key={m} value={m}>
                        {m} months
                      </option>
                    ))
                  /* Biannual: multiples of 6 */
                  : form.frequency === "biannual"
                  ? [6, 12, 18, 24, 30, 36].map((m) => (
                      <option key={m} value={m}>
                        {m} months
                      </option>
                    ))
                  /* Annual: multiples of 12 */
                  : form.frequency === "annual"
                  ? [12, 24, 36].map((m) => (
                      <option key={m} value={m}>
                        {m} months
                      </option>
                    ))
                  /* All other frequencies: 2-36 months */
                  : Array.from({ length: 35 }, (_, i) => i + 2).map((m) => (
                      <option key={m} value={m}>
                        {m} months
                      </option>
                    ))
                }
              </select>
              <div className="svc-dollar">
                <span>$</span>
                <input
                  className="svc-in"
                  type="number"
            min="0"
                  step="0.01"
                  name="customContractTotal"
                  value={getDisplayValue(
                    'customContractTotal',
                    form.customContractTotal !== undefined
                      ? form.customContractTotal
                      : calc.contractTotal
                  )}
                  onChange={handleLocalChange}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  style={{
                    backgroundColor: form.customContractTotal !== undefined ? '#fffacd' : 'white',
                    border: 'none'
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};