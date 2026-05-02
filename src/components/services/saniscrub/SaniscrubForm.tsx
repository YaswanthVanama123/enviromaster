import React, { useRef, useState, useEffect, type ChangeEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSync, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { useSaniscrubCalc } from "./useSaniscrubCalc";
import type { SaniscrubFormState } from "./saniscrubTypes";
import type { ServiceInitialData } from "../common/serviceTypes";
import { saniscrubFrequencyLabels } from "./saniscrubConfig";
import { useServicesContextOptional } from "../ServicesContext";
import { CustomFieldManager, type CustomField } from "../CustomFieldManager";

const FIELD_ORDER = {
  frequency: 1,

  restroomFixtures: 10,
  nonBathroomArea: 15,
  totals: {
    perVisit: 30,
    firstMonth: 31,
    monthlyRecurring: 32,
    firstVisit: 33,
    recurringVisit: 34,
    contract: 35,
    minimum: 36,
    totalPrice: 37,
  },
} as const;


const formatNumber = (num: number): string => {
  return num % 1 === 0 ? num.toString() : num.toFixed(2);
};
export const SaniscrubForm: React.FC<
  ServiceInitialData<SaniscrubFormState>
> = ({ initialData, onRemove }) => {

  const [customFields, setCustomFields] = useState<CustomField[]>(
    initialData?.customFields || []
  );


  const { form, setForm, onChange, quote, calc, refreshConfig, isLoadingConfig, pricingOverrides } = useSaniscrubCalc(initialData, customFields);
  const servicesContext = useServicesContextOptional();


  useEffect(() => {
    if (servicesContext?.globalContractMonths && servicesContext.globalContractMonths !== form.contractMonths) {
      setForm({ ...form, contractMonths: servicesContext.globalContractMonths });
    }
  }, [servicesContext?.globalContractMonths]);

  const [showAddDropdown, setShowAddDropdown] = useState(false);


  const [editingValues, setEditingValues] = useState<Record<string, string>>({});

  const [originalValues, setOriginalValues] = useState<Record<string, string>>({});


  const getDisplayValue = (fieldName: string, calculatedValue: number | undefined, formatted = false): string => {

    if (editingValues[fieldName] !== undefined) {
      return editingValues[fieldName];
    }

    if (calculatedValue === undefined) return '';
    return formatted
      ? calculatedValue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})
      : calculatedValue.toFixed(2);
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


  const prevDataRef = React.useRef<string>("");


  const displayFixtureRate = (() => {


    if (form.frequency === "oneTime" || form.frequency === "weekly" ||
        form.frequency === "biweekly" || form.frequency === "twicePerMonth" ||
        form.frequency === "monthly") {
      return Number(form.fixtureRateMonthly) || 0; 
    }
    if (form.frequency === "bimonthly") {
      return Number(form.fixtureRateBimonthly) || 0; 
    }

    return Number(form.fixtureRateQuarterly) || 0;
  })();


  const fixtureLineDisplayAmount = (() => {
    if (form.fixtureCount <= 0) return 0;


    return calc.fixtureBaseAmount || 0;
  })();


  const nonBathroomLineDisplayAmount = (() => {
    if (form.nonBathroomSqFt <= 0) return 0;


    return calc.nonBathroomPerVisit;
  })();

  React.useEffect(() => {
    if (servicesContext) {
      const hasCustomFieldValues = customFields.some(f =>
        (f.type === 'dollar' && !!f.value && parseFloat(f.value) > 0) ||
        (f.type === 'calc' && !!f.calcValues?.right && parseFloat(f.calcValues.right) > 0)
      );
      const isActive = form.fixtureCount > 0 || form.nonBathroomSqFt > 0 || hasCustomFieldValues;
      const minimumThreshold = form.frequency === "monthly" || form.frequency === "twicePerMonth"
        ? form.minimumMonthly
        : form.minimumBimonthly;

  const data = isActive ? {
        serviceId: "saniscrub",
        displayName: "SaniScrub",
        isActive: true,


        fixtureRateMonthly: form.fixtureRateMonthly,
        fixtureRateBimonthly: form.fixtureRateBimonthly,
        fixtureRateQuarterly: form.fixtureRateQuarterly,
        minimumMonthly: form.minimumMonthly,
        minimumBimonthly: form.minimumBimonthly,
        nonBathroomFirstUnitRate: form.nonBathroomFirstUnitRate,
        nonBathroomAdditionalUnitRate: form.nonBathroomAdditionalUnitRate,
        installMultiplierDirty: form.installMultiplierDirty,
        installMultiplierClean: form.installMultiplierClean,
        twoTimesPerMonthDiscount: form.twoTimesPerMonthDiscount,


        fixtureCount: form.fixtureCount,
        nonBathroomSqFt: form.nonBathroomSqFt,
        useExactNonBathroomSqft: form.useExactNonBathroomSqft,
        hasSaniClean: form.hasSaniClean,
        includeInstall: form.includeInstall,
        isDirtyInstall: form.isDirtyInstall,
        contractMonths: form.contractMonths,
        applyMinimum: form.applyMinimum !== false,


        perVisitBase: calc.perVisitEffective,  
        perVisit: calc.perVisitEffective,  
        perVisitMinimum: minimumThreshold,  

        frequency: {
          isDisplay: true,
          orderNo: FIELD_ORDER.frequency,
          label: "Frequency",
          type: "text" as const,
          value: saniscrubFrequencyLabels[form.frequency] || form.frequency,
          frequencyKey: form.frequency,
        },


        ...(form.fixtureCount > 0 ? {
          restroomFixtures: {
            isDisplay: true,
            orderNo: FIELD_ORDER.restroomFixtures,
            label: "Restroom Fixtures",
            type: "calc" as const,
            qty: form.fixtureCount,
            rate: displayFixtureRate,
            total: fixtureLineDisplayAmount,
          },
        } : {}),

        ...(form.nonBathroomSqFt > 0 ? {
          nonBathroomArea: {
            isDisplay: true,
            orderNo: FIELD_ORDER.nonBathroomArea,
            label: "Non-Bathroom Area",
            type: "calc" as const,
            qty: form.nonBathroomSqFt,
            rate: form.useExactNonBathroomSqft
              ? `${form.nonBathroomFirstUnitRate}/${calc.nonBathroomUnitSqFt}+${form.nonBathroomAdditionalUnitRate}`
              : (form.nonBathroomAdditionalUnitRate / calc.nonBathroomUnitSqFt).toFixed(2),
            total: nonBathroomLineDisplayAmount,
            unit: "sq ft",
          },
        } : {}),

        totals: (() => {
      const totals: any = {
            perVisit: {
              isDisplay: true,
              orderNo: FIELD_ORDER.totals.perVisit,
              label: "Per Visit Total",
              type: "dollar" as const,
              amount: calc.perVisitEffective,
            },
          };

          const displayTotal =
            form.customFirstMonthPrice !== undefined
              ? form.customFirstMonthPrice
              : form.frequency === "oneTime" ? calc.contractTotal : calc.firstMonthTotal;

          if (calc.isVisitBasedFrequency) {
            totals.firstVisit = {
              isDisplay: true,
              orderNo: FIELD_ORDER.totals.firstVisit,
              label: form.frequency === "oneTime" ? "Total Price" : "First Visit Total",
              type: "dollar" as const,
              amount: displayTotal,
            };
            if (form.frequency === "oneTime") {
              totals.totalPrice = {
                isDisplay: true,
                orderNo: FIELD_ORDER.totals.totalPrice,
                label: "Total Price",
                type: "dollar" as const,
                amount: displayTotal,
              };
            }
            totals.recurringVisit = {
              isDisplay: true,
              orderNo: FIELD_ORDER.totals.recurringVisit,
              label: "Recurring Visit Total",
              type: "dollar" as const,
              amount: calc.perVisitEffective,
              gap: "normal",
            };
          } else {
            totals.firstMonth = {
              isDisplay: true,
              orderNo: FIELD_ORDER.totals.firstMonth,
              label: "First Month Total",
              type: "dollar" as const,
              amount: calc.firstMonthTotal,
            };
            totals.monthlyRecurring = {
              isDisplay: true,
              orderNo: FIELD_ORDER.totals.monthlyRecurring,
              label: "Monthly Recurring",
              type: "dollar" as const,
              amount: calc.monthlyTotal,
              gap: "normal",
            };
          }

          if (form.frequency !== "oneTime") {
            totals.contract = {
              isDisplay: true,
              orderNo: FIELD_ORDER.totals.contract,
              label: "Contract Total",
              type: "dollar" as const,
              months: form.contractMonths,
              amount: calc.contractTotal,
            };
          }

          totals.minimum = {
            isDisplay: true,
            orderNo: FIELD_ORDER.totals.minimum,
            label: "Minimum",
            type: "dollar" as const,
            amount: minimumThreshold,
          };

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
        servicesContext.updateService("saniscrub", data);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, calc, customFields, displayFixtureRate, fixtureLineDisplayAmount]);


  const fixtureRateFieldName = (() => {


    if (form.frequency === "oneTime" || form.frequency === "weekly" ||
        form.frequency === "biweekly" || form.frequency === "twicePerMonth" ||
        form.frequency === "monthly") {
      return "fixtureRateMonthly";
    }
    if (form.frequency === "bimonthly") {
      return "fixtureRateBimonthly";
    }
    return "fixtureRateQuarterly"; 
  })();
  const fixtureRateOverride =
    fixtureRateFieldName === "fixtureRateMonthly"
      ? pricingOverrides?.fixtureRateMonthly
      : fixtureRateFieldName === "fixtureRateBimonthly"
        ? pricingOverrides?.fixtureRateBimonthly
        : pricingOverrides?.fixtureRateQuarterly;


  return (
    <div className="svc-card" style={{ position: 'relative' }}>
      {}
      {isLoadingConfig && (
        <div className="svc-loading-overlay">
          <div className="svc-loading-spinner">
            <span className="svc-sr-only">Loading configuration...</span>
          </div>
          <p className="svc-loading-text">Loading configuration...</p>
        </div>
      )}

      {}
      <div className="svc-h-row">
        <div className="svc-h">SANISCRUB</div>
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
            Monthly SaniScrub is already included at no additional charge. This
            form is for reference only.
          </div>
        </div>
      )}

      {}
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

      {}
      <div className="svc-row">
        <label>Restroom Fixtures</label>
        <div className="svc-row-right">
          <input
            className="svc-in field-qty"
            type="number"
            min="0"
            name="fixtureCount"
            value={form.fixtureCount || ""}
            onChange={onChange}
          />
          <span>@</span>
          <span>$</span>
          <input
            className="svc-in field-qty"
            type="number"
            min="0"
            step="1"
            name={fixtureRateFieldName}
            value={getDisplayValue(fixtureRateFieldName, displayFixtureRate)}
            onChange={handleLocalChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={{ backgroundColor: fixtureRateOverride ? '#fffacd' : 'white' }}
          />
          <span>=</span>
          <input
            className="svc-in-box field-qty"
            type="text"
            readOnly
            value={
              fixtureLineDisplayAmount > 0
                ? `$${fixtureLineDisplayAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
                : "$0.00"
            }
          />
        </div>
      </div>

      {}
      {}

      {}
      <div className="svc-row">
        <label>First {calc.nonBathroomUnitSqFt} sq ft Rate</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in field-qty"
              type="number"
              min="0"
              step={1}
              name="nonBathroomFirstUnitRate"
              value={form.nonBathroomFirstUnitRate || ""}
              onChange={onChange}
              style={{ backgroundColor: pricingOverrides?.nonBathroomFirstUnitRate ? '#fffacd' : 'white' }}
              title={`Rate for first ${calc.nonBathroomUnitSqFt} sq ft (from backend, editable)`}
            />
          </div>
          <span className="svc-small">/ {calc.nonBathroomUnitSqFt} sq ft (${((form.nonBathroomFirstUnitRate || 250) / calc.nonBathroomUnitSqFt).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/sq ft)</span>
        </div>
      </div>

      <div className="svc-row">
        <label>Additional Rate</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in field-qty"
              type="number"
              min="0"
              step={1}
              name="nonBathroomAdditionalUnitRate"
              value={form.nonBathroomAdditionalUnitRate || ""}
              onChange={onChange}
              style={{ backgroundColor: pricingOverrides?.nonBathroomAdditionalUnitRate ? '#fffacd' : 'white' }}
              title={`Rate per additional ${calc.nonBathroomUnitSqFt} sq ft block (from backend, editable)`}
            />
          </div>
          <span className="svc-small">/ {calc.nonBathroomUnitSqFt} sq ft (${((form.nonBathroomAdditionalUnitRate || 125) / calc.nonBathroomUnitSqFt).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/sq ft)</span>
        </div>
      </div>

      {}
      <div className="svc-row">
        <label>Non-Bathroom Area</label>
        <div className="svc-row-right">
          <input
            className="svc-in field-qty"
            type="number"
            min="0"
            name="nonBathroomSqFt"
            value={form.nonBathroomSqFt || ""}
            onChange={onChange}
          />
          <span className="svc-small">sq ft</span>
          <span>@</span>
          <span className="svc-small">calculated rate</span>
          <span>=</span>
          <div className="svc-dollar field-qty">
            <span>$</span>
            <input
              className="svc-in-box"
              type="text"
              readOnly
              value={nonBathroomLineDisplayAmount.toFixed(2)}
              title="Calculated non-bathroom area total per visit"
            />
          </div>
        </div>
      </div>

      {}
      <div className="svc-row">
        <label>Calculation Method</label>
        <div className="svc-row-right">
          <label className="svc-inline">
            <input
              type="checkbox"
              name="useExactNonBathroomSqft"
              checked={form.useExactNonBathroomSqft}
              onChange={onChange}
            />
            <span>Exact SqFt Calculation</span>
          </label>
          <span className="svc-small">
            {form.useExactNonBathroomSqft
              ? `(Exact: $${form.nonBathroomFirstUnitRate} + extra sq ft × $${((form.nonBathroomAdditionalUnitRate || 125) / calc.nonBathroomUnitSqFt).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/sq ft)`
              : `(Block: $${form.nonBathroomFirstUnitRate} + blocks × $${form.nonBathroomAdditionalUnitRate})`}
          </span>
        </div>
      </div>


      {}
      {}

      {}
      {}

      {}
      <div className="svc-row svc-row-install">
        <label>Install (First Visit Only)</label>
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
            <span>Dirty (</span>
            <input
              className="svc-in multiplier-field"
              type="number"
              min="0"
              step="0.1"
              name="installMultiplierDirty"
              value={form.installMultiplierDirty % 1 === 0 ? form.installMultiplierDirty.toString() : form.installMultiplierDirty.toFixed(1)}
              onChange={onChange}
              style={{ display: "inline", backgroundColor: pricingOverrides?.installMultiplierDirty ? '#fffacd' : 'white' }}
            />
            <span>×)</span>
          </label>
          <span className="svc-small">or Clean (</span>
          <input
            className="svc-in multiplier-field"
            type="number"
              min="0"
              step="0.1"
              name="installMultiplierClean"
              value={form.installMultiplierClean % 1 === 0 ? form.installMultiplierClean.toString() : form.installMultiplierClean.toFixed(1)}
              onChange={onChange}
              style={{ display: "inline", backgroundColor: pricingOverrides?.installMultiplierClean ? '#fffacd' : 'white' }}
            />
          <span className="svc-small">×)</span>
        </div>
      </div>

      {}
      {form.includeInstall && (
        <div className="svc-row svc-row-charge">
          <label>Installation Total</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                type="text"
                min="0"
                readOnly
                step="1"
                name="customInstallationFee"
                value={getDisplayValue(
                  'customInstallationFee',
                  form.customInstallationFee !== undefined
                    ? form.customInstallationFee
                    : calc.installOneTime,
                  true
                )}
                onChange={handleLocalChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={{
                  backgroundColor: form.customInstallationFee !== undefined ? '#fffacd' : 'white'
                }}
              />
            </div>
            <span className="svc-small"> one-time</span>
          </div>
        </div>
      )}

                  {}
      <div className="svc-row svc-row-charge">
        <label>Minimum Per Visit</label>
        <div className="svc-row-right">
          <span className="svc-small">${(form.frequency === "monthly" || form.frequency === "twicePerMonth" ? form.minimumMonthly : form.minimumBimonthly) != null ? (form.frequency === "monthly" || form.frequency === "twicePerMonth" ? form.minimumMonthly : form.minimumBimonthly)!.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : "0.00"}</span>
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

      <div className="svc-row svc-row-charge">
        <label>Per-Visit Total</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="text"
              readOnly
              value={calc.perVisitEffective.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            />
          </div>
        </div>
      </div>


      {}
      <div className="svc-row svc-row-charge">
        <label>{calc.isVisitBasedFrequency ? "First Visit Total" : "First Month Total"}</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              name="customFirstMonthPrice"
              type="number"
              min="0"
              readOnly
              step="1"
              value={
                editingValues['customFirstMonthPrice'] !== undefined
                  ? editingValues['customFirstMonthPrice']
                  : (form.customFirstMonthPrice !== undefined
                      ? form.customFirstMonthPrice.toFixed(2)
                      : calc.firstMonthTotal.toFixed(2))
              }
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{ backgroundColor: form.customFirstMonthPrice !== undefined ? '#fffacd' : 'white' }}
              title="Override first month calculation (clear to use auto-calculated value)"
            />
          </div>
        </div>
      </div>


      {}
      {}

      {}
      {form.fixtureCount > 0 && (
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
      {(form.frequency === "weekly" || form.frequency === "biweekly" ||
        form.frequency === "twicePerMonth" || form.frequency === "monthly") && (
        <div className="svc-row svc-row-charge">
          <label>Monthly Recurring</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                name="customMonthlyRecurring"
                type="number"
                min="0"
                readOnly
                step="1"
                value={form.customMonthlyRecurring !== undefined
                  ? formatNumber(form.customMonthlyRecurring)
                  : formatNumber(calc.monthlyTotal)}
                onChange={onChange}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    setForm(prev => ({ ...prev, customMonthlyRecurring: undefined }));
                  }
                }}
                style={{ backgroundColor: form.customMonthlyRecurring !== undefined ? '#fffacd' : 'white' }}
                title="Override monthly recurring calculation (clear to use auto-calculated value)"
              />
            </div>
          </div>
        </div>
      )}

      {}
      {(form.frequency === "bimonthly" || form.frequency === "quarterly" ||
        form.frequency === "biannual" || form.frequency === "annual" ||
        form.frequency === "everyFourWeeks") && (
        <div className="svc-row svc-row-charge">
          <label>Recurring Visit Total</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                type="text"
                readOnly
                value={calc.perVisitEffective.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                title="Cost per recurring visit (after first visit)"
              />
            </div>
          </div>
        </div>
      )}

      {}
      {form.frequency === "oneTime" && (
        <div className="svc-row svc-row-charge">
          <label>Total Price</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                name="customFirstMonthPrice"
                type="number"
                min="0"
                step="1"
                value={getDisplayValue(
                  'customFirstMonthPrice',
                  form.customFirstMonthPrice !== undefined
                    ? form.customFirstMonthPrice
                    : calc.contractTotal
                )}
                onChange={handleLocalChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={{ backgroundColor: form.customFirstMonthPrice !== undefined ? '#fffacd' : 'white' }}
                title="Total price for one-time service (includes installation if selected)"
              />
            </div>
          </div>
        </div>
      )}

      {}
      {}

      {}
      {form.frequency !== "oneTime" && (
        <div className="svc-row svc-row-charge">
          <label>Contract Total</label>
          <div className="svc-row-right">
            <select
              className="svc-in"
              name="contractMonths"
              value={form.contractMonths}
              onChange={onChange}
            >
              {(() => {

                const options = [];

                if (calc.frequency === "bimonthly") {

                  for (let months = 2; months <= 36; months += 2) {
                    options.push(months);
                  }
                } else if (calc.frequency === "quarterly") {

                  for (let months = 3; months <= 36; months += 3) {
                    options.push(months);
                  }
                } else if (calc.frequency === "biannual") {

                  for (let months = 6; months <= 36; months += 6) {
                    options.push(months);
                  }
                } else if (calc.frequency === "annual") {

                  for (let months = 12; months <= 36; months += 12) {
                    options.push(months);
                  }
                } else {

                  for (let months = 2; months <= 36; months++) {
                    options.push(months);
                  }
                }

                return options.map((months) => (
                  <option key={months} value={months}>
                    {months} mo
                  </option>
                ));
              })()}
            </select>
            <div className="svc-dollar">
              <span style={{ fontSize: '18px', fontWeight: 'bold' }}>$</span>
              <input
                type="number"
                min="0"
                step="1"
                name="customContractTotal"
                className="svc-in"
                value={getDisplayValue(
                  'customContractTotal',
                  form.customContractTotal !== undefined
                    ? form.customContractTotal
                    : calc.annualTotal
                )}
                onChange={handleLocalChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={{
                  borderBottom: '2px solid #ff0000',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  backgroundColor: form.customContractTotal !== undefined ? '#fffacd' : 'transparent',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  padding: '4px',
                  width: '140px'
                }}
                title="Contract total - editable"
              />
            </div>
          </div>
        </div>
      )}


    </div>
  );
};
