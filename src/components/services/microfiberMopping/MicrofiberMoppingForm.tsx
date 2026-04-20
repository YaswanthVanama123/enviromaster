
import React, { useEffect, useRef, useState, type ChangeEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSync, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { useMicrofiberMoppingCalc } from "./useMicrofiberMoppingCalc";
import type { MicrofiberMoppingFormState } from "./microfiberMoppingTypes";
import type { ServiceInitialData } from "../common/serviceTypes";
import { microfiberMoppingPricingConfig as cfg } from "./microfiberMoppingConfig";
import { useServicesContextOptional } from "../ServicesContext";
import { CustomFieldManager, type CustomField } from "../CustomFieldManager";

const FIELD_ORDER = {
  frequency: 1,

  serviceBreakdown: {
    bathrooms: 10,
    hugeBathrooms: 11,
    extraArea: 12,
    standalone: 13,
    chemicals: 14,
  },
  totals: {
    perVisit: 20,

    monthlyRecurring: 22,

    recurringVisit: 24,
    contract: 25,
    minimum: 26,
    totalPrice: 27,
  },
} as const;

export const MicrofiberMoppingForm: React.FC<
  ServiceInitialData<MicrofiberMoppingFormState>
> = ({ initialData, onRemove }) => {

  const [customFields, setCustomFields] = useState<CustomField[]>(
    initialData?.customFields || []
  );


  const { form, setForm, onChange, calc, refreshConfig, isLoadingConfig, activeConfig } = useMicrofiberMoppingCalc(initialData, customFields);
  const servicesContext = useServicesContextOptional();


  useEffect(() => {
    if (servicesContext?.globalContractMonths && servicesContext.globalContractMonths !== form.contractTermMonths) {
      setForm({ ...form, contractTermMonths: servicesContext.globalContractMonths });
    }
  }, [servicesContext?.globalContractMonths]);

  const [showAddDropdown, setShowAddDropdown] = useState(false);


  const [editingValues, setEditingValues] = useState<Record<string, string>>({});

  const [originalValues, setOriginalValues] = useState<Record<string, string>>({});


  const getDisplayValue = (fieldName: string, calculatedValue: number | undefined): string => {

    if (editingValues[fieldName] !== undefined) {
      return editingValues[fieldName];
    }

    return calculatedValue !== undefined ? calculatedValue.toFixed(2) : '';
  };


  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setEditingValues(prev => ({ ...prev, [name]: value }));
    setOriginalValues(prev => ({ ...prev, [name]: value }));
  };


  const handleLocalChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;


    setEditingValues(prev => ({ ...prev, [name]: value }));


    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      onChange({ target: { name, value: String(numValue) } } as any);
    } else if (value === '') {

      onChange({ target: { name, value: '' } } as any);
    }
  };


  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;


    const originalValue = originalValues[name];


    setEditingValues(prev => {
      const newState = { ...prev };
      delete newState[name];
      return newState;
    });


    setOriginalValues(prev => {
      const newState = { ...prev };
      delete newState[name];
      return newState;
    });


    const numValue = parseFloat(value);


    if (originalValue !== value) {

      if (value === '' || isNaN(numValue)) {
        onChange({ target: { name, value: '' } } as any);
        return;
      }


      onChange({ target: { name, value: String(numValue) } } as any);
    }
  };


  const isSanicleanAllInclusive =
    servicesContext?.isSanicleanAllInclusive ?? false;


  const prevDataRef = useRef<string>("");


  const bathroomRate = form.customIncludedBathroomRate ?? form.includedBathroomRate;
  const hugeBathroomRate = form.customHugeBathroomRatePerSqFt ?? form.hugeBathroomRatePerSqFt;
  const extraAreaRate = form.customExtraAreaRatePerUnit ?? form.extraAreaRatePerUnit;

  useEffect(() => {
    if (servicesContext) {
      const hasCustomFieldValues = customFields.some(f =>
        (f.type === 'dollar' && !!f.value && parseFloat(f.value) > 0) ||
        (f.type === 'calc' && !!f.calcValues?.right && parseFloat(f.calcValues.right) > 0)
      );
      const isActive = (form.bathroomCount ?? 0) > 0 || (form.hugeBathroomSqFt ?? 0) > 0 || (form.extraAreaSqFt ?? 0) > 0 || (form.standaloneSqFt ?? 0) > 0 || (form.chemicalGallons ?? 0) > 0 || hasCustomFieldValues;

      const frequencyLabel = typeof form.frequency === 'string'
        ? form.frequency.charAt(0).toUpperCase() + form.frequency.slice(1)
        : String(form.frequency || '');
      const visitBasedFrequency = ["oneTime", "quarterly", "biannual", "annual", "bimonthly"].includes(form.frequency);

      const totalPriceValue =
        form.customFirstMonthPrice !== undefined
          ? form.customFirstMonthPrice
          : calc.contractTotal;

      const data = isActive ? {
        serviceId: "microfiberMopping",
        displayName: "Microfiber Mopping",
        isActive: true,


        includedBathroomRate: form.customIncludedBathroomRate ?? form.includedBathroomRate,
        hugeBathroomRatePerSqFt: form.customHugeBathroomRatePerSqFt ?? form.hugeBathroomRatePerSqFt,
        extraAreaRatePerUnit: form.customExtraAreaRatePerUnit ?? form.extraAreaRatePerUnit,
        standaloneRatePerUnit: form.customStandaloneRatePerUnit ?? form.standaloneRatePerUnit,
        dailyChemicalPerGallon: form.customDailyChemicalPerGallon ?? form.dailyChemicalPerGallon,


        bathroomCount: form.bathroomCount,
        isHugeBathroom: form.isHugeBathroom,
        hugeBathroomSqFt: form.hugeBathroomSqFt,
        extraAreaSqFt: form.extraAreaSqFt,
        useExactExtraAreaSqft: form.useExactExtraAreaSqft,
        standaloneSqFt: form.standaloneSqFt,
        useExactStandaloneSqft: form.useExactStandaloneSqft,
        chemicalGallons: form.chemicalGallons,
        frequency: form.frequency,
        contractTermMonths: form.contractTermMonths,
        hasExistingSaniService: form.hasExistingSaniService,
        isAllInclusive: form.isAllInclusive,

        needsParking: form.needsParking,
        applyMinimum: form.applyMinimum !== false,


        perVisitBase: calc.perVisitPrice,  
        perVisit: calc.perVisitPrice,  
        minimumChargePerVisit: calc.minimumChargePerVisit,  

        frequency: {
          isDisplay: true,
          orderNo: FIELD_ORDER.frequency,
          label: "Frequency",
          type: "text" as const,
          value: frequencyLabel,
          frequencyKey: form.frequency,
        },


        serviceBreakdown: (() => {
          const breakdown = [];
          if (form.bathroomCount > 0) {
            breakdown.push({
              isDisplay: true,
              orderNo: FIELD_ORDER.serviceBreakdown.bathrooms,
              label: "Bathrooms",
              type: "calc" as const,
              qty: form.bathroomCount,
              rate: bathroomRate,
              total: calc.standardBathroomPrice,
            });
          }
          if (form.hugeBathroomSqFt > 0) {
            breakdown.push({
              isDisplay: true,
              orderNo: FIELD_ORDER.serviceBreakdown.hugeBathrooms,
              label: "Huge Bathrooms",
              type: "calc" as const,
              qty: form.hugeBathroomSqFt,
              rate: hugeBathroomRate,
              total: calc.hugeBathroomPrice,
              unit: "sq ft",
            });
          }
          if (form.extraAreaSqFt > 0) {
            breakdown.push({
              isDisplay: true,
              orderNo: FIELD_ORDER.serviceBreakdown.extraArea,
              label: "Extra Area",
              type: "calc" as const,
              qty: form.extraAreaSqFt,
              rate: extraAreaRate,
              total: calc.extraAreaPrice,
              unit: "sq ft",
            });
          }
          if (form.standaloneSqFt > 0) {
            breakdown.push({
              isDisplay: true,
              orderNo: FIELD_ORDER.serviceBreakdown.standalone,
              label: "Standalone Service",
              type: "calc" as const,
              qty: form.standaloneSqFt,
              rate: form.customStandaloneRatePerUnit ?? form.standaloneRatePerUnit,
              total: calc.standaloneServicePrice,
              unit: "sq ft",
            });
          }
          if (form.chemicalGallons > 0) {
            breakdown.push({
              isDisplay: true,
              orderNo: FIELD_ORDER.serviceBreakdown.chemicals,
              label: "Chemical Supply",
              type: "calc" as const,
              qty: form.chemicalGallons,
              rate: form.customDailyChemicalPerGallon ?? form.dailyChemicalPerGallon,
              total: calc.chemicalSupplyMonthly,
              unit: "gallons",
            });
          }
          return breakdown;
        })(),

        totals: (() => {
          const totals: any = {
            perVisit: {
              isDisplay: true,
              orderNo: FIELD_ORDER.totals.perVisit,
              label: "Per Visit Total",
              type: "dollar" as const,
              amount: calc.perVisitPrice,
            },
          };

          if (visitBasedFrequency) {
            totals.recurringVisit = {
              isDisplay: true,
              orderNo: FIELD_ORDER.totals.recurringVisit,
              label: "Recurring Visit Total",
              type: "dollar" as const,
              amount: calc.perVisitPrice,
              gap: "normal",
            };
          } else {
            totals.monthlyRecurring = {
              isDisplay: true,
              orderNo: FIELD_ORDER.totals.monthlyRecurring,
              label: "Monthly Recurring",
              type: "dollar" as const,
              amount: calc.monthlyRecurring,
              gap: "normal",
            };
          }

          if (form.frequency !== "oneTime") {
            totals.contract = {
              isDisplay: true,
              orderNo: FIELD_ORDER.totals.contract,
              label: "Contract Total",
              type: "dollar" as const,
              months: form.contractTermMonths,
              amount: calc.contractTotal,
            };
          }

          totals.minimum = {
            isDisplay: true,
            orderNo: FIELD_ORDER.totals.minimum,
            label: "Minimum",
            type: "dollar" as const,
            amount: form.minCharge,
          };

          if (form.frequency === "oneTime") {
            totals.totalPrice = {
              isDisplay: true,
              orderNo: FIELD_ORDER.totals.totalPrice,
              label: "Total Price",
              type: "dollar" as const,
              amount: totalPriceValue,
            };
          }

          return totals;
        })(),

        notes: form.notes || "",
        customFields: customFields,
        contractTotal: calc.contractTotal,
        originalContractTotal: calc.originalContractTotal,
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
    customIncludedBathroomRate: form.customIncludedBathroomRate,
    customHugeBathroomRatePerSqFt: form.customHugeBathroomRatePerSqFt,
    customExtraAreaRatePerUnit: form.customExtraAreaRatePerUnit,
    customStandaloneRatePerUnit: form.customStandaloneRatePerUnit,
    customDailyChemicalPerGallon: form.customDailyChemicalPerGallon,
    frequency: form.frequency,
    contractTermMonths: form.contractTermMonths,
  });


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
      prev.customIncludedBathroomRate !== form.customIncludedBathroomRate ||
      prev.customHugeBathroomRatePerSqFt !== form.customHugeBathroomRatePerSqFt ||
      prev.customExtraAreaRatePerUnit !== form.customExtraAreaRatePerUnit ||
      prev.customStandaloneRatePerUnit !== form.customStandaloneRatePerUnit ||
      prev.customDailyChemicalPerGallon !== form.customDailyChemicalPerGallon ||
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
        customIncludedBathroomRate: form.customIncludedBathroomRate,
        customHugeBathroomRatePerSqFt: form.customHugeBathroomRatePerSqFt,
        customExtraAreaRatePerUnit: form.customExtraAreaRatePerUnit,
        customStandaloneRatePerUnit: form.customStandaloneRatePerUnit,
        customDailyChemicalPerGallon: form.customDailyChemicalPerGallon,
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
    form.customIncludedBathroomRate,
    form.customHugeBathroomRatePerSqFt,
    form.customExtraAreaRatePerUnit,
    form.customStandaloneRatePerUnit,
    form.customDailyChemicalPerGallon,
    form.frequency,
    form.contractTermMonths,
    setForm,
  ]);

  const extraAreaRatePerSqFt =
    (Number(form.extraAreaRatePerUnit) || 0) /
    cfg.extraAreaPricing.extraAreaSqFtUnit;

  const isBathroomDisabled =
    form.isHugeBathroom || (form.hugeBathroomSqFt ?? 0) > 0;

  return (
    <div className="svc-card">
      {}
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

      {}
      <CustomFieldManager
        fields={customFields}
        onFieldsChange={setCustomFields}
        showAddDropdown={showAddDropdown}
        onToggleAddDropdown={setShowAddDropdown}
      />

      {}
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
            Microfiber Mopping is already included at no additional charge (${(form.customIncludedBathroomRate ?? form.includedBathroomRate).toFixed(2)}/bathroom waived).
          </div>
        </div>
      )}

      {}
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

      {}
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

      {}
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

      {}
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
              step="1"
              name="customIncludedBathroomRate"
              value={getDisplayValue(
                'customIncludedBathroomRate',
                form.customIncludedBathroomRate !== undefined
                  ? form.customIncludedBathroomRate
                  : form.includedBathroomRate
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{
                backgroundColor: form.customIncludedBathroomRate !== undefined ? '#fffacd' : 'white'
              }}
              title="Bathroom rate (editable with yellow highlight if overridden)"
            />
          </div>
          <span>=</span>
          <input
            className="svc-in-box field-qty"
            type="number"
            min="0"
            readOnly
            step="1"
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

      {}
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
              step="1"
              name="customHugeBathroomRatePerSqFt"
              value={getDisplayValue(
                'customHugeBathroomRatePerSqFt',
                form.customHugeBathroomRatePerSqFt !== undefined
                  ? form.customHugeBathroomRatePerSqFt
                  : form.hugeBathroomRatePerSqFt
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{
                backgroundColor: form.customHugeBathroomRatePerSqFt !== undefined ? '#fffacd' : 'white'
              }}
              title="Huge bathroom rate per sq ft (editable with yellow highlight if overridden)"
            />
          </div>
          {}
          <span>=</span>
          <input
            className="svc-in-box field-qty"
            type="number"
            readOnly
            min="0"
            step="1"
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

      {}
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
              step="1"
              name="customExtraAreaRatePerUnit"
              value={getDisplayValue(
                'customExtraAreaRatePerUnit',
                form.customExtraAreaRatePerUnit !== undefined
                  ? form.customExtraAreaRatePerUnit
                  : form.extraAreaRatePerUnit
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{
                backgroundColor: form.customExtraAreaRatePerUnit !== undefined ? '#fffacd' : 'white'
              }}
              title="Rate per 400 sq ft unit (editable with yellow highlight if overridden)"
            />
          </div>
          {}
          <span>=</span>
          <input
            className="svc-in-box field-qty"
            type="number"
            readOnly
            min="0"
            step="1"
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
          {}
        </div>
      </div>

      {}
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
              ? `(${activeConfig.extraAreaPricing.extraAreaSqFtUnit} sq ft units: $${activeConfig.extraAreaPricing.singleLargeAreaRate} first + $${(form.customExtraAreaRatePerUnit ?? form.extraAreaRatePerUnit).toFixed(2)} per extra)`
              : `(Direct: $${activeConfig.extraAreaPricing.singleLargeAreaRate} for first ${activeConfig.extraAreaPricing.extraAreaSqFtUnit} sq ft + area × $${((form.customExtraAreaRatePerUnit ?? form.extraAreaRatePerUnit) / activeConfig.extraAreaPricing.extraAreaSqFtUnit).toFixed(4)}/sq ft)`}
          </span>
        </div>
      </div>

      {}
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
              step="1"
              name="customStandaloneRatePerUnit"
              value={getDisplayValue(
                'customStandaloneRatePerUnit',
                form.customStandaloneRatePerUnit !== undefined
                  ? form.customStandaloneRatePerUnit
                  : form.standaloneRatePerUnit
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{
                backgroundColor: form.customStandaloneRatePerUnit !== undefined ? '#fffacd' : 'white'
              }}
              title="Standalone rate per 200 sq ft (editable with yellow highlight if overridden)"
            />
          </div>
          {}
          <span>=</span>
          <input
            className="svc-in-box field-qty"
            type="number"
            min="0"
            readOnly
            step="1"
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

      {}
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
              ? `(${activeConfig.standalonePricing.standaloneSqFtUnit} sq ft units: $${activeConfig.standalonePricing.standaloneMinimum} first + $${(form.customStandaloneRatePerUnit ?? form.standaloneRatePerUnit).toFixed(2)} per extra)`
              : `(Direct: $${activeConfig.standalonePricing.standaloneMinimum} for first ${activeConfig.standalonePricing.standaloneSqFtUnit} sq ft + area × $${((form.customStandaloneRatePerUnit ?? form.standaloneRatePerUnit) / activeConfig.standalonePricing.standaloneSqFtUnit).toFixed(4)}/sq ft)`}
          </span>
        </div>
      </div>

      {}
      {}

      {}
      {}


      {}
      <div className="svc-summary">
        {}
        <div className="svc-row">
          <label>Minimum Per Visit</label>
          <div className="svc-row-right">
            <span className="svc-small">${calc.minimumChargePerVisit?.toFixed(2) ?? "0.00"}</span>
            <label className="svc-inline" style={{ marginLeft: '10px' }}>
              <input
                type="checkbox"
                name="applyMinimum"
                checked={form.applyMinimum !== false}
                onChange={onChange}
              />
              <span>Apply Minimum</span>
            </label>
          </div>
        </div>

        {}
        <div className="svc-row">
          <label>Per-visit service total</label>
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="number"
              min="0"
              readOnly
              step="1"
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

        {}
        {(form.bathroomCount > 0 || form.hugeBathroomSqFt > 0 || form.extraAreaSqFt > 0 || form.standaloneSqFt > 0) && (
          <div className="svc-row" style={{ marginTop: '-10px', paddingTop: '5px' }}>
            <label></label>
            <div className="svc-row-right">
              {calc.contractTotal > calc.originalContractTotal * 1.20 ? (
                <span style={{
                  color: '#388e3c',
                  fontSize: '13px',
                  fontWeight: '600',
                  padding: '4px 8px',
                  backgroundColor: '#e8f5e9',
                  borderRadius: '4px',
                  display: 'inline-block'
                }}>
                  🟢 Greenline Pricing
                </span>
              ) : (
                <span style={{
                  color: '#d32f2f',
                  fontSize: '13px',
                  fontWeight: '600',
                  padding: '4px 8px',
                  backgroundColor: '#ffebee',
                  borderRadius: '4px',
                  display: 'inline-block'
                }}>
                  🔴 Redline Pricing
                </span>
              )}
            </div>
          </div>
        )}

        {}
        {form.frequency !== "oneTime" && form.frequency !== "quarterly" &&
         form.frequency !== "biannual" && form.frequency !== "annual" &&
         form.frequency !== "bimonthly" && (
          <>
            {}

            {}
          </>
        )}

        {}
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
                step="1"
                readOnly
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

        {}
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
                readOnly
                step="1"
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

        {}
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
                readOnly
                step="1"
                name="customFirstMonthPrice"
                value={getDisplayValue(
                  'customFirstMonthPrice',
                  form.customFirstMonthPrice !== undefined
                    ? form.customFirstMonthPrice
                    : calc.contractTotal
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

        {}
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
                {}
                {form.frequency === "quarterly"
                  ? Array.from({ length: 12 }, (_, i) => (i + 1) * 3).map((m) => (
                      <option key={m} value={m}>
                        {m} months
                      </option>
                    ))

                  : form.frequency === "bimonthly"
                  ? [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36].map((m) => (
                      <option key={m} value={m}>
                        {m} months
                      </option>
                    ))

                  : form.frequency === "biannual"
                  ? [6, 12, 18, 24, 30, 36].map((m) => (
                      <option key={m} value={m}>
                        {m} months
                      </option>
                    ))

                  : form.frequency === "annual"
                  ? [12, 24, 36].map((m) => (
                      <option key={m} value={m}>
                        {m} months
                      </option>
                    ))

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
                  step="1"
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
                    border: 'none',
                    width: '140px'
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
