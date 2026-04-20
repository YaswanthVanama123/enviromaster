
import React, { useEffect, useRef, useState, type ChangeEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSync, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { useStripWaxCalc } from "./useStripWaxCalc";
import type { StripWaxFormState } from "./stripWaxTypes";
import { stripWaxPricingConfig as cfg } from "./stripWaxConfig";
import type { ServiceInitialData } from "../common/serviceTypes";
import { useServicesContextOptional } from "../ServicesContext";
import { CustomFieldManager, type CustomField } from "../CustomFieldManager";

const FIELD_ORDER = {
  frequency: 1,
  variant: 2,
  service: 10,
  totals: {
    perVisit: 20,
    monthlyRecurring: 22,
    recurringVisit: 24,
    contract: 25,
    minimum: 26,
    totalPrice: 27,
  },
} as const;

export const StripWaxForm: React.FC<
  ServiceInitialData<StripWaxFormState>
> = ({ initialData, onRemove }) => {

  const [customFields, setCustomFields] = useState<CustomField[]>(
    initialData?.customFields || []
  );


  const { form, setForm, onChange, calc, refreshConfig, isLoadingConfig } = useStripWaxCalc(initialData, customFields);
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
      onChange({ target: { name, value: numValue, type: "number" } } as any);
    } else if (value === '') {

      onChange({ target: { name, value: '', type: "number" } } as any);
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
        onChange({ target: { name, value: '', type: "number" } } as any);
        return;
      }


      onChange({ target: { name, value: numValue, type: "number" } } as any);
    }
  };


  const prevDataRef = useRef<string>("");


  const isVisitBasedFrequency = form.frequency === "oneTime" || form.frequency === "quarterly" ||
    form.frequency === "biannual" || form.frequency === "annual" || form.frequency === "bimonthly";


  const formatDisplayNumber = (value: number | undefined): string => {
    return Number.isFinite(value) ? value.toFixed(2) : "0.00";
  };

  const formatCalcValue = (value: number | undefined): string => {
    return Number.isFinite(value) ? value.toFixed(2) : "0.00";
  };

  const generateContractMonths = () => {
    const months = [];

    if (form.frequency === "oneTime") {
      return [];
    } else if (form.frequency === "bimonthly") {
      for (let i = 2; i <= cfg.maxContractMonths; i += 2) {
        months.push(i);
      }
    } else if (form.frequency === "quarterly") {
      for (let i = 3; i <= cfg.maxContractMonths; i += 3) {
        months.push(i);
      }
    } else if (form.frequency === "biannual") {
      for (let i = 6; i <= cfg.maxContractMonths; i += 6) {
        months.push(i);
      }
    } else if (form.frequency === "annual") {
      for (let i = 12; i <= cfg.maxContractMonths; i += 12) {
        months.push(i);
      }
    } else {
      for (let i = cfg.minContractMonths; i <= cfg.maxContractMonths; i++) {
        months.push(i);
      }
    }

    return months;
  };

  const contractMonthOptions = generateContractMonths();

  useEffect(() => {
    if (servicesContext) {
      const hasCustomFieldValues = customFields.some(f =>
        (f.type === 'dollar' && !!f.value && parseFloat(f.value) > 0) ||
        (f.type === 'calc' && !!f.calcValues?.right && parseFloat(f.calcValues.right) > 0)
      );
      const isActive = (form.floorAreaSqFt ?? 0) > 0 || hasCustomFieldValues;

      const frequencyLabel = typeof form.frequency === "string"
        ? form.frequency.charAt(0).toUpperCase() + form.frequency.slice(1)
        : String(form.frequency || "");
      const totalPriceValue = form.customPerVisit ?? calc.contractTotal;

      const data = isActive ? {
        serviceId: "stripwax",
        displayName: "Strip & Wax",
        isActive: true,
        ratePerSqFt: form.ratePerSqFt,
        minCharge: form.minCharge,
        serviceVariant: form.serviceVariant,
        rateCategory: form.rateCategory,
        contractMonths: form.contractMonths,
        applyMinimum: form.applyMinimum !== false,


        rawPrice: calc.rawPrice,  
        perVisit: calc.perVisit,  
        minCharge: form.minCharge,  

        frequency: {
          isDisplay: true,
          orderNo: FIELD_ORDER.frequency,
          label: "Frequency",
          type: "text" as const,
          value: frequencyLabel,
          frequencyKey: form.frequency,
        },

        variant: {
          isDisplay: true,
          orderNo: FIELD_ORDER.variant,
          label: "Service Type",
          type: "text" as const,
          value: cfg.variants[form.serviceVariant]?.label || '',
        },

        service: {
          isDisplay: true,
          orderNo: FIELD_ORDER.service,
          label: "Floor Area",
          type: "calc" as const,
          qty: form.floorAreaSqFt,
          rate: form.ratePerSqFt,
          total: calc.perVisit,
          unit: "sq ft",
        },

        totals: (() => {
          const totals: any = {
            perVisit: {
              isDisplay: true,
              orderNo: FIELD_ORDER.totals.perVisit,
              label: "Per Visit Total",
              type: "dollar" as const,
              amount: calc.perVisit,
            },
          };

          if (isVisitBasedFrequency) {


            totals.recurringVisit = {
              isDisplay: true,
              orderNo: FIELD_ORDER.totals.recurringVisit,
              label: "Recurring Visit Total",
              type: "dollar" as const,
              amount: calc.perVisit,
              gap: "normal",
            };
          } else {


            totals.monthlyRecurring = {
              isDisplay: true,
              orderNo: FIELD_ORDER.totals.monthlyRecurring,
              label: "Monthly Recurring",
              type: "dollar" as const,
              amount: calc.ongoingMonthly,
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

          if (form.frequency === "oneTime") {
            totals.totalPrice = {
              isDisplay: true,
              orderNo: FIELD_ORDER.totals.totalPrice,
              label: "Total Price",
              type: "dollar" as const,
              amount: totalPriceValue,
            };
          }

          totals.minimum = {
            isDisplay: true,
            orderNo: FIELD_ORDER.totals.minimum,
            label: "Minimum",
            type: "dollar" as const,
            amount: form.minCharge,
          };

          return totals;
        })(),

        notes: "", 
        customFields: customFields,
        contractTotal: calc.contractTotal,
        originalContractTotal: calc.originalContractTotal,
        ...(form.frequency === "oneTime" ? { totalPrice: totalPriceValue } : {}),
      } : null;

      const dataStr = JSON.stringify(data);

      if (dataStr !== prevDataRef.current) {
        prevDataRef.current = dataStr;
        console.log('🔧 [StripWax] Sending to context:', JSON.stringify(data, null, 2));
        servicesContext.updateService("stripwax", data);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, calc, customFields]);


  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      customPerVisit: undefined,
      customMonthly: undefined,
      customOngoingMonthly: undefined,
      customContractTotal: undefined,
    }));
  }, [
    form.floorAreaSqFt,
    form.ratePerSqFt,
    form.minCharge,
    form.serviceVariant,
    form.frequency,
    form.rateCategory,
    form.contractMonths,
    setForm,
  ]);

  const variantOptions = cfg.variants;

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
        <div className="svc-h">STRIP &amp; WAX FLOOR</div>
        <div className="svc-h-actions">
          <button
            type="button"
            className="svc-mini"
            onClick={() => refreshConfig(true)}
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
            <option value="biweekly">Bi-Weekly</option>
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
        <label>Service Type</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="serviceVariant"
            value={form.serviceVariant}
            onChange={onChange}
          >
            {(
              Object.keys(variantOptions) as Array<
                keyof typeof variantOptions
              >
            ).map((k) => (
              <option key={k} value={k}>
                {variantOptions[k].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {}
      <div className="svc-row">
        <label>Floor Area</label>
        <div className="svc-row-right">
          <input
            className="svc-in svc-in-small field-qty"
            type="number"
            min="0"
            step={1}
            name="floorAreaSqFt"
            value={getDisplayValue('floorAreaSqFt', form.floorAreaSqFt)}
            onChange={handleLocalChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          <span className="svc-multi">@</span>
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in svc-in-small field-qty"
                type="number"
                min="0"
                step={0.01}
                name="ratePerSqFt"
                value={getDisplayValue('ratePerSqFt', form.ratePerSqFt)}
                onChange={handleLocalChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                title="Rate per sq ft (from backend, editable)"
                style={{
                  backgroundColor: form.customRatePerSqFt !== undefined ? '#fffacd' : 'white',
                }}
              />
            </div>
          <span className="svc-small">/sq ft</span>
          <span className="svc-eq">=</span>
          <span className="svc-dollar">
          ${formatCalcValue(calc.perVisit)}
          </span>
        </div>
      </div>

      {}
      <div className="svc-row">
        <label></label>
        <div className="svc-row-right">
            <span className="svc-small">
              (Direct: area × $${formatDisplayNumber(form.ratePerSqFt)}/sq ft, min $${formatDisplayNumber(form.minCharge)})
            </span>
        </div>
      </div>

      {}
      <div className="svc-row">
        <label>Minimum Charge</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in svc-in-small"
              type="number"
              min="0"
              step={1}
              name="minCharge"
              value={form.minCharge || ""}
              onChange={onChange}
              title="Minimum charge per visit (from backend, editable)"
              style={{
                backgroundColor: form.customMinCharge !== undefined ? '#fffacd' : 'white',
              }}
            />
          </div>
          <span className="svc-small">minimum</span>
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
      {}

      {}
      <div className="svc-row svc-row-total">
        <label>Per Visit Total</label>
        <div className="svc-dollar">
          $<input
            type="number"
            min="0"
            readOnly
            step="1"
            name="customPerVisit"
            className="svc-in svc-in-small"
            value={getDisplayValue(
              'customPerVisit',
              form.customPerVisit !== undefined
                ? form.customPerVisit
                : calc.perVisit
            )}
            onChange={handleLocalChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={{
              backgroundColor: form.customPerVisit !== undefined ? '#fffacd' : 'white',
              border: 'none',
              width: '100px'
            }}
            title="Per visit total - editable"
          />
        </div>
      </div>

            {}
      {isVisitBasedFrequency && form.frequency !== "oneTime" || form.frequency === "quarterly" ||
    form.frequency === "biannual" || form.frequency === "annual" || form.frequency === "bimonthly" && (
        <div className="svc-row svc-row-total">
          <label>First Visit Total</label>
          <div className="svc-dollar">
            $<input
              type="number"
              min="0"
              step="1"
              readOnly
              name="customMonthly"
              className="svc-in svc-in-small"
              value={getDisplayValue(
                'customMonthly',
                form.customMonthly !== undefined
                  ? form.customMonthly
                  : calc.monthly
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{
                backgroundColor: form.customMonthly !== undefined ? '#fffacd' : 'white',
                border: 'none',
                width: '100px'
              }}
              title="First visit total - editable"
            />
          </div>
        </div>
      )}

      {}
      {form.floorAreaSqFt > 0 && (
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
      {(form.frequency === "bimonthly" || form.frequency === "quarterly" ||
        form.frequency === "biannual" || form.frequency === "annual") && (
        <div className="svc-row svc-row-total">
          <label>Recurring Visit Total</label>
          <div className="svc-dollar">
            ${formatCalcValue(calc.perVisit)}
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
              step="1"
              name="customMonthly"
              className="svc-in svc-in-small"
              value={getDisplayValue(
                'customMonthly',
                form.customMonthly !== undefined
                  ? form.customMonthly
                  : calc.contractTotal
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{
                backgroundColor: form.customMonthly !== undefined ? '#fffacd' : 'white',
                border: 'none',
                width: '100px'
              }}
              title="Total price for one-time service - editable"
            />
          </div>
        </div>
      )}


      {}
      {!isVisitBasedFrequency && (
        <div className="svc-row svc-row-total">
          <label>First Month Total</label>
          <div className="svc-dollar">
            $<input
              type="number"
              min="0"
              readOnly
              step="1"
              name="customMonthly"
              className="svc-in svc-in-small"
              value={getDisplayValue(
                'customMonthly',
                form.customMonthly !== undefined
                  ? form.customMonthly
                  : calc.monthly
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{
                backgroundColor: form.customMonthly !== undefined ? '#fffacd' : 'white',
                border: 'none',
                width: '100px'
              }}
              title="First month total - editable"
            />
          </div>
        </div>
      )}

      {}
      {!isVisitBasedFrequency && (
        <div className="svc-row svc-row-total">
          <label>Monthly Recurring</label>
          <div className="svc-dollar">
            $<input
              type="number"
              min="0"
              readOnly
              step="1"
              name="customOngoingMonthly"
              className="svc-in svc-in-small"
              value={getDisplayValue(
                'customOngoingMonthly',
                form.customOngoingMonthly !== undefined
                  ? form.customOngoingMonthly
                  : calc.ongoingMonthly
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{
                backgroundColor: form.customOngoingMonthly !== undefined ? '#fffacd' : 'white',
                border: 'none',
                width: '100px'
              }}
              title="Ongoing monthly - editable"
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
              {contractMonthOptions.map((m) => (
                <option key={m} value={m}>
                  {m} months
                </option>
              ))}
            </select>
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
