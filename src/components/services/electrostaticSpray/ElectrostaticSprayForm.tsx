

import React, { useEffect, useRef, useState, type ChangeEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSync, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { useElectrostaticSprayCalc } from "./useElectrostaticSprayCalc";
import type { ElectrostaticSprayFormState } from "./electrostaticSprayTypes";
import { electrostaticSprayPricingConfig as cfg } from "./electrostaticSprayConfig";
import type { ServiceInitialData } from "../common/serviceTypes";
import { useServicesContextOptional } from "../ServicesContext";
import { CustomFieldManager, type CustomField } from "../CustomFieldManager";

const FIELD_ORDER = {
  frequency: 1,

  combinedService: 5,
  service: 10,
  calculationMethod: 11,
  tripCharge: 12,
  totals: {
    perVisit: 20,
    monthlyRecurring: 22,
    recurringVisit: 24,
    contract: 25,
    minimum: 26,
    totalPrice: 27,
  },
} as const;


const formatNumber = (num: number): string => {
  return num % 1 === 0 ? num.toString() : num.toFixed(2);
};

export const ElectrostaticSprayForm: React.FC<ServiceInitialData<ElectrostaticSprayFormState>> = ({
  initialData,
  onRemove,
}) => {

  const [customFields, setCustomFields] = useState<CustomField[]>(
    initialData?.customFields || []
  );


  const { form, setForm, onChange, calc, isLoadingConfig, refreshConfig, activeConfig } = useElectrostaticSprayCalc(initialData, customFields);
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


  const isSanicleanAllInclusive =
    servicesContext?.isSanicleanAllInclusive ?? false;


  const prevDataRef = useRef<string>("");


  const serviceRate = form.pricingMethod === "byRoom"
    ? form.ratePerRoom
    : form.ratePerThousandSqFt;


  const { isVisitBasedFrequency, monthsPerVisit } = calc;


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
      const isActive = (form.roomCount > 0 || form.squareFeet > 0) || hasCustomFieldValues;

      const frequencyLabel = typeof form.frequency === 'string'
        ? form.frequency.charAt(0).toUpperCase() + form.frequency.slice(1)
        : String(form.frequency || 'Weekly');
      const visitBasedFrequency = ["oneTime", "quarterly", "biannual", "annual", "bimonthly"].includes(form.frequency);
      const totalPriceValue =
        form.customFirstMonthTotal !== undefined ? form.customFirstMonthTotal : calc.contractTotal;

      const data = isActive ? {
        serviceId: "electrostaticSpray",
        displayName: "Electrostatic Spray",
        isActive: true,


        ratePerRoom: form.customRatePerRoom ?? form.ratePerRoom,
        ratePerThousandSqFt: form.customRatePerThousandSqFt ?? form.ratePerThousandSqFt,
        tripChargePerVisit: form.customTripChargePerVisit ?? form.tripChargePerVisit,


        pricingMethod: form.pricingMethod,
        roomCount: form.roomCount,
        squareFeet: form.squareFeet,
        useExactCalculation: form.useExactCalculation,
        frequency: form.frequency,
        contractMonths: form.contractMonths,
        isCombinedWithSaniClean: form.isCombinedWithSaniClean,

        applyMinimum: form.applyMinimum !== false,


        perVisitBase: calc.serviceCharge,  
        perVisit: calc.perVisit,  
        minimumChargePerVisit: calc.minimumChargePerVisit,  


        pricingMethodDisplay: {
          isDisplay: true,
          label: "Pricing Method",
          type: "text" as const,
          value: form.pricingMethod === "byRoom" ? "By Room" : "By Square Feet",
        },

        frequency: {
          isDisplay: true,
          orderNo: FIELD_ORDER.frequency,
          label: "Frequency",
          type: "text" as const,
          value: frequencyLabel,
          frequencyKey: form.frequency,
        },

        frequencyDisplay: {
          isDisplay: true,
          orderNo: FIELD_ORDER.frequency,
          label: "Frequency",
          type: "text" as const,
          value: frequencyLabel,
          frequencyKey: form.frequency,
        },


        ...(form.isCombinedWithSaniClean ? {
          combinedService: {
            isDisplay: true,
            orderNo: FIELD_ORDER.combinedService,
            label: "Combined with",
            type: "text" as const,
            value: "Sani-Clean",
          },
        } : {}),

        service: {
          isDisplay: true,
          orderNo: FIELD_ORDER.service,
          label: form.pricingMethod === "byRoom" ? "Rooms" : "Square Feet",
          type: "calc" as const,
          qty: form.pricingMethod === "byRoom" ? form.roomCount : form.squareFeet,
          rate: serviceRate,
          total: calc.serviceCharge,
          unit: form.pricingMethod === "byRoom" ? "rooms" : "sq ft",
        },

        ...(form.pricingMethod === "bySqFt" && !form.useExactCalculation ? {
          calculationMethod: {
            isDisplay: true,
            orderNo: FIELD_ORDER.calculationMethod,
            label: "Calculation Method",
            type: "text" as const,
            value: "Minimum Tier Pricing",
          },
        } : {}),

        ...(calc.tripCharge > 0 ? {
          tripCharge: {
            isDisplay: true,
            orderNo: FIELD_ORDER.tripCharge,
            label: "Trip Charge",
            type: "dollar" as const,
            amount: calc.tripCharge,
          },
        } : {}),

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

          if (visitBasedFrequency) {


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
            amount: calc.minimumChargePerVisit,
          };

          return totals;
        })(),

        notes: form.notes || "",
        customFields: customFields,
        contractTotal: calc.contractTotal,
        originalContractTotal: calc.originalContractTotal,
        ...(form.frequency === "oneTime" ? { totalPrice: totalPriceValue } : {}),
      } : null;

      const dataStr = JSON.stringify(data);

      if (dataStr !== prevDataRef.current) {
        prevDataRef.current = dataStr;
        console.log('🔧 [ElectrostaticSpray] Sending to context:', JSON.stringify(data, null, 2));
        servicesContext.updateService("electrostaticSpray", data);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, calc, customFields]); 


  useEffect(() => {
    const validMonths = generateContractMonths();

    if (!validMonths.includes(form.contractMonths)) {

      const closestMonth = validMonths.find(month => month >= form.contractMonths) || validMonths[0];

      setForm(prev => ({
        ...prev,
        contractMonths: closestMonth
      }));
    }
  }, [form.frequency]); 


  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      customRatePerRoom: undefined,
      customRatePerThousandSqFt: undefined,
      customTripChargePerVisit: undefined,
      customServiceCharge: undefined,
      customPerVisitPrice: undefined,
      customMonthlyRecurring: undefined,
      customContractTotal: undefined,
      customFirstMonthTotal: undefined,
    }));
  }, [
    form.roomCount,
    form.squareFeet,
    form.pricingMethod,
    form.useExactCalculation,
    form.frequency,
    form.contractMonths,
    form.isCombinedWithSaniClean,

  ]);

  return (
    <div className="svc-card">
      <div className="svc-card__inner">
        <div className="svc-h-row">
          <div className="svc-h">ELECTROSTATIC SPRAY</div>
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
        {isLoadingConfig && (
          <div className="svc-row">
            <div className="svc-field" style={{ textAlign: 'center', padding: '10px', color: '#666' }}>
              Loading pricing configuration...
            </div>
          </div>
        )}

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
              Electrostatic Spray is already included at no additional charge. This
              form is for reference only.
            </div>
          </div>
        )}

        {}
        <div className="svc-row">
          <div className="svc-label" />
          <div className="svc-field">
            <label>
              <input
                type="checkbox"
                name="isCombinedWithSaniClean"
                checked={form.isCombinedWithSaniClean}
                onChange={onChange}
              />{" "}
              Combined with Sani-Clean
            </label>
          </div>
        </div>

        {}
        <div className="svc-row">
          <div className="svc-label">
            <span>Frequency</span>
          </div>
          <div className="svc-field">
            <select
              name="frequency"
              className="svc-in"
              value={form.frequency}
              onChange={onChange}
            >
              <option value="oneTime">One Time</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-Weekly (every 2 weeks)</option>
              <option value="twicePerMonth">2× / Month</option>
              <option value="monthly">Monthly</option>
              <option value="bimonthly">Bi-Monthly (every 2 months)</option>
              <option value="quarterly">Quarterly</option>
              <option value="biannual">Bi-Annual</option>
              <option value="annual">Annual</option>
            </select>
          </div>
        </div>

        {}
        <div className="svc-row">
          <div className="svc-label">
            <span>Pricing Method</span>
          </div>
          <div className="svc-field">
            <select
              name="pricingMethod"
              className="svc-in"
              value={form.pricingMethod}
              onChange={onChange}
            >
              <option value="byRoom">By Room (${formatNumber(form.ratePerRoom)} per room)</option>
              <option value="bySqFt">By Square Feet (${formatNumber(form.ratePerThousandSqFt)} per {activeConfig.standardSprayPricing.sqFtUnit} sq ft)</option>
            </select>
          </div>
        </div>


        {}
        <div className="svc-summary">
          <div className="svc-row" style={{ marginBottom: '5px' }}>
            {}
          </div>
          {form.pricingMethod === "byRoom" && (
            <div className="svc-row">
              <div className="svc-label">
                <span>Room Calculation</span>
              </div>
              <div className="svc-field">
                <div className="svc-inline">
                  <input
                    type="number"
                    min="0"
                    name="roomCount"
                    className="svc-in field-qty"
                    value={form.roomCount || ""}
                    onChange={onChange}
                    title="Number of rooms"
                  />
                  <span>@</span>
                  <span>$</span>
                  <input
                    type="number"
                    min="0"
                    name="customRatePerRoom"
                    step="1"
                    className="svc-in field-rate"
                    value={getDisplayValue(
                      'customRatePerRoom',
                      form.customRatePerRoom !== undefined
                        ? form.customRatePerRoom
                        : form.ratePerRoom
                    )}
                    onChange={handleLocalChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    style={{ backgroundColor: form.customRatePerRoom !== undefined ? '#fffacd' : 'white' }}
                    title="Rate per room (editable - changes calculation)"
                  />
                  <span>=</span>
                  <span>$</span>
                  <input
                    type="number"
                    min="0"
                    readOnly
                    step="0.01"
                    name="customServiceCharge"
                    className="svc-in field-qty"
                    value={getDisplayValue(
                      'customServiceCharge',
                      form.customServiceCharge !== undefined
                        ? form.customServiceCharge
                        : calc.serviceCharge
                    )}
                    onChange={handleLocalChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    style={{
                      backgroundColor: form.customServiceCharge !== undefined ? '#fffacd' : 'white'
                    }}
                    title="Total service charge - editable"
                  />
                </div>
              </div>
            </div>
          )}

          {form.pricingMethod === "bySqFt" && (
            <div className="svc-row">
              <div className="svc-label">
                <span>Square Feet Calculation</span>
              </div>
              <div className="svc-field">
                <div className="svc-inline">
                  <input
                    type="number"
                    min="0"
                    name="squareFeet"
                    className="svc-in field-qty"
                    value={form.squareFeet || ""}
                    onChange={onChange}
                    title="Total square feet"
                  />
                  <span>@</span>
                  <span>$</span>
                  <input
                    type="number"
                    min="0"
                    name="customRatePerThousandSqFt"
                    step={1}
                    className="svc-in field-rate"
                    value={getDisplayValue(
                      'customRatePerThousandSqFt',
                      form.customRatePerThousandSqFt !== undefined
                        ? form.customRatePerThousandSqFt
                        : form.ratePerThousandSqFt
                    )}
                    onChange={handleLocalChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    style={{ backgroundColor: form.customRatePerThousandSqFt !== undefined ? '#fffacd' : 'white' }}
                    title="Rate per 1000 sq ft (editable - changes calculation)"
                  />
                  <span>=</span>
                  <span>$</span>
                  <input
                    type="number"
                    min="0"
                    readOnly
                    step="0.01"
                    name="customServiceCharge"
                    className="svc-in field-qty"
                    value={getDisplayValue(
                      'customServiceCharge',
                      form.customServiceCharge !== undefined
                        ? form.customServiceCharge
                        : calc.serviceCharge
                    )}
                    onChange={handleLocalChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    style={{
                      backgroundColor: form.customServiceCharge !== undefined ? '#fffacd' : 'white'
                    }}
                    title="Total service charge - editable"
                  />
                </div>
                {}
              </div>
            </div>
          )}

          {}
          {form.pricingMethod === "bySqFt" && (
            <div className="svc-row">
              <div className="svc-label" />
              <div className="svc-field">
                <label>
                  <input
                    type="checkbox"
                    name="useExactCalculation"
                    checked={form.useExactCalculation}
                    onChange={onChange}
                  />{" "}
                  Exact square feet calculation
                </label>
                <div className="svc-note" style={{ marginTop: '4px', fontSize: '0.85em', color: '#666' }}>
                  {form.useExactCalculation
                    ? "Calculating for exact square feet entered"
                    : `Using minimum tier pricing (any amount ≤ ${activeConfig.standardSprayPricing.sqFtUnit} sq ft → ${activeConfig.standardSprayPricing.sqFtUnit} sq ft minimum, ${activeConfig.standardSprayPricing.sqFtUnit + 1} sq ft → ${activeConfig.standardSprayPricing.sqFtUnit * 2} sq ft tier, etc.)`
                  }
                </div>
              </div>
            </div>
          )}
        </div>


        {}
        {}


        {}
        {}

        {}
        <div className="svc-summary">
          {}

          {}
          {}

          {}
          <div className="svc-row">
            <div className="svc-label">
              <span>Minimum Per Visit</span>
            </div>
            <div className="svc-field">
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
            <div className="svc-label">
              <span>Per Visit Total</span>
            </div>
            <div className="svc-field svc-dollar">
              <span>$</span>
              <input
                readOnly
                type="number"
                min="0"
                step="0.01"
                name="customPerVisitPrice"
                className="svc-in sm"
                value={getDisplayValue(
                  'customPerVisitPrice',
                  form.customPerVisitPrice !== undefined
                    ? form.customPerVisitPrice
                    : calc.perVisit
                )}
                onChange={handleLocalChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={{
                  backgroundColor: form.customPerVisitPrice !== undefined ? '#fffacd' : 'white'
                }}
                title="Per visit total (service + trip) - editable"
              />
            </div>
          </div>

          {}
          {(form.roomCount > 0 || form.squareFeet > 0) && (
            <div className="svc-row" style={{ marginTop: '-10px', paddingTop: '5px' }}>
              <div className="svc-label"></div>
              <div className="svc-field">
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
          {!isVisitBasedFrequency && (
            <div className="svc-row">
              <div className="svc-label">
                <span>Monthly Recurring</span>
              </div>
              <div className="svc-field svc-dollar">
                <span>$</span>
                <input
                  readOnly
                  type="number"
                  min="0"
                  step="0.01"
                  name="customMonthlyRecurring"
                  className="svc-in sm"
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
                    backgroundColor: form.customMonthlyRecurring !== undefined ? '#fffacd' : 'white'
                  }}
                  title="Monthly recurring charge - editable"
                />
              </div>
            </div>
          )}

          {}
          {isVisitBasedFrequency && form.frequency !== "oneTime" && (
            <div className="svc-row">
              <div className="svc-label">
                <span>Recurring Visit Total</span>
              </div>
              <div className="svc-field svc-dollar">
                <span>$</span>
                <input
                  readOnly
                  type="number"
                  min="0"
                  step="0.01"
                  name="customFirstMonthTotal"
                  className="svc-in sm"
                  value={getDisplayValue(
                    'customFirstMonthTotal',
                    form.customFirstMonthTotal !== undefined
                      ? form.customFirstMonthTotal
                      : calc.contractTotal
                  )}
                  onChange={handleLocalChange}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  style={{
                    backgroundColor: form.customFirstMonthTotal !== undefined ? '#fffacd' : 'white'
                  }}
                  title="Recurring visit total - editable"
                />
              </div>
            </div>
          )}

          {}
          {form.frequency === "oneTime" && (
            <div className="svc-row">
              <div className="svc-label">
                <span>Total Price</span>
              </div>
              <div className="svc-field svc-dollar">
                <span>$</span>
                <input
                  readOnly
                  type="number"
                  min="0"
                  step="0.01"
                  name="customFirstMonthTotal"
                  className="svc-in sm"
                  value={getDisplayValue(
                    'customFirstMonthTotal',
                    form.customFirstMonthTotal !== undefined
                      ? form.customFirstMonthTotal
                      : calc.contractTotal
                  )}
                  onChange={handleLocalChange}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  style={{
                    backgroundColor: form.customFirstMonthTotal !== undefined ? '#fffacd' : 'white'
                  }}
                  title="Total price for one-time service - editable"
                />
              </div>
            </div>
          )}

          {}
          {form.frequency !== "oneTime" && (
            <div className="svc-row">
              <div className="svc-label">
                <span>Contract Total</span>
              </div>
              <div className="svc-field" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <select
                  name="contractMonths"
                  className="svc-in"
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
                  readOnly
                  type="number"
                  min="0"
                  step="0.01"
                  name="customContractTotal"
                  className="svc-in sm"
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

          {}
          <div className="svc-row">
            <div className="svc-label">
              <span>Notes</span>
            </div>
            <div className="svc-field">
              <textarea
                name="notes"
                className="svc-in"
                rows={3}
                value={form.notes}
                onChange={onChange as any}
                placeholder="Additional notes..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
