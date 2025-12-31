// src/components/services/electrostaticSpray/ElectrostaticSprayForm.tsx

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
  // location: 2,
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

// Helper function to format numbers without unnecessary decimals
const formatNumber = (num: number): string => {
  return num % 1 === 0 ? num.toString() : num.toFixed(2);
};

export const ElectrostaticSprayForm: React.FC<ServiceInitialData<ElectrostaticSprayFormState>> = ({
  initialData,
  onRemove,
}) => {
  // Custom fields state - initialize with initialData if available
  const [customFields, setCustomFields] = useState<CustomField[]>(
    initialData?.customFields || []
  );

  // ✅ UPDATED: Pass customFields to calculation hook
  const { form, setForm, onChange, calc, isLoadingConfig, refreshConfig, activeConfig } = useElectrostaticSprayCalc(initialData, customFields);
  const servicesContext = useServicesContextOptional();

  const [showAddDropdown, setShowAddDropdown] = useState(false);

  // ✅ LOCAL STATE: Store raw string values during editing to allow free decimal editing
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  // ✅ NEW: Track original values when focusing to detect actual changes
  const [originalValues, setOriginalValues] = useState<Record<string, string>>({});

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
    // Store current value in editing state AND original value for comparison
    setEditingValues(prev => ({ ...prev, [name]: value }));
    setOriginalValues(prev => ({ ...prev, [name]: value }));
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

    // Get the original value when we started editing
    const originalValue = originalValues[name];

    // Clear editing state for this field
    setEditingValues(prev => {
      const newState = { ...prev };
      delete newState[name];
      return newState;
    });

    // Clear original value
    setOriginalValues(prev => {
      const newState = { ...prev };
      delete newState[name];
      return newState;
    });

    // Parse the value
    const numValue = parseFloat(value);

    // ✅ FIXED: Only update if value actually changed
    if (originalValue !== value) {
      // If empty or invalid, clear the override
      if (value === '' || isNaN(numValue)) {
        onChange({ target: { name, value: '' } } as any);
        return;
      }

      // ✅ Update form state with parsed numeric value ONLY if changed
      onChange({ target: { name, value: String(numValue) } } as any);
    }
  };

  // Check if SaniClean All-Inclusive is active
  const isSanicleanAllInclusive =
    servicesContext?.isSanicleanAllInclusive ?? false;

  // Save form data to context for form submission
  const prevDataRef = useRef<string>("");

  // Calculate effective rate for payload
  const serviceRate = form.pricingMethod === "byRoom"
    ? form.ratePerRoom
    : form.ratePerThousandSqFt;

  // Frequency-specific UI helpers
  const { isVisitBasedFrequency, monthsPerVisit } = calc;

  // Generate frequency-specific contract month options
  const generateContractMonths = () => {
    const months = [];

    if (form.frequency === "oneTime") {
      // For oneTime: no contract (handled separately in UI)
      return [];
    } else if (form.frequency === "bimonthly") {
      // For bi-monthly: show only even numbers (2, 4, 6, 8, ...)
      for (let i = 2; i <= cfg.maxContractMonths; i += 2) {
        months.push(i);
      }
    } else if (form.frequency === "quarterly") {
      // For quarterly: show only multiples of 3 (3, 6, 9, 12, ...)
      for (let i = 3; i <= cfg.maxContractMonths; i += 3) {
        months.push(i);
      }
    } else if (form.frequency === "biannual") {
      // For biannual: show only multiples of 6 (6, 12, 18, 24, 30, 36)
      for (let i = 6; i <= cfg.maxContractMonths; i += 6) {
        months.push(i);
      }
    } else if (form.frequency === "annual") {
      // For annual: show only multiples of 12 (12, 24, 36)
      for (let i = 12; i <= cfg.maxContractMonths; i += 12) {
        months.push(i);
      }
    } else {
      // For weekly, bi-weekly, twicePerMonth, monthly: show all months
      for (let i = cfg.minContractMonths; i <= cfg.maxContractMonths; i++) {
        months.push(i);
      }
    }

    return months;
  };

  const contractMonthOptions = generateContractMonths();

  useEffect(() => {
    if (servicesContext) {
      const isActive = (form.roomCount > 0 || form.squareFeet > 0);

      const frequencyLabel = typeof form.frequency === 'string'
        ? form.frequency.charAt(0).toUpperCase() + form.frequency.slice(1)
        : String(form.frequency || 'Weekly');
      const visitBasedFrequency = ["oneTime", "quarterly", "biannual", "annual", "bimonthly"].includes(form.frequency);
      const totalPriceValue =
        form.customFirstMonthTotal !== undefined ? form.customFirstMonthTotal : calc.perVisit;

      const data = isActive ? {
        serviceId: "electrostaticSpray",
        displayName: "Electrostatic Spray",
        isActive: true,

        // ✅ FIXED: Save EFFECTIVE pricing fields (custom override if set, otherwise base value)
        // This ensures edited values are saved to backend and used in PDF generation
        ratePerRoom: form.customRatePerRoom ?? form.ratePerRoom,
        ratePerThousandSqFt: form.customRatePerThousandSqFt ?? form.ratePerThousandSqFt,
        tripChargePerVisit: form.customTripChargePerVisit ?? form.tripChargePerVisit,

        // ✅ NEW: Save quantity inputs for proper loading in edit mode
        pricingMethod: form.pricingMethod,
        roomCount: form.roomCount,
        squareFeet: form.squareFeet,
        useExactCalculation: form.useExactCalculation,
        frequency: form.frequency,
        contractMonths: form.contractMonths,
        isCombinedWithSaniClean: form.isCombinedWithSaniClean,
        // location: form.location,

        // Red/Green Line pricing data
        perVisitBase: calc.serviceCharge,  // Raw service charge before trip/minimum
        perVisit: calc.perVisit,  // Final price after minimum
        minimumChargePerVisit: calc.minimumChargePerVisit,  // Minimum threshold

        // ✅ FIXED: Display fields with different names to avoid overwriting saved values
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

        // locationDisplay: {
        //   isDisplay: true,
        //   orderNo: FIELD_ORDER.location,
        //   label: "Location",
        //   type: "text" as const,
        //   value: form.location === "insideBeltway" ? "Inside Beltway" :
        //          form.location === "outsideBeltway" ? "Outside Beltway" : "Standard",
        // },

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
            // totals.firstVisit = {
            //   isDisplay: true,
            //   orderNo: FIELD_ORDER.totals.firstVisit,
            //   label: form.frequency === "oneTime" ? "Total Price" : "First Visit Total",
            //   type: "dollar" as const,
            //   amount: calc.perVisit,
            // };
            totals.recurringVisit = {
              isDisplay: true,
              orderNo: FIELD_ORDER.totals.recurringVisit,
              label: "Recurring Visit Total",
              type: "dollar" as const,
              amount: calc.perVisit,
              gap: "normal",
            };
          } else {
            // totals.firstMonth = {
            //   isDisplay: true,
            //   orderNo: FIELD_ORDER.totals.firstMonth,
            //   label: "First Month Total",
            //   type: "dollar" as const,
            //   amount: calc.monthlyRecurring,
            // };
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
  }, [form, calc, customFields]); // form already includes useExactCalculation

  // Ensure valid contract months when frequency changes
  useEffect(() => {
    const validMonths = generateContractMonths();

    if (!validMonths.includes(form.contractMonths)) {
      // Find the closest valid month
      const closestMonth = validMonths.find(month => month >= form.contractMonths) || validMonths[0];

      setForm(prev => ({
        ...prev,
        contractMonths: closestMonth
      }));
    }
  }, [form.frequency]); // Only run when frequency changes

  // Clear custom overrides when base inputs change
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
    // form.location,
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

        {/* Loading indicator */}
        {isLoadingConfig && (
          <div className="svc-row">
            <div className="svc-field" style={{ textAlign: 'center', padding: '10px', color: '#666' }}>
              Loading pricing configuration...
            </div>
          </div>
        )}

        {/* Custom fields manager */}
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
              Electrostatic Spray is already included at no additional charge. This
              form is for reference only.
            </div>
          </div>
        )}

        {/* Combined with Sani-Clean */}
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

        {/* Frequency */}
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

        {/* Pricing Method */}
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


        {/* Calculation Breakdown */}
        <div className="svc-summary">
          <div className="svc-row" style={{ marginBottom: '5px' }}>
            {/* <div className="svc-label">
              <span style={{ color: '#28a745', fontSize: '0.85em' }}>💡 Tip: Rate fields below are editable</span>
            </div> */}
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
                {/* <div className="svc-note" style={{ marginTop: '4px', fontSize: '0.85em' }}>
                  Rate applies per 1000 sq ft ({(form.squareFeet / 1000).toFixed(2)} units)
                </div> */}
              </div>
            </div>
          )}

          {/* Exact Calculation Checkbox - only show when using square feet pricing */}
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



        {/* Location */}
        {/* <div className="svc-row">
          <div className="svc-label">
            <span>Location</span>
          </div>
          <div className="svc-field">
            <select
              name="location"
              className="svc-in"
              value={form.location}
              onChange={onChange}
            >
              <option value="standard">Standard</option>
              <option value="insideBeltway">Inside Beltway</option>
              <option value="outsideBeltway">Outside Beltway</option>
            </select>
          </div>
        </div> */}





        {/* Value Proposition Info */}
        {/* <div className="svc-row">
          <div className="svc-label">
            <span className="svc-note">Value:</span>
          </div>
          <div className="svc-field">
            <span className="svc-note">
              {cfg.valueProposition.bacteriaReduction} reduction in bacteria in air and walls.
              Bathroom goes from clean to {cfg.valueProposition.cleanlinessLevel.toLowerCase()}.
            </span>
          </div>
        </div> */}

        {/* SUMMARY / RESULTS */}
        <div className="svc-summary">
          {/* <div className="svc-row">
            <div className="svc-label">
              <span>Service Charge</span>
            </div>
            <div className="svc-field svc-dollar">
              <span>$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                name="customServiceCharge"
                className="svc-in sm"
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
                title="Calculated service charge (based on quantity × rate) - editable"
              />
            </div>
          </div> */}

          {/* Trip Charge */}
          {/* {!form.isCombinedWithSaniClean && (
            <div className="svc-row">
              <div className="svc-label">
                <span>Trip Charge</span>
              </div>
              <div className="svc-field svc-dollar">
                <span>$</span>
                <input
                  readOnly
                  className="svc-in sm"
                  value={formatNumber(calc.tripCharge)}
                />
              </div>
            </div>
          )} */}

          {/* Per Visit Total */}
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

          {/* Redline/Greenline Pricing Indicator */}
          {(form.roomCount > 0 || form.squareFeet > 0) && (
            <div className="svc-row" style={{ marginTop: '-10px', paddingTop: '5px' }}>
              <div className="svc-label"></div>
              <div className="svc-field">
                {calc.perVisit <= calc.minimumChargePerVisit ? (
                  <span style={{
                    color: '#d32f2f',
                    fontSize: '13px',
                    fontWeight: '600',
                    padding: '4px 8px',
                    backgroundColor: '#ffebee',
                    borderRadius: '4px',
                    display: 'inline-block'
                  }}>
                    🔴 Redline Pricing (At or Below Minimum)
                  </span>
                ) : (
                  <span style={{
                    color: '#388e3c',
                    fontSize: '13px',
                    fontWeight: '600',
                    padding: '4px 8px',
                    backgroundColor: '#e8f5e9',
                    borderRadius: '4px',
                    display: 'inline-block'
                  }}>
                    🟢 Greenline Pricing (Above Minimum)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Monthly Recurring / Per Visit - Hide for oneTime, quarterly, biannual, annual, bimonthly */}
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

          {/* Recurring Visit Total - Show ONLY for visit-based frequencies (not oneTime) */}
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
                      : calc.perVisit
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

          {/* Total Price - Show ONLY for oneTime */}
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
                      : calc.perVisit
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

          {/* Contract Total with inline dropdown - Hide for oneTime */}
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
                  style={{
                    borderBottom: '2px solid #000',
                    borderTop: 'none',
                    borderLeft: 'none',
                    borderRight: 'none',
                    backgroundColor: 'transparent',
                    padding: '4px 20px 4px 4px'
                  }}
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
                    width: '100px'
                  }}
                  title="Contract total - editable"
                />
              </div>
            </div>
          )}

          {/* Notes */}
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
