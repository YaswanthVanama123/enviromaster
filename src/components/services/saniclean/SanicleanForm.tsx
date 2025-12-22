import React, { useEffect, useState, useRef, type ChangeEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSync, faSpinner } from "@fortawesome/free-solid-svg-icons";
import "../ServicesSection.css";
import { useSanicleanCalc } from "./useSanicleanCalc";
import type { SanicleanFormState, SanicleanFrequency } from "./sanicleanTypes";
import type { ServiceInitialData } from "../common/serviceTypes";
import { useServicesContextOptional } from "../ServicesContext";
import { CustomFieldManager, type CustomField } from "../CustomFieldManager";

const formatMoney = (n: number): string => `$${(isNaN(n) ? 0 : n).toFixed(2)}`;
const safeNumber = (n: any): number => (typeof n === "number" && !isNaN(n)) ? n : 0;

// Frequency options for SaniClean (matching backend frequencyMetadata keys)
const sanicleanFrequencyLabels: Record<string, string> = {
  oneTime: "One Time",
  weekly: "Weekly",
  biweekly: "Bi-Weekly",
  twicePerMonth: "2× / Month (with SaniClean)",
  monthly: "Monthly",
  bimonthly: "Bi-Monthly (Every 2 Months)",
  quarterly: "Quarterly",
  biannual: "Bi-Annual",
  annual: "Annual",
};

export const SanicleanForm: React.FC<
  ServiceInitialData<SanicleanFormState>
> = ({ initialData, onRemove }) => {
  const {
    form,
    quote,
    fetchPricing,
    isLoadingConfig,
    updateForm,
    setPricingMode,
    setLocation,
    setSoapType,
    setRateTier,
    setNotes,
    backendConfig,
    // ✅ NEW: Dual frequency setters
    setMainServiceFrequency,
    setFacilityComponentsFrequency,
  } = useSanicleanCalc(initialData);

  const servicesContext = useServicesContextOptional();

  // Custom fields state
  const [customFields, setCustomFields] = useState<CustomField[]>(
    initialData?.customFields || []
  );
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  // ✅ LOCAL STATE: Store raw string values during editing to allow free decimal editing
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  // ✅ NEW: Track original values when focusing to detect actual changes
  const [originalValues, setOriginalValues] = useState<Record<string, string>>({});

  const prevDataRef = useRef<string>("");

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
      updateForm({ [name]: numValue });
    } else if (value === '') {
      // If field is cleared, update form to clear the override
      updateForm({ [name]: undefined });
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
        updateForm({ [name]: undefined });
        return;
      }

      // ✅ Update form state with parsed numeric value ONLY if changed
      updateForm({ [name]: numValue });
    }
  };

  // Calculate derived values
  const fixtures = form.sinks + form.urinals + form.maleToilets + form.femaleToilets;
  const soapDispensers = form.sinks; // 1 soap dispenser per sink

  const isAllInclusive = form.pricingMode === "all_inclusive";

  // Debug logging
  console.log('🔍 [SaniClean Debug]', {
    pricingMode: form.pricingMode,
    isAllInclusive,
    allInclusiveRate: form.allInclusiveWeeklyRatePerFixture,
    insideBeltwayRate: form.insideBeltwayRatePerFixture
  });

  const luxuryUpgradeWeekly = form.soapType === "luxury" && soapDispensers > 0
    ? soapDispensers * form.luxuryUpgradePerDispenser
    : 0;

  const extraSoapRatePerGallon = form.soapType === "luxury"
    ? form.excessLuxurySoapRate
    : form.excessStandardSoapRate;

  const extraSoapWeekly = Math.max(0, form.excessSoapGallonsPerWeek) * extraSoapRatePerGallon;

  // Form change handlers
  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    let processedValue: any = value;

    // ✅ Handle custom override fields for individual components and totals
    if (
      name === "customBaseService" ||
      name === "customTripCharge" ||
      name === "customFacilityComponents" ||
      name === "customSoapUpgrade" ||
      name === "customExcessSoap" ||
      name === "customMicrofiberMopping" ||
      name === "customWarrantyFees" ||
      name === "customPaperOverage" ||
      name === "customWeeklyTotal" ||
      name === "customMonthlyTotal" ||
      name === "customContractTotal"
    ) {
      const numVal = value === '' ? undefined : parseFloat(value);
      if (numVal === undefined || !isNaN(numVal)) {
        updateForm({ [name]: numVal });
      }
      return;
    }

    if (type === "checkbox") {
      processedValue = checked;
    } else if (type === "number") {
      processedValue = parseFloat(value) || 0;
    }

    updateForm({ [name]: processedValue });
  };

  // Save form data to context for form submission
  useEffect(() => {
    if (servicesContext) {
      const isActive = fixtures > 0;

      const data = isActive ? {
        serviceId: "saniclean",
        displayName: "SaniClean",
        isActive: true,

        // Red/Green Line pricing data (weekly pricing)
        perVisitBase: quote.breakdown.baseService,  // Raw base service weekly
        perVisit: quote.weeklyTotal,  // Final weekly total

        pricingMode: {
          isDisplay: true,
          label: "Pricing Mode",
          type: "text" as const,
          value: form.pricingMode === "all_inclusive" ? "All Inclusive" : "Per Item Charge",
        },

        location: {
          isDisplay: true,
          label: "Location",
          type: "text" as const,
          value: form.location === "insideBeltway" ? "Inside Beltway" : "Outside Beltway",
        },

        fixtureBreakdown: [
          ...(form.sinks > 0 ? [{
            isDisplay: true,
            label: "Sinks",
            type: "calc" as const,
            qty: form.sinks,
            rate: form.insideBeltwayRatePerFixture,
            total: form.sinks * form.insideBeltwayRatePerFixture,
          }] : []),
          ...(form.urinals > 0 ? [{
            isDisplay: true,
            label: "Urinals",
            type: "calc" as const,
            qty: form.urinals,
            rate: form.insideBeltwayRatePerFixture,
            total: form.urinals * form.insideBeltwayRatePerFixture,
          }] : []),
          ...(form.maleToilets > 0 ? [{
            isDisplay: true,
            label: "Male Toilets",
            type: "calc" as const,
            qty: form.maleToilets,
            rate: form.insideBeltwayRatePerFixture,
            total: form.maleToilets * form.insideBeltwayRatePerFixture,
          }] : []),
          ...(form.femaleToilets > 0 ? [{
            isDisplay: true,
            label: "Female Toilets",
            type: "calc" as const,
            qty: form.femaleToilets,
            rate: form.insideBeltwayRatePerFixture,
            total: form.femaleToilets * form.insideBeltwayRatePerFixture,
          }] : []),
        ],

        soapType: {
          isDisplay: true,
          label: "Soap Type",
          type: "text" as const,
          value: form.soapType === "luxury" ? "Luxury" : "Standard",
        },

        totals: {
          weekly: {
            isDisplay: true,
            label: "Weekly Total",
            type: "dollar" as const,
            amount: quote.weeklyTotal,
          },
          monthly: {
            isDisplay: true,
            label: "Monthly Recurring",
            type: "dollar" as const,
            amount: quote.monthlyTotal,
          },
          contract: {
            isDisplay: true,
            label: "Contract Total",
            type: "dollar" as const,
            months: form.contractMonths,
            amount: quote.contractTotal,
          },
        },

        notes: form.notes || "",
        customFields: customFields,
      } : null;

      const dataStr = JSON.stringify(data);

      if (dataStr !== prevDataRef.current) {
        prevDataRef.current = dataStr;
        servicesContext.updateService("saniclean", data);
      }
    }
  }, [form, quote, fixtures, customFields, soapDispensers, isAllInclusive]);

  const paperCreditPerWeek = form.fixtureCount * form.paperCreditPerFixture;
  const paperOveragePerWeek = Math.max(0, form.estimatedPaperSpendPerWeek - paperCreditPerWeek);

  const contractMonths =
    form.contractMonths && form.contractMonths >= 2 && form.contractMonths <= 36
      ? form.contractMonths
      : 12;
  const contractTotal = quote.monthlyTotal * contractMonths;

  return (
    <div className="svc-card">
      {/* HEADER */}
      <div className="svc-h-row">
        <div className="svc-h">SANI CLEAN</div>
        <div className="svc-h-actions">
          <button
            type="button"
            className="svc-mini"
            onClick={fetchPricing}
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

      {/* Custom fields manager */}
      <CustomFieldManager
        fields={customFields}
        onFieldsChange={setCustomFields}
        showAddDropdown={showAddDropdown}
        onToggleAddDropdown={setShowAddDropdown}
      />

      {/* Pricing Mode */}
      <div className="svc-row">
        <label>Pricing Mode</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="pricingMode"
            value={form.pricingMode}
            onChange={onChange}
          >
            <option value="all_inclusive">All Inclusive</option>
            <option value="per_item_charge">Per Item Charge</option>
          </select>
        </div>
      </div>

      {/* ✅ NEW: Dual Frequency Selection */}
      <div className="svc-row">
        <label>Main Service Frequency</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="mainServiceFrequency"
            value={form.mainServiceFrequency}
            onChange={(e) => setMainServiceFrequency(e.target.value as SanicleanFrequency)}
          >
            {Object.entries(sanicleanFrequencyLabels).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              )
            )}
          </select>
        </div>
      </div>

      {/* ✅ NEW: Facility Components Frequency (only show for per-item-charge) */}
      {form.pricingMode === "per_item_charge" && (
        <div className="svc-row">
          <label>
            Facility Components Frequency
            <small style={{ display: 'block', fontSize: '11px', color: '#666', fontWeight: 'normal' }}>
              Independent of main service frequency
            </small>
          </label>
          <div className="svc-row-right">
            <select
              className="svc-in"
              name="facilityComponentsFrequency"
              value={form.facilityComponentsFrequency}
              onChange={(e) => setFacilityComponentsFrequency(e.target.value as SanicleanFrequency)}
            >
              {Object.entries(sanicleanFrequencyLabels).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                )
              )}
            </select>
          </div>
        </div>
      )}

      {/* Total Restroom Fixtures */}
      <div className="svc-row">
        <label>Restroom Fixtures</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
          min="0"
            min="0"
            name="fixtureCount"
            value={form.fixtureCount || ""}
            readOnly
          />
        </div>
      </div>

      {/* Location - Only show for Per Item Charge */}
      {form.pricingMode === "per_item_charge" && (
        <div className="svc-row">
          <label>Location</label>
          <div className="svc-row-right">
            <select
              className="svc-in"
              name="location"
              value={form.location}
              onChange={onChange}
            >
              <option value="insideBeltway">Inside Beltway</option>
              <option value="outsideBeltway">Outside Beltway</option>
            </select>
          </div>
        </div>
      )}

      {/* Parking - Only for inside beltway in per item mode */}
      {form.pricingMode === "per_item_charge" && form.location === "insideBeltway" && (
        <div className="svc-row">
          <label>Parking</label>
          <div className="svc-row-right">
            <label className="svc-inline">
              <input
                type="checkbox"
                name="needsParking"
                checked={form.needsParking}
                onChange={onChange}
              />
              <span>Parking needed (+fee)</span>
            </label>
          </div>
        </div>
      )}

      {/* FIXTURE BREAKDOWN */}
      <div className="svc-h-sub" style={{ marginTop: 10 }}>
        FIXTURE BREAKDOWN
      </div>

      {/* Sinks */}
      <div className="svc-row">
        <label>Sinks</label>
        <div className="svc-row-right">
          <input
            className="svc-in field-qty"
            type="number"
            min="0"
            name="sinks"
            value={form.sinks || ""}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in field-qty"
            type="number"
          min="0"
            min="0"
            step="0.01"
            name={isAllInclusive ? "allInclusiveWeeklyRatePerFixture" :
                  (form.location === "insideBeltway" ? "insideBeltwayRatePerFixture" : "outsideBeltwayRatePerFixture")}
            value={isAllInclusive ? form.allInclusiveWeeklyRatePerFixture :
                  (form.location === "insideBeltway" ? form.insideBeltwayRatePerFixture : form.outsideBeltwayRatePerFixture)}
            onChange={onChange}
            title="Rate per sink - editable"
          />
          <span>=</span>
          <input
            className="svc-in field-qty"
            type="text"
            readOnly
            value={formatMoney(form.sinks *
              (isAllInclusive ? form.allInclusiveWeeklyRatePerFixture :
               (form.location === "insideBeltway" ? form.insideBeltwayRatePerFixture : form.outsideBeltwayRatePerFixture)))}
          />
        </div>
      </div>

      {/* Urinals */}
      <div className="svc-row">
        <label>Urinals</label>
        <div className="svc-row-right">
          <input
            className="svc-in field-qty"
            type="number"
            min="0"
            name="urinals"
            value={form.urinals || ""}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in field-qty"
            type="number"
          min="0"
            min="0"
            step="0.01"
            name={isAllInclusive ? "allInclusiveWeeklyRatePerFixture" :
                  (form.location === "insideBeltway" ? "insideBeltwayRatePerFixture" : "outsideBeltwayRatePerFixture")}
            value={isAllInclusive ? form.allInclusiveWeeklyRatePerFixture :
                  (form.location === "insideBeltway" ? form.insideBeltwayRatePerFixture : form.outsideBeltwayRatePerFixture)}
            onChange={onChange}
            title="Rate per urinal - editable"
          />
          <span>=</span>
          <input
            className="svc-in field-qty"
            type="text"
            readOnly
            value={formatMoney(form.urinals *
              (isAllInclusive ? form.allInclusiveWeeklyRatePerFixture :
               (form.location === "insideBeltway" ? form.insideBeltwayRatePerFixture : form.outsideBeltwayRatePerFixture)))}
          />
        </div>
      </div>

      {/* Male Toilets */}
      <div className="svc-row">
        <label>Male Toilets</label>
        <div className="svc-row-right">
          <input
            className="svc-in field-qty"
            type="number"
            min="0"
            name="maleToilets"
            value={form.maleToilets || ""}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in field-qty"
            type="number"
          min="0"
            min="0"
            step="0.01"
            name={isAllInclusive ? "allInclusiveWeeklyRatePerFixture" :
                  (form.location === "insideBeltway" ? "insideBeltwayRatePerFixture" : "outsideBeltwayRatePerFixture")}
            value={isAllInclusive ? form.allInclusiveWeeklyRatePerFixture :
                  (form.location === "insideBeltway" ? form.insideBeltwayRatePerFixture : form.outsideBeltwayRatePerFixture)}
            onChange={onChange}
            title="Rate per male toilet - editable"
          />
          <span>=</span>
          <input
            className="svc-in field-qty"
            type="text"
            readOnly
            value={formatMoney(form.maleToilets *
              (isAllInclusive ? form.allInclusiveWeeklyRatePerFixture :
               (form.location === "insideBeltway" ? form.insideBeltwayRatePerFixture : form.outsideBeltwayRatePerFixture)))}
          />
        </div>
      </div>

      {/* Female Toilets */}
      <div className="svc-row">
        <label>Female Toilets</label>
        <div className="svc-row-right">
          <input
            className="svc-in field-qty"
            type="number"
            min="0"
            name="femaleToilets"
            value={form.femaleToilets || ""}
            onChange={onChange}
          />
          <span>=</span>
          <input
            className="svc-in field-qty"
            type="number"
          min="0"
            min="0"
            step="0.01"
            name={isAllInclusive ? "allInclusiveWeeklyRatePerFixture" :
                  (form.location === "insideBeltway" ? "insideBeltwayRatePerFixture" : "outsideBeltwayRatePerFixture")}
            value={isAllInclusive ? form.allInclusiveWeeklyRatePerFixture :
                  (form.location === "insideBeltway" ? form.insideBeltwayRatePerFixture : form.outsideBeltwayRatePerFixture)}
            onChange={onChange}
            title="Rate per female toilet - editable"
          />
          <span>=</span>
          <input
            className="svc-in field-qty"
            type="text"
            readOnly
            value={formatMoney(form.femaleToilets *
              (isAllInclusive ? form.allInclusiveWeeklyRatePerFixture :
               (form.location === "insideBeltway" ? form.insideBeltwayRatePerFixture : form.outsideBeltwayRatePerFixture)))}
          />
        </div>
      </div>

      {/* SOAP & UPGRADES */}
      <div className="svc-h-sub" style={{ marginTop: 10 }}>
        SOAP &amp; UPGRADES
      </div>

      {/* Soap type selector */}
      <div className="svc-row">
        <label>Soap Type</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="soapType"
            value={form.soapType}
            onChange={onChange}
          >
            <option value="standard">Standard (included)</option>
            <option value="luxury">Luxury (+${form.luxuryUpgradePerDispenser}/disp/wk)</option>
          </select>
        </div>
      </div>

      {/* Luxury upgrade calc */}
      <div className="svc-row">
        <label>Luxury Upgrade</label>
        <div className="svc-row-right">
          <input className="svc-in field-qty" type="text" readOnly value={soapDispensers} />
          <span>@</span>
          <input
            className="svc-in field-qty"
            type="number"
            min="0"
            step="0.01"
            name="luxuryUpgradePerDispenser"
            value={form.luxuryUpgradePerDispenser || ""}
            onChange={onChange}
            disabled={form.soapType !== "luxury"}
            style={{
              backgroundColor: form.soapType !== "luxury" ? '#f5f5f5' : 'white',
              color: form.soapType !== "luxury" ? '#999' : 'black'
            }}
            title={form.soapType === "luxury"
              ? "Luxury soap upgrade rate per dispenser per week - editable"
              : "Luxury soap upgrade (disabled - select luxury soap type to edit)"}
          />
          <span>=</span>
          <input
            className="svc-in field-qty"
            type="text"
            readOnly
            value={formatMoney(luxuryUpgradeWeekly)}
          />
        </div>
      </div>

      {/* Extra soap usage - Only for All Inclusive */}
      {isAllInclusive && (
        <div className="svc-row">
          <label>Extra Soap</label>
          <div className="svc-row-right">
            <input
              className="svc-in field-qty"
              type="number"
              min="0"
              name="excessSoapGallonsPerWeek"
              value={form.excessSoapGallonsPerWeek || ""}
              onChange={onChange}
            />
            <span>@</span>
            <input
              className="svc-in field-qty"
              type="number"
          min="0"
            min="0"
              step="0.01"
              name={form.soapType === "luxury" ? "excessLuxurySoapRate" : "excessStandardSoapRate"}
              value={extraSoapRatePerGallon}
              onChange={onChange}
              title={`Excess ${form.soapType} soap rate per gallon - editable`}
            />
            <span>=</span>
            <input
              className="svc-in field-qty"
              type="text"
              readOnly
              value={formatMoney(extraSoapWeekly)}
            />
          </div>
        </div>
      )}

      {/* FACILITY COMPONENTS BREAKDOWN - Only for Per Item Charge */}
      {!isAllInclusive && (
        <>
          <div className="svc-h-sub" style={{ marginTop: 10 }}>
            FACILITY COMPONENTS (Monthly Charges)
          </div>

          {/* Urinal Components - Only show checkbox if urinals > 0 */}
          {form.urinals > 0 && (
            <>
              <div className="svc-row">
                <label>Urinal Components</label>
                <div className="svc-row-right">
                  <label className="svc-inline">
                    <input
                      type="checkbox"
                      name="addUrinalComponents"
                      checked={form.addUrinalComponents}
                      onChange={onChange}
                    />
                    <span>Include screens & mats</span>
                  </label>
                </div>
              </div>

              {/* Show urinal component calculations only when enabled */}
              {form.addUrinalComponents && (
                <>
                  <div className="svc-row" style={{ paddingLeft: '20px' }}>
                    <label>Urinal Screens</label>
                    <div className="svc-row-right">
                      <input
                        className="svc-in field-qty"
                        type="number"
          min="0"
            min="0"
                        name="urinalScreensQty"
                        value={form.urinalScreensQty || ""}
                        onChange={onChange}
                        min="0"
                        placeholder="0"
                        title="Number of urinal screens (manually entered by salesman)"
                      />
                      <span>@</span>
                      <input
                        className="svc-in field-qty"
                        type="number"
          min="0"
            min="0"
                        step="0.01"
                        name="urinalScreenMonthly"
                        value={form.urinalScreenMonthly}
                        onChange={onChange}
                        title="Urinal screen rate per month - editable"
                      />
                      <span>=</span>
                      <input
                        className="svc-in field-qty"
                        type="text"
                        readOnly
                        value={formatMoney(form.urinalScreensQty * form.urinalScreenMonthly)}
                      />
                    </div>
                  </div>

                  <div className="svc-row" style={{ paddingLeft: '20px' }}>
                    <label>Urinal Mats</label>
                    <div className="svc-row-right">
                      <input
                        className="svc-in field-qty"
                        type="number"
          min="0"
            min="0"
                        name="urinalMatsQty"
                        value={form.urinalMatsQty || ""}
                        onChange={onChange}
                        min="0"
                        placeholder="0"
                        title="Number of urinal mats (manually entered by salesman)"
                      />
                      <span>@</span>
                      <input
                        className="svc-in field-qty"
                        type="number"
          min="0"
            min="0"
                        step="0.01"
                        name="urinalMatMonthly"
                        value={form.urinalMatMonthly}
                        onChange={onChange}
                        title="Urinal mat rate per month - editable"
                      />
                      <span>=</span>
                      <input
                        className="svc-in field-qty"
                        type="text"
                        readOnly
                        value={formatMoney(form.urinalMatsQty * form.urinalMatMonthly)}
                      />
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* Male Toilet Components - Only show checkbox if maleToilets > 0 */}
          {form.maleToilets > 0 && (
            <>
              <div className="svc-row">
                <label>Male Toilet Components</label>
                <div className="svc-row-right">
                  <label className="svc-inline">
                    <input
                      type="checkbox"
                      name="addMaleToiletComponents"
                      checked={form.addMaleToiletComponents}
                      onChange={onChange}
                    />
                    <span>Include clips & seat covers</span>
                  </label>
                </div>
              </div>

              {/* Show male toilet component calculations only when enabled */}
              {form.addMaleToiletComponents && (
                <>
                  <div className="svc-row" style={{ paddingLeft: '20px' }}>
                    <label>Toilet Clips</label>
                    <div className="svc-row-right">
                      <input
                        className="svc-in field-qty"
                        type="number"
          min="0"
            min="0"
                        name="toiletClipsQty"
                        value={form.toiletClipsQty || ""}
                        onChange={onChange}
                        min="0"
                        placeholder="0"
                        title="Number of toilet clips (manually entered by salesman)"
                      />
                      <span>@</span>
                      <input
                        className="svc-in field-qty"
                        type="number"
          min="0"
            min="0"
                        step="0.01"
                        name="toiletClipsMonthly"
                        value={form.toiletClipsMonthly}
                        onChange={onChange}
                        title="Toilet clips rate per month - editable"
                      />
                      <span>=</span>
                      <input
                        className="svc-in field-qty"
                        type="text"
                        readOnly
                        value={formatMoney(form.toiletClipsQty * form.toiletClipsMonthly)}
                      />
                    </div>
                  </div>

                  <div className="svc-row" style={{ paddingLeft: '20px' }}>
                    <label>Seat Cover Dispensers</label>
                    <div className="svc-row-right">
                      <input
                        className="svc-in field-qty"
                        type="number"
          min="0"
            min="0"
                        name="seatCoverDispensersQty"
                        value={form.seatCoverDispensersQty || ""}
                        onChange={onChange}
                        min="0"
                        placeholder="0"
                        title="Number of seat cover dispensers (manually entered by salesman)"
                      />
                      <span>@</span>
                      <input
                        className="svc-in field-qty"
                        type="number"
          min="0"
            min="0"
                        step="0.01"
                        name="seatCoverDispenserMonthly"
                        value={form.seatCoverDispenserMonthly}
                        onChange={onChange}
                        title="Seat cover dispenser rate per month - editable"
                      />
                      <span>=</span>
                      <input
                        className="svc-in field-qty"
                        type="text"
                        readOnly
                        value={formatMoney(form.seatCoverDispensersQty * form.seatCoverDispenserMonthly)}
                      />
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* Female Toilet Components - Only show checkbox if femaleToilets > 0 */}
          {form.femaleToilets > 0 && (
            <>
              <div className="svc-row">
                <label>Female Toilet Components</label>
                <div className="svc-row-right">
                  <label className="svc-inline">
                    <input
                      type="checkbox"
                      name="addFemaleToiletComponents"
                      checked={form.addFemaleToiletComponents}
                      onChange={onChange}
                    />
                    <span>Include SaniPods</span>
                  </label>
                </div>
              </div>

              {/* Show female toilet component calculations only when enabled */}
              {form.addFemaleToiletComponents && (
                <div className="svc-row" style={{ paddingLeft: '20px' }}>
                  <label>SaniPods</label>
                  <div className="svc-row-right">
                    <input
                      className="svc-in field-qty"
                      type="number"
          min="0"
            min="0"
                      name="sanipodsQty"
                      value={form.sanipodsQty || ""}
                      onChange={onChange}
                      min="0"
                      placeholder="0"
                      title="Number of SaniPods (manually entered by salesman)"
                    />
                    <span>@</span>
                    <input
                      className="svc-in field-qty"
                      type="number"
          min="0"
            min="0"
                      step="0.01"
                      name="sanipodServiceMonthly"
                      value={form.sanipodServiceMonthly}
                      onChange={onChange}
                      title="SaniPod service rate per month - editable"
                    />
                    <span>=</span>
                    <input
                      className="svc-in field-qty"
                      type="text"
                      readOnly
                      value={formatMoney(form.sanipodsQty * form.sanipodServiceMonthly)}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* ✅ REMOVED: Old facility component frequency dropdown - now handled by main dual frequency system above */}

          {/* Total Facility Components (at facility frequency) - Only show if any components are enabled */}
          {(form.addUrinalComponents || form.addMaleToiletComponents || form.addFemaleToiletComponents) && (
            <div className="svc-row">
              <label>Total Facility Components (at {form.facilityComponentsFrequency} frequency)</label>
              <div className="svc-row-right">
                <input
                  className="svc-in-box"
                  type="text"
                  readOnly
                  value={formatMoney(
                    (form.addUrinalComponents ? (form.urinalScreensQty * form.urinalScreenMonthly + form.urinalMatsQty * form.urinalMatMonthly) : 0) +
                    (form.addMaleToiletComponents ? (form.toiletClipsQty * form.toiletClipsMonthly + form.seatCoverDispensersQty * form.seatCoverDispenserMonthly) : 0) +
                    (form.addFemaleToiletComponents ? form.sanipodsQty * form.sanipodServiceMonthly : 0)
                  )}
                  title={`Component rates treated as ${form.facilityComponentsFrequency} rates - no conversion applied`}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Warranty - Only for Per Item Charge and only when there are sinks (dispensers) */}
      {!isAllInclusive && form.sinks > 0 && (
        <div className="svc-row">
          <label>Warranty</label>
          <div className="svc-row-right">
            <input
              className="svc-in field-qty"
              type="number"
          min="0"
            min="0"
              name="warrantyDispensers"
              value={form.warrantyDispensers || ""}
              onChange={onChange}
              min="0"
              placeholder="0"
              title="Number of dispensers for warranty (manually entered by salesman)"
            />
            <span>@</span>
            <input
              className="svc-in field-qty"
              type="number"
          min="0"
            min="0"
              step="0.01"
              name="warrantyFeePerDispenserPerWeek"
              value={form.warrantyFeePerDispenserPerWeek}
              onChange={onChange}
              title="Warranty rate per dispenser per week - editable"
            />
            <span>=</span>
            <input
              className="svc-in field-qty"
              type="text"
              readOnly
              value={formatMoney(form.warrantyDispensers * form.warrantyFeePerDispenserPerWeek)}
            />
            <span className="svc-note" style={{ marginLeft: '8px', fontSize: '12px', color: '#666' }}>
              Suggested: {Math.ceil(form.sinks * 1.5)} dispensers (soap + air freshener)
            </span>
          </div>
        </div>
      )}

      {/* Trip Charge - Only for Per Item Charge and not for small facilities */}
      {!isAllInclusive && fixtures > form.smallFacilityThreshold && (
        <div className="svc-row">
          <label>Trip Charge</label>
          <div className="svc-row-right">
            <label className="svc-inline">
              <input
                type="checkbox"
                name="addTripCharge"
                checked={form.addTripCharge}
                onChange={onChange}
              />
              <span>Include trip charge (+${form.location === "insideBeltway" ? form.insideBeltwayTripCharge.toFixed(2) : form.outsideBeltwayTripCharge.toFixed(2)})</span>
            </label>
          </div>
        </div>
      )}

      {/* MICROFIBER MOPPING */}
      <div className="svc-h-sub" style={{ marginTop: 10 }}>
        MICROFIBER MOPPING
      </div>

      {isAllInclusive ? (
        <div className="svc-row">
          <label>Microfiber Mopping</label>
          <div className="svc-row-right">
            <input
              className="svc-in field-qty"
              type="text"
              readOnly
              value="Included in All-Inclusive bundle"
            />
          </div>
        </div>
      ) : (
        <div className="svc-row">
          <label>Microfiber Mopping</label>
          <div className="svc-row-right">
            <label className="svc-inline">
              <input
                type="checkbox"
                name="addMicrofiberMopping"
                checked={form.addMicrofiberMopping}
                onChange={onChange}
              />
              <span>Include</span>
            </label>
            <input
              className="svc-in field-qty"
              type="number"
          min="0"
            min="0"
              name="microfiberBathrooms"
              disabled={!form.addMicrofiberMopping}
              value={form.microfiberBathrooms || ""}
              onChange={onChange}
            />
            <span>@</span>
            <input
              className="svc-in field-qty"
              type="number"
          min="0"
            min="0"
              step="0.01"
              name="microfiberMoppingPerBathroom"
              value={form.addMicrofiberMopping ? form.microfiberMoppingPerBathroom : 0}
              onChange={onChange}
              title="Microfiber mopping rate per bathroom per week - editable"
            />
            <span>=</span>
            <input
              className="svc-in field-qty"
              type="text"
              readOnly
              value={formatMoney(
                form.addMicrofiberMopping
                  ? form.microfiberBathrooms * form.microfiberMoppingPerBathroom
                  : 0
              )}
            />
          </div>
        </div>
      )}

      {/* PAPER - Only for All Inclusive */}
      {isAllInclusive && (
        <>
          <div className="svc-h-sub" style={{ marginTop: 10 }}>
            PAPER
          </div>

          <div className="svc-row">
            <label>Paper Spend - Credit = Overage</label>
            <div className="svc-row-right">
              <input
                className="svc-in"
                type="number"
          min="0"
            min="0"
                name="estimatedPaperSpendPerWeek"
                value={form.estimatedPaperSpendPerWeek || ""}
                onChange={onChange}
              />
              <span>-</span>
              <input
                className="svc-in"
                type="text"
                readOnly
                value={formatMoney(paperCreditPerWeek)}
              />
              <span>=</span>
              <input
                className="svc-in"
                type="text"
                readOnly
                value={formatMoney(paperOveragePerWeek)}
              />
            </div>
          </div>
        </>
      )}

      {/* WHAT'S INCLUDED */}
      <div className="svc-h-sub" style={{ marginTop: 10 }}>
        WHAT&apos;S INCLUDED
      </div>

      <div className="svc-row">
        <label>{isAllInclusive ? "All-Inclusive Bundle" : "Standard Package"}</label>
        <div className="svc-row-right">
          <div>
            {quote.included.map((item, index) => (
              <div key={index}>• {item}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Rate Tier */}
      <div className="svc-row">
        <label>Rate Tier</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="rateTier"
            value={form.rateTier}
            onChange={onChange}
          >
            <option value="redRate">Red</option>
            <option value="greenRate">Green</option>
          </select>
        </div>
      </div>

      {/* Notes */}
      <div className="svc-row">
        <label>Notes</label>
        <div className="svc-row-right">
          <textarea
            className="svc-in"
            name="notes"
            value={form.notes}
            onChange={onChange}
            rows={3}
          />
        </div>
      </div>

      {/* PRICING SUMMARY */}
      <div className="svc-h-sub" style={{ marginTop: 16 }}>
        PRICING SUMMARY
      </div>

      <div className="svc-row">
        <label>Chosen Method</label>
        <div className="svc-row-right">
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={form.pricingMode === "all_inclusive" ? "All Inclusive" : "Per Item Charge"}
          />
        </div>
      </div>

      {/* PRICE BREAKDOWN - Individual editable components */}
      <div className="svc-h-sub" style={{ marginTop: 16 }}>
        PRICE BREAKDOWN
      </div>

      {/* Base Service */}
      <div className="svc-row">
        <label>Base Service</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="number"
          min="0"
            min="0"
              step="0.01"
              name="customBaseService"
              value={getDisplayValue(
                'customBaseService',
                form.customBaseService !== undefined
                  ? form.customBaseService
                  : quote.breakdown.baseService
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{
                backgroundColor: form.customBaseService !== undefined ? '#fffacd' : 'white',
                width: '100px'
              }}
              title="Base service charge - editable"
            />
          </div>
        </div>
      </div>

      {/* Trip Charge */}
      {form.pricingMode === "per_item_charge" && (
        <div className="svc-row">
          <label>Trip Charge</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                type="number"
          min="0"
            min="0"
                step="0.01"
                name="customTripCharge"
                value={getDisplayValue(
                  'customTripCharge',
                  form.customTripCharge !== undefined
                    ? form.customTripCharge
                    : quote.breakdown.tripCharge
                )}
                onChange={handleLocalChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={{
                  backgroundColor: form.customTripCharge !== undefined ? '#fffacd' : 'white',
                  width: '100px'
                }}
                title="Trip charge - editable"
              />
            </div>
          </div>
        </div>
      )}

      {/* Facility Components */}
      {form.pricingMode === "per_item_charge" && quote.breakdown.facilityComponents > 0 && (
        <div className="svc-row">
          <label>Facility Components</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                type="number"
          min="0"
            min="0"
                step="0.01"
                name="customFacilityComponents"
                value={getDisplayValue(
                  'customFacilityComponents',
                  form.customFacilityComponents !== undefined
                    ? form.customFacilityComponents
                    : quote.breakdown.facilityComponents
                )}
                onChange={handleLocalChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={{
                  backgroundColor: form.customFacilityComponents !== undefined ? '#fffacd' : 'white',
                  width: '100px'
                }}
                title="Facility components (urinals, toilets, sanipods) - editable"
              />
            </div>
          </div>
        </div>
      )}

      {/* Soap Upgrade */}
      {quote.breakdown.soapUpgrade > 0 && (
        <div className="svc-row">
          <label>Soap Upgrade</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                type="number"
          min="0"
            min="0"
                step="0.01"
                name="customSoapUpgrade"
                value={getDisplayValue(
                  'customSoapUpgrade',
                  form.customSoapUpgrade !== undefined
                    ? form.customSoapUpgrade
                    : quote.breakdown.soapUpgrade
                )}
                onChange={handleLocalChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={{
                  backgroundColor: form.customSoapUpgrade !== undefined ? '#fffacd' : 'white',
                  width: '100px'
                }}
                title="Soap upgrade (luxury) - editable"
              />
            </div>
          </div>
        </div>
      )}

      {/* Excess Soap */}
      {quote.breakdown.excessSoap > 0 && (
        <div className="svc-row">
          <label>Excess Soap</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                type="number"
          min="0"
            min="0"
                step="0.01"
                name="customExcessSoap"
                value={getDisplayValue(
                  'customExcessSoap',
                  form.customExcessSoap !== undefined
                    ? form.customExcessSoap
                    : quote.breakdown.excessSoap
                )}
                onChange={handleLocalChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={{
                  backgroundColor: form.customExcessSoap !== undefined ? '#fffacd' : 'white',
                  width: '100px'
                }}
                title="Excess soap charges - editable"
              />
            </div>
          </div>
        </div>
      )}

      {/* Microfiber Mopping */}
      {quote.breakdown.microfiberMopping > 0 && (
        <div className="svc-row">
          <label>Microfiber Mopping</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                type="number"
          min="0"
            min="0"
                step="0.01"
                name="customMicrofiberMopping"
                value={getDisplayValue(
                  'customMicrofiberMopping',
                  form.customMicrofiberMopping !== undefined
                    ? form.customMicrofiberMopping
                    : quote.breakdown.microfiberMopping
                )}
                onChange={handleLocalChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={{
                  backgroundColor: form.customMicrofiberMopping !== undefined ? '#fffacd' : 'white',
                  width: '100px'
                }}
                title="Microfiber mopping - editable"
              />
            </div>
          </div>
        </div>
      )}

      {/* Warranty Fees */}
      {form.pricingMode === "per_item_charge" && quote.breakdown.warrantyFees > 0 && (
        <div className="svc-row">
          <label>Warranty Fees</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                type="number"
          min="0"
            min="0"
                step="0.01"
                name="customWarrantyFees"
                value={getDisplayValue(
                  'customWarrantyFees',
                  form.customWarrantyFees !== undefined
                    ? form.customWarrantyFees
                    : quote.breakdown.warrantyFees
                )}
                onChange={handleLocalChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={{
                  backgroundColor: form.customWarrantyFees !== undefined ? '#fffacd' : 'white',
                  width: '100px'
                }}
                title="Warranty fees - editable"
              />
            </div>
          </div>
        </div>
      )}

      {/* Paper Overage */}
      {form.pricingMode === "all_inclusive" && quote.breakdown.paperOverage > 0 && (
        <div className="svc-row">
          <label>Paper Overage</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                type="number"
          min="0"
            min="0"
                step="0.01"
                name="customPaperOverage"
                value={getDisplayValue(
                  'customPaperOverage',
                  form.customPaperOverage !== undefined
                    ? form.customPaperOverage
                    : quote.breakdown.paperOverage
                )}
                onChange={handleLocalChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={{
                  backgroundColor: form.customPaperOverage !== undefined ? '#fffacd' : 'white',
                  width: '100px'
                }}
                title="Paper overage - editable"
              />
            </div>
          </div>
        </div>
      )}

      {/* PRICING SUMMARY */}
      <div className="svc-h-sub" style={{ marginTop: 16 }}>
        PRICING SUMMARY
      </div>

      <div className="svc-row">
        <label>Chosen Method</label>
        <div className="svc-row-right">
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={form.pricingMode === "all_inclusive" ? "All Inclusive" : "Per Item Charge"}
          />
        </div>
      </div>

      <div className="svc-row">
        <label>Weekly Total (Service + All Add-Ons)</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="number"
          min="0"
            min="0"
              step="0.01"
              name="customWeeklyTotal"
              value={getDisplayValue(
                'customWeeklyTotal',
                form.customWeeklyTotal !== undefined
                  ? form.customWeeklyTotal
                  : quote.weeklyTotal
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{
                backgroundColor: form.customWeeklyTotal !== undefined ? '#fffacd' : 'white',
                width: '100px'
              }}
              title="Weekly total - editable"
            />
          </div>
        </div>
      </div>

      {/* Redline/Greenline Pricing Indicator */}
      {fixtures > 0 && (
        <div className="svc-row" style={{ marginTop: '-10px', paddingTop: '5px' }}>
          <label></label>
          <div className="svc-row-right">
            {quote.weeklyTotal <= quote.minimumChargePerWeek ? (
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

      <div className="svc-row">
        <label>Monthly Recurring</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="number"
          min="0"
            min="0"
              step="0.01"
              name="customMonthlyTotal"
              value={getDisplayValue(
                'customMonthlyTotal',
                form.customMonthlyTotal !== undefined
                  ? form.customMonthlyTotal
                  : quote.monthlyTotal
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{
                backgroundColor: form.customMonthlyTotal !== undefined ? '#fffacd' : 'white',
                width: '100px'
              }}
              title="Monthly total - editable"
            />
          </div>
        </div>
      </div>

      <div className="svc-row">
        <label>Contract Total</label>
        <div className="svc-row-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select
            className="svc-in"
            name="contractMonths"
            value={contractMonths}
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
            {Array.from({ length: 35 }, (_, i) => i + 2).map((m) => (
              <option key={m} value={m}>
                {m} mo
              </option>
            ))}
          </select>
          <span style={{ fontSize: '18px', fontWeight: 'bold' }}>$</span>
          <input
            type="number"
          min="0"
            min="0"
            step="0.01"
            name="customContractTotal"
            className="svc-in"
            value={getDisplayValue(
              'customContractTotal',
              form.customContractTotal !== undefined
                ? form.customContractTotal
                : contractTotal
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
    </div>
  );
};

export default SanicleanForm;
