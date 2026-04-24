import React, { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSync, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { useCarpetCalc } from "./useCarpetCalc";
import type { CarpetFormState, CarpetFrequency } from "./carpetTypes";
import type { ServiceInitialData } from "../common/serviceTypes";
import {
  carpetFrequencyLabels,
  carpetFrequencyList,
  getContractOptions,
} from "./carpetConfig";
import { useServicesContextOptional } from "../ServicesContext";
import { CustomFieldManager, type CustomField } from "../CustomFieldManager";


export const CarpetForm: React.FC<
  ServiceInitialData<CarpetFormState>
> = ({ initialData, onQuoteChange, onRemove }) => {

  const [customFields, setCustomFields] = useState<CustomField[]>(
    initialData?.customFields || []
  );


  const { form, setForm, onChange, quote, calc, refreshConfig, isLoadingConfig } = useCarpetCalc(initialData, customFields);
  const servicesContext = useServicesContextOptional();


  useEffect(() => {
    if (servicesContext?.globalContractMonths && servicesContext.globalContractMonths !== form.contractMonths) {
      setForm({ ...form, contractMonths: servicesContext.globalContractMonths });
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


  const prevDataRef = useRef<string>("");

  const monthlyRecurringFrequencies: CarpetFrequency[] = [
    "weekly",
    "biweekly",
    "twicePerMonth",
    "monthly",
  ];
  const visitBasedRecurringFrequencies: CarpetFrequency[] = [
    "bimonthly",
    "quarterly",
    "biannual",
    "annual",
    "everyFourWeeks",
  ];

  const resolveCarpetFrequency = (value: string): CarpetFrequency => {
    if (carpetFrequencyList.includes(value as CarpetFrequency)) {
      return value as CarpetFrequency;
    }
    const normalized = value?.trim().toLowerCase() || "";
    const match = carpetFrequencyList.find(
      (freq) => carpetFrequencyLabels[freq].toLowerCase() === normalized
    );
    return match || "monthly";
  };
  const FIELD_ORDER = {
    frequency: 1,
    location: 2,
    service: 3,
    installation: 4,
    perVisit: 5,
    firstMonth: 6,
    recurringVisit: 7,
    recurringMonth: 8,
    contract: 9,
    totalPrice: 10,
  };

  useEffect(() => {
    if (servicesContext) {
      const resolvedFrequency = resolveCarpetFrequency(form.frequency);
      const hasCustomFieldValues = customFields.some(f =>
        (f.type === 'dollar' && !!f.value && parseFloat(f.value) > 0) ||
        (f.type === 'calc' && !!f.calcValues?.right && parseFloat(f.calcValues.right) > 0)
      );
      const isActive = (form.areaSqFt ?? 0) > 0 || hasCustomFieldValues;
      const shouldShowMonthlyRecurring = monthlyRecurringFrequencies.includes(resolvedFrequency);
      const shouldShowVisitRecurring = visitBasedRecurringFrequencies.includes(resolvedFrequency);
      const displayFrequencyLabel =
        carpetFrequencyLabels[resolvedFrequency] || resolvedFrequency;
      const shouldShowRecurringGap =
        resolvedFrequency !== "oneTime" &&
        (shouldShowMonthlyRecurring || shouldShowVisitRecurring);

      const totalLabel =
        resolvedFrequency === "oneTime"
          ? "Total Price"
          : shouldShowVisitRecurring
            ? "First Visit Total"
            : "First Month Total";
      const totalAmount =
        resolvedFrequency === "oneTime"
          ? form.customFirstMonthPrice !== undefined
            ? form.customFirstMonthPrice
            : calc.contractTotal
          : calc.firstMonthTotal;

      const totals: any = {
        perVisit: {
          isDisplay: true,
          orderNo: FIELD_ORDER.perVisit,
          label: "Per Visit Total",
          type: "dollar" as const,
          amount: calc.perVisitCharge,
        },
        firstMonth: {
          isDisplay: true,
          orderNo: FIELD_ORDER.firstMonth,
          label: totalLabel,
          type: "dollar" as const,
          amount: totalAmount,
        },
      };

      if (resolvedFrequency === "oneTime") {
        totals.totalPrice = {
          isDisplay: true,
          orderNo: FIELD_ORDER.totalPrice,
          label: "Total Price",
          type: "dollar" as const,
          amount: totalAmount,
        };
      }

      if (shouldShowMonthlyRecurring) {
        totals.monthlyRecurring = {
          isDisplay: true,
          orderNo: FIELD_ORDER.recurringMonth,
          label: "Monthly Recurring",
          type: "dollar" as const,
          amount: calc.monthlyTotal,
          gap: "normal",
        };
        }

        if (shouldShowVisitRecurring) {
          totals.recurringVisit = {
            isDisplay: true,
            orderNo: FIELD_ORDER.recurringVisit,
            label: "Recurring Visit Total",
            type: "dollar" as const,
            amount: calc.perVisitCharge,
            gap: "normal",
          };
        }

        if (resolvedFrequency !== "oneTime") {
        totals.contract = {
          isDisplay: true,
          orderNo: FIELD_ORDER.contract,
          label: "Contract Total",
          type: "dollar" as const,
          months: form.contractMonths,
          amount: calc.contractTotal,
        };
      }

      const data = isActive ? {
        serviceId: "carpetclean",
      displayName: "Carpet Cleaning",
      isActive: true,


      firstUnitRate: form.customFirstUnitRate ?? form.firstUnitRate,
      additionalUnitRate: form.customAdditionalUnitRate ?? form.additionalUnitRate,
      perVisitMinimum: form.customPerVisitMinimum ?? form.perVisitMinimum,
      installMultiplierDirty: form.installMultiplierDirty,
      installMultiplierClean: form.installMultiplierClean,
      unitSqFt: form.unitSqFt,
      useExactSqft: form.useExactSqft,
      applyMinimum: form.applyMinimum !== false,


      areaSqFt: form.areaSqFt,
      frequency: form.frequency,
      contractMonths: form.contractMonths,
      includeInstall: form.includeInstall,
      isDirtyInstall: form.isDirtyInstall,
      location: form.location,


      contractTotal: calc.contractTotal,
      originalContractTotal: calc.originalContractTotal,


        perVisitBase: calc.perVisitBase,  
        perVisitCharge: calc.perVisitCharge,  

        frequency: {
          isDisplay: true,
          orderNo: FIELD_ORDER.frequency,
          label: "Frequency",
          type: "text" as const,
          value: displayFrequencyLabel,
          frequencyKey: resolvedFrequency,
        },

        location: {
          isDisplay: false,
          orderNo: FIELD_ORDER.location,
          label: "Location",
          type: "text" as const,
          value: form.location === "insideBeltway" ? "Inside Beltway" : "Outside Beltway",
        },

        service: {
          isDisplay: true,
          orderNo: FIELD_ORDER.service,
          label: "Carpet Area",
          type: "calc" as const,
          qty: form.areaSqFt,
          rate: form.customFirstUnitRate ?? form.firstUnitRate,  
          total: calc.perVisitCharge,
          unit: "sq ft",
        },


        ...(form.includeInstall ? {
          installation: {
            isDisplay: true,
             orderNo: FIELD_ORDER.installation,

           label: form.isDirtyInstall ? "Installation" : "Installation",
            type: "calc" as const,
            qty: 1,
            rate: calc.installOneTime,
            total: calc.installOneTime,
            multiplier: form.isDirtyInstall ? form.installMultiplierDirty : form.installMultiplierClean,
            isDirty: form.isDirtyInstall,
          },
        } : {}),

        totals,

        notes: form.notes || "",
        customFields: customFields,
        pdfFieldVisibility: {
          location: false,
          useExactSqft: false,
          includeInstall: false,
          isDirtyInstall: false,
        },
      } : null;

      const dataStr = JSON.stringify(data);

      if (dataStr !== prevDataRef.current) {
        prevDataRef.current = dataStr;
        console.log('🔧 [CarpetForm] Sending data to context with pricing fields:', {
          firstUnitRate: data?.firstUnitRate,
          additionalUnitRate: data?.additionalUnitRate,
          perVisitMinimum: data?.perVisitMinimum,
          fullData: JSON.stringify(data, null, 2)
        });
        servicesContext.updateService("carpetclean", data);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, calc, customFields]);

  React.useEffect(() => {
    if (onQuoteChange) onQuoteChange(quote);
  }, [onQuoteChange, quote]);


  useEffect(() => {
    setForm((prev: any) => ({
      ...prev,
      customPerVisitPrice: undefined,
      customInstallationFee: undefined,  
      customMonthlyRecurring: undefined,
      customFirstMonthPrice: undefined,
      customContractTotal: undefined,
    }));
  }, [

    form.areaSqFt,           
    form.useExactSqft,       
    form.frequency,          
    form.contractMonths,     
    form.includeInstall,     
    form.isDirtyInstall,     


    setForm,
  ]);

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

      <div className="svc-h-row">
        <div className="svc-h">CARPET CLEANING</div>
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
              className="svc-mini"
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
      <div className="svc-row">
        <label>Frequency</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="frequency"
            value={form.frequency}
            onChange={onChange}
          >
            {Object.entries(carpetFrequencyLabels).map(
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
        <label>First {form.unitSqFt || 500} sq ft Rate</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in field-qty"
              type="number"
              min="0"
              step="1"
              name="customFirstUnitRate"
              value={getDisplayValue(
                'customFirstUnitRate',
                form.customFirstUnitRate !== undefined
                  ? form.customFirstUnitRate
                  : form.firstUnitRate
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{ backgroundColor: form.customFirstUnitRate !== undefined ? '#fffacd' : 'white' }}
              title={`Rate for first ${form.unitSqFt || 500} sq ft (from backend, editable)`}
            />
          </div>
          <span className="svc-small">/ {form.unitSqFt || 500} sq ft (${(((form.customFirstUnitRate ?? form.firstUnitRate) || 250) / (form.unitSqFt || 500)).toFixed(2)}/sq ft)</span>
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
              step="1"
              name="customAdditionalUnitRate"
              value={getDisplayValue(
                'customAdditionalUnitRate',
                form.customAdditionalUnitRate !== undefined
                  ? form.customAdditionalUnitRate
                  : form.additionalUnitRate
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{ backgroundColor: form.customAdditionalUnitRate !== undefined ? '#fffacd' : 'white' }}
              title={`Rate per additional ${form.unitSqFt || 500} sq ft block (from backend, editable)`}
            />
          </div>
          <span className="svc-small">/ {form.unitSqFt || 500} sq ft (${(((form.customAdditionalUnitRate ?? form.additionalUnitRate) || 125) / (form.unitSqFt || 500)).toFixed(2)}/sq ft)</span>
        </div>
      </div>

      <div className="svc-row">
        <label>Minimum Charge</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in field-qty"
              type="number"
              min="0"
              step="1"
              name="customPerVisitMinimum"
              value={getDisplayValue(
                'customPerVisitMinimum',
                form.customPerVisitMinimum !== undefined
                  ? form.customPerVisitMinimum
                  : form.perVisitMinimum
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{ backgroundColor: form.customPerVisitMinimum !== undefined ? '#fffacd' : 'white' }}
              title="Minimum charge per visit (from backend, editable)"
            />
          </div>
          <span className="svc-small">/ visit</span>
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
        <label>Carpet Area</label>
        <div className="svc-row-right">
          <input
            className="svc-in field-qty"
            type="number"
            min="0"
            name="areaSqFt"
            value={form.areaSqFt || ""}
            onChange={onChange}
          />
          <span className="svc-small">sq ft</span>
          <span>@</span>
          <span className="svc-small">
            {form.areaSqFt > 0 && form.areaSqFt <= (form.unitSqFt || 500)
              ? `first ${form.unitSqFt || 500} rate`
              : `calculated rate`}
          </span>
          <span>=</span>
          <div className="svc-dollar field-qty">
            <span>$</span>
            <input
              className="svc-in-box"
              type="number"
              readOnly
              min="0"
              step="1"
              name="customPerVisitPrice"
              value={getDisplayValue(
                'customPerVisitPrice',
                form.customPerVisitPrice !== undefined
                  ? form.customPerVisitPrice
                  : calc.perVisitCharge
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{ backgroundColor: form.customPerVisitPrice !== undefined ? '#fffacd' : 'white' }}
              title="Per visit total (editable)"
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
              name="useExactSqft"
              checked={form.useExactSqft}
              onChange={onChange}
            />
            <span>Exact sq ft calculation</span>
          </label>
          <small style={{ color: "#666", fontSize: "11px", marginLeft: "10px" }}>
            {form.useExactSqft
              ? `(Excess × $${(((form.customAdditionalUnitRate ?? form.additionalUnitRate) || 125) / (form.unitSqFt || 500)).toFixed(2)}/sq ft)`
              : `(Excess in ${form.unitSqFt || 500} sq ft blocks × $${(form.customAdditionalUnitRate ?? form.additionalUnitRate) || 125})`}
          </small>
        </div>
      </div>


      {}
      {}

      {}
      {}

      {}
      <div className="svc-row">
        <label>Installation</label>
        <div className="svc-row-right">
          <label className="svc-inline">
            <input
              type="checkbox"
              name="includeInstall"
              checked={form.includeInstall}
              onChange={onChange}
            />
            <span>Include Install</span>
          </label>

          {form.includeInstall && (
            <>
              <label className="svc-inline">
                <input
                  type="checkbox"
                  name="isDirtyInstall"
                  checked={form.isDirtyInstall}
                  onChange={onChange}
                />
                <span>Dirty</span>
              </label>
              <div className="svc-dollar">
                <span>×</span>
                <input
                  className="svc-in"
                  type="number"
                  min="0"
                  step={1}
                  name={form.isDirtyInstall ? "installMultiplierDirty" : "installMultiplierClean"}
                  value={form.isDirtyInstall ? (form.installMultiplierDirty || "") : (form.installMultiplierClean || "")}
                  onChange={onChange}
                  title={`${form.isDirtyInstall ? 'Dirty' : 'Clean'} install multiplier (from backend)`}
                />
              </div>
              <span className="svc-small">monthly base</span>
            </>
          )}
        </div>
      </div>

      {}
      {form.includeInstall && calc.installOneTime > 0 && (
        <div className="svc-row svc-row-charge">
          <label>Installation Total</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                type="number"
                min="0"
                readOnly
                step="1"
                name="customInstallationFee"
                value={getDisplayValue(
                  'customInstallationFee',
                  form.customInstallationFee !== undefined
                    ? form.customInstallationFee
                    : calc.installOneTime
                )}
                onChange={handleLocalChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={{ backgroundColor: form.customInstallationFee !== undefined ? '#fffacd' : 'white' }}
                title="Installation fee total (editable)"
              />
            </div>
          </div>
        </div>
      )}

      {}
      <div className="svc-row svc-row-total">
        <label>
          {}
          {form.frequency === "bimonthly" ||
           form.frequency === "quarterly" ||
           form.frequency === "biannual" ||
           form.frequency === "annual"
            ? "Recurring Visit Total"
            : "Per Visit Total"}
        </label>
        <div className="svc-dollar">
          $<input
            type="number"
            min="0"
            step="1"
            readOnly
            name="customPerVisitPrice"
            className="svc-in svc-in-small"
            value={getDisplayValue(
              'customPerVisitPrice',
              form.customPerVisitPrice !== undefined
                ? form.customPerVisitPrice
                : calc.perVisitCharge
            )}
            onChange={handleLocalChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={{
              backgroundColor: form.customPerVisitPrice !== undefined ? '#fffacd' : 'white',
              border: 'none',
              width: '100px'
            }}
            title={form.frequency === "bimonthly" ||
                   form.frequency === "quarterly" ||
                   form.frequency === "biannual" ||
                   form.frequency === "annual"
                    ? "Recurring visit total - editable"
                    : "Per visit total - editable"}
          />
        </div>
      </div>

            {}
      {form.areaSqFt > 0 && (
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
      {form.frequency === "oneTime" && (
        <div className="svc-row svc-row-total">
          <label>Total Price</label>
          <div className="svc-dollar">
            $<input
              type="number"
              min="0"
              readOnly
              step="1"
              name="customFirstMonthPrice"
              className="svc-in svc-in-small"
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
                border: 'none',
                width: '100px'
              }}
              title="Total price for one-time service - editable"
            />
          </div>
        </div>
      )}

      {}
      {calc.isVisitBasedFrequency && form.frequency !== "oneTime" && (
        <div className="svc-row svc-row-total">
          <label>First Visit Total</label>
          <div className="svc-dollar">
            $<input
              type="number"
              min="0"
              readOnly
              step="1"
              name="customFirstMonthPrice"
              className="svc-in svc-in-small"
              value={getDisplayValue(
                'customFirstMonthPrice',
                form.customFirstMonthPrice !== undefined
                  ? form.customFirstMonthPrice
                  : calc.firstMonthTotal
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{
                backgroundColor: form.customFirstMonthPrice !== undefined ? '#fffacd' : 'white',
                border: 'none',
                width: '100px'
              }}
              title="First visit total - editable"
            />
          </div>
        </div>
      )}

      {}
      {!calc.isVisitBasedFrequency && form.frequency !== "oneTime" && (
        <div className="svc-row svc-row-total">
          <label>First Month Total</label>
          <div className="svc-dollar">
            $<input
              type="number"
              min="0"
              readOnly
              step="1"
              name="customFirstMonthPrice"
              className="svc-in svc-in-small"
              value={getDisplayValue(
                'customFirstMonthPrice',
                form.customFirstMonthPrice !== undefined
                  ? form.customFirstMonthPrice
                  : calc.firstMonthTotal
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{
                backgroundColor: form.customFirstMonthPrice !== undefined ? '#fffacd' : 'white',
                border: 'none',
                width: '100px'
              }}
              title="First month total - editable"
            />
          </div>
        </div>
      )}

      {}
      {(form.frequency === "weekly" || form.frequency === "biweekly" || form.frequency === "monthly" || form.frequency === "twicePerMonth") && (
        <div className="svc-row svc-row-total">
          <label>Recurring Month Total</label>
          <div className="svc-dollar">
            $<input
              type="number"
              min="0"
              readOnly
              step="1"
              name="customMonthlyRecurring"
              className="svc-in svc-in-small"
              value={getDisplayValue(
                'customMonthlyRecurring',
                form.customMonthlyRecurring !== undefined
                  ? form.customMonthlyRecurring
                  : calc.monthlyTotal
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{
                backgroundColor: form.customMonthlyRecurring !== undefined ? '#fffacd' : 'white',
                border: 'none',
                width: '100px'
              }}
              title="Recurring month total - editable"
            />
          </div>
        </div>
      )}

      {}
      {form.frequency !== "oneTime" && (
        <div className="svc-row svc-row-total">
          <label>Contract Total</label>
          <div className="svc-row-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select
              className="svc-in"
              name="contractMonths"
              value={form.contractMonths} 
              onChange={onChange}
            >
              {getContractOptions(form.frequency).map((m) => (
                <option key={m} value={m}>
                  {m} months
                </option>
              ))}
            </select>
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>$</span>
            <input
              type="number"
              min="0"
              readOnly
              step="1"
              name="customContractTotal"
              className="svc-in"
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
      )}
    </div>
  );
};
