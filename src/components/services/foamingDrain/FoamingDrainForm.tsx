
import React, { useEffect, useRef, useState, type ChangeEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSync, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { useFoamingDrainCalc } from "./useFoamingDrainCalc";
import type {
  FoamingDrainFormState,
  FoamingDrainFrequency,
  FoamingDrainLocation,
  FoamingDrainCondition,
} from "./foamingDrainTypes";
import { FOAMING_DRAIN_CONFIG as cfg } from "./foamingDrainConfig";
import { useServicesContextOptional } from "../ServicesContext";
import { CustomFieldManager, type CustomField } from "../CustomFieldManager";

const FIELD_ORDER = {
  frequency: 1,
  installFrequency: 2,

  breakdown: {
    standard: 10,
    grease: 11,
    green: 12,
  },
  installDrains: 13,
  plumbingWork: 14,
  tripCharge: 20,
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

interface FoamingDrainFormProps {
  initialData?: Partial<FoamingDrainFormState>;
  onRemove?: () => void;
}


const formatAmount = (n: number): string => (n > 0 ? n.toFixed(2) : "");


const formatNumber = (num: number): string => {
  if (!Number.isFinite(num)) {
    return "0";
  }
  return num % 1 === 0 ? num.toString() : num.toFixed(2);
};

export const FoamingDrainForm: React.FC<FoamingDrainFormProps> = ({
  initialData,
  onRemove,
}) => {

  const [customFields, setCustomFields] = useState<CustomField[]>(
    initialData?.customFields || []
  );


  const { state, quote, updateField, reset, refreshConfig, isLoadingConfig, backendConfig } =
    useFoamingDrainCalc(initialData, customFields);
  const servicesContext = useServicesContextOptional();


  useEffect(() => {
    if (servicesContext?.globalContractMonths && servicesContext.globalContractMonths !== state.contractMonths) {
      updateField("contractMonths", servicesContext.globalContractMonths as any);
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
      updateField(name as keyof FoamingDrainFormState, numValue as any);
    } else if (value === '') {

      updateField(name as keyof FoamingDrainFormState, undefined as any);
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
        updateField(name as keyof FoamingDrainFormState, undefined as any);
        return;
      }


      updateField(name as keyof FoamingDrainFormState, numValue as any);
    }
  };


  const prevDataRef = useRef<string>("");

  const breakdown = quote.breakdown;

  useEffect(() => {

    const isVolume = state.standardDrainCount >= cfg.volumePricing.minimumDrains;

    const stdQty = state.isAllInclusive
      ? 0
      : isVolume && !state.useBigAccountTenWeekly && !state.isAllInclusive
      ? Math.max(state.standardDrainCount - state.installDrainCount, 0)
      : state.standardDrainCount;
    const stdTotal = breakdown.weeklyStandardDrains;
    const stdRate = stdQty > 0 ? stdTotal / stdQty : state.standardDrainRate;

    const greaseQty = state.greaseTrapCount;
    const greaseTotal = breakdown.weeklyGreaseTraps;
    const greaseRate = greaseQty > 0 ? greaseTotal / greaseQty : state.greaseWeeklyRate;

    const greenQty = state.greenDrainCount;
    const greenTotal = breakdown.weeklyGreenDrains;
    const greenRate = greenQty > 0 ? greenTotal / greenQty : state.greenWeeklyRate;

    if (servicesContext) {
      const hasCustomFieldValues = customFields.some(f =>
        (f.type === 'dollar' && !!f.value && parseFloat(f.value) > 0) ||
        (f.type === 'calc' && !!f.calcValues?.right && parseFloat(f.calcValues.right) > 0)
      );
      const isActive = state.standardDrainCount > 0 || state.greaseTrapCount > 0 || state.greenDrainCount > 0 || hasCustomFieldValues;
      const dynamicMinimumDrains = backendConfig?.volumePricing?.minimumDrains ?? cfg.volumePricing.minimumDrains;
      const isVolume = state.standardDrainCount >= dynamicMinimumDrains;
      const isInstallProgram = isVolume && !state.useBigAccountTenWeekly && !state.isAllInclusive;
      const installQty = isInstallProgram ? Math.max(0, state.installDrainCount) : 0;
      const installTotal = breakdown.weeklyInstallDrains || 0;
      const installRate =
        installQty > 0
          ? installTotal / installQty
          : state.installFrequency === "bimonthly"
            ? state.volumeBimonthlyRate
            : state.volumeWeeklyRate;
      const installRowQty = installQty > 0 ? installQty : (state.installDrainCount || 0);
      const plumbingQty = state.needsPlumbing ? Math.max(0, state.plumbingDrainCount) : 0;
      const plumbingTotal = breakdown.weeklyPlumbing || 0;
      const effectivePlumbingRate = state.customPlumbingAddonRate ?? state.plumbingAddonRate;
      const plumbingRate = plumbingQty > 0 ? plumbingTotal / plumbingQty : effectivePlumbingRate;
      const plumbingRowQty = plumbingQty > 0 ? plumbingQty : (state.plumbingDrainCount || 0);

      const totalPriceValue =
        state.frequency === "oneTime"
          ? state.customWeeklyService ?? quote.contractTotal
          : undefined;

      const data = isActive ? {
        serviceId: "foamingDrain",
        displayName: "Foaming Drain",
        isActive: true,


        standardDrainRate: state.customRatePerDrain ?? state.standardDrainRate,
        altBaseCharge: state.customAltBaseCharge ?? state.altBaseCharge,
        altExtraPerDrain: state.customAltExtraPerDrain ?? state.altExtraPerDrain,
        volumeWeeklyRate: state.customVolumeWeeklyRate ?? state.volumeWeeklyRate,
        volumeBimonthlyRate: state.customVolumeBimonthlyRate ?? state.volumeBimonthlyRate,
        greaseWeeklyRate: state.customGreaseWeeklyRate ?? state.greaseWeeklyRate,
        greaseInstallRate: state.customGreaseInstallRate ?? state.greaseInstallRate,
        greenWeeklyRate: state.customGreenWeeklyRate ?? state.greenWeeklyRate,
        greenInstallRate: state.customGreenInstallRate ?? state.greenInstallRate,
        plumbingAddonRate: state.customPlumbingAddonRate ?? state.plumbingAddonRate,
        filthyMultiplier: state.customFilthyMultiplier ?? state.filthyMultiplier,


        standardDrainCount: state.standardDrainCount,
        installDrainCount: state.installDrainCount,
        filthyDrainCount: state.filthyDrainCount,
        greaseTrapCount: state.greaseTrapCount,
        greenDrainCount: state.greenDrainCount,
        plumbingDrainCount: state.plumbingDrainCount,
        frequency: state.frequency,
        installFrequency: state.installFrequency,
        contractMonths: state.contractMonths,
        facilityCondition: state.facilityCondition,

        useSmallAltPricingWeekly: state.useSmallAltPricingWeekly,
        useBigAccountTenWeekly: state.useBigAccountTenWeekly,
        isAllInclusive: state.isAllInclusive,
        chargeGreaseTrapInstall: state.chargeGreaseTrapInstall,
        needsPlumbing: state.needsPlumbing,
        applyMinimum: state.applyMinimum !== false,


        perVisitBase: quote.weeklyService,  
        perVisit: quote.weeklyTotal,  
        minimumChargePerVisit: quote.minimumChargePerVisit,  
        contractTotal: quote.contractTotal,
        originalContractTotal: quote.originalContractTotal,

        frequency: {
          isDisplay: true,
          orderNo: FIELD_ORDER.frequency,
          label: "Frequency",
          type: "text" as const,
          value: typeof state.frequency === "string"
            ? state.frequency.charAt(0).toUpperCase() + state.frequency.slice(1)
            : String(state.frequency || "Weekly"),
          frequencyKey: state.frequency,
        },
        installFrequency: {
          isDisplay: true,
          orderNo: FIELD_ORDER.installFrequency,
          label: "Install Frequency",
          type: "text" as const,
          value: state.installFrequency.charAt(0).toUpperCase() + state.installFrequency.slice(1),
        },


        drainBreakdown: (() => {
          const rows: any[] = [];
          if (state.standardDrainCount > 0) {
            rows.push({
              isDisplay: true,
              orderNo: FIELD_ORDER.breakdown.standard,
              label: "Standard Drains",
              type: "calc" as const,
              qty: state.standardDrainCount,
              rate: stdRate,
              total: breakdown.weeklyStandardDrains,
            });
          }
          if (state.greaseTrapCount > 0) {
            rows.push({
              isDisplay: true,
              orderNo: FIELD_ORDER.breakdown.grease,
              label: "Grease Trap Drains",
              type: "calc" as const,
              qty: state.greaseTrapCount,
              rate: greaseRate,
              total: breakdown.weeklyGreaseTraps,
            });
          }
          if (state.greenDrainCount > 0) {
            rows.push({
              isDisplay: true,
              orderNo: FIELD_ORDER.breakdown.green,
              label: "Green Drains",
              type: "calc" as const,
              qty: state.greenDrainCount,
              rate: greenRate,
              total: breakdown.weeklyGreenDrains,
            });
          }
          if (installRowQty > 0 && installTotal > 0) {
            rows.push({
              isDisplay: true,
              orderNo: FIELD_ORDER.installDrains,
              label: `Install Drains (${state.installFrequency.charAt(0).toUpperCase() + state.installFrequency.slice(1)})`,
              type: "calc" as const,
              qty: installRowQty,
              rate: installRate,
              total: installTotal,
            });
          }
          if (plumbingRowQty > 0 && plumbingTotal > 0) {
            rows.push({
              isDisplay: true,
              orderNo: FIELD_ORDER.plumbingWork,
              label: "Extra Plumbing Work",
              type: "calc" as const,
              qty: plumbingRowQty,
              rate: plumbingRate,
              total: plumbingTotal,
            });
          }
          return rows;
        })(),

        ...(breakdown.tripCharge > 0 ? {
          tripCharge: {
            isDisplay: true,
            orderNo: FIELD_ORDER.tripCharge,
            label: "Trip Charge",
            type: "dollar" as const,
            amount: breakdown.tripCharge,
          },
        } : {}),

        totals: (() => {
          const totals: any = {
            perVisit: {
              isDisplay: true,
              orderNo: FIELD_ORDER.totals.perVisit,
              label: "Per Visit Total",
              type: "dollar" as const,
              amount: quote.weeklyTotal,
            },
          };
          const monthlyGroup = new Set<FoamingDrainFrequency>(["weekly", "biweekly", "twicePerMonth", "monthly"]);
          if (monthlyGroup.has(state.frequency)) {
            totals.firstMonth = {
              isDisplay: true,
              orderNo: FIELD_ORDER.totals.firstMonth,
              label: "First Month Total",
              type: "dollar" as const,
              amount: quote.firstMonthPrice,
            };
            totals.monthlyRecurring = {
              isDisplay: true,
              orderNo: FIELD_ORDER.totals.monthlyRecurring,
              label: "Monthly Recurring",
              type: "dollar" as const,
              amount: quote.monthlyRecurring,
              gap: "normal",
            };
          } else {
            totals.firstVisit = {
              isDisplay: true,
              orderNo: FIELD_ORDER.totals.firstVisit,
              label: state.frequency === "oneTime" ? "Total Price" : "First Visit Total",
              type: "dollar" as const,
              amount: quote.firstVisitPrice,
            };
            totals.recurringVisit = {
              isDisplay: true,
              orderNo: FIELD_ORDER.totals.recurringVisit,
              label: "Recurring Visit Total",
              type: "dollar" as const,
              amount: quote.weeklyService,
              gap: "normal",
            };
          }
          if (state.frequency === "oneTime" && totalPriceValue !== undefined) {
            totals.totalPrice = {
              isDisplay: true,
              orderNo: FIELD_ORDER.totals.totalPrice,
              label: "Total Price",
              type: "dollar" as const,
              amount: totalPriceValue,
            };
          }

          totals.contract = {
            isDisplay: true,
            orderNo: FIELD_ORDER.totals.contract,
            label: "Contract Total",
            type: "dollar" as const,
            months: state.contractMonths,
            amount: quote.annualRecurring,
          };
          totals.minimum = {
            isDisplay: true,
            orderNo: FIELD_ORDER.totals.minimum,
            label: "Minimum",
            type: "dollar" as const,
            amount: quote.minimumChargePerVisit,
          };
          return totals;
        })(),

        notes: state.notes || "",
        customFields: customFields,
        ...(state.frequency === "oneTime" && totalPriceValue !== undefined
          ? { totalPrice: totalPriceValue }
          : {}),
      } : null;

      const dataStr = JSON.stringify(data);


      if (dataStr !== prevDataRef.current) {
        prevDataRef.current = dataStr;
        console.log('🔧 [FoamingDrainForm] Sending data to context with pricing fields:', {
          standardDrainRate: data?.standardDrainRate,
          altBaseCharge: data?.altBaseCharge,
          altExtraPerDrain: data?.altExtraPerDrain,
          fullData: JSON.stringify(data, null, 2)
        });
        servicesContext.updateService("foamingDrain", data);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, quote, breakdown, customFields, backendConfig]);


  const dynamicMinimumDrains = backendConfig?.volumePricing?.minimumDrains ?? cfg.volumePricing.minimumDrains;
  const isWeekly = state.frequency === "weekly";
  const isVolume = state.standardDrainCount >= dynamicMinimumDrains; 


  const canUseSmallAlt =
    isWeekly && state.standardDrainCount > 0 && !isVolume;


  const canUseBigAlt = isVolume;

  const isInstallLevelUi =
    isVolume && !state.useBigAccountTenWeekly && !state.isAllInclusive;

  const handleNumberChange =
    (field: keyof FoamingDrainFormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const num = raw === "" ? 0 : Number(raw);
      const safe = Number.isFinite(num) && num >= 0 ? num : 0;


      if (field === "standardDrainCount") {
        const newCount = safe;
        const newIsVolume =
          newCount >= dynamicMinimumDrains; 
        const newCanSmallAlt =
          state.frequency === "weekly" &&
          newCount > 0 &&
          !newIsVolume;

        updateField("standardDrainCount", newCount);


        if (!newCanSmallAlt && state.useSmallAltPricingWeekly) {
          updateField("useSmallAltPricingWeekly", false);
        }


        return;
      }

      updateField(field, safe);
    };

  const handleFrequencyChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newFreq = e.target.value as FoamingDrainFrequency;
    updateField("frequency", newFreq);


    if (newFreq !== "weekly") {

      updateField("useSmallAltPricingWeekly", false);
    } else {

      const count = state.standardDrainCount;
      const newIsVolume =
        count >= dynamicMinimumDrains; 
      const newCanSmallAlt = count > 0 && !newIsVolume;

      if (!newCanSmallAlt && state.useSmallAltPricingWeekly) {
        updateField("useSmallAltPricingWeekly", false);
      }
    }
  };


  const handleInstallFrequencyChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newInstallFreq = e.target.value as "weekly" | "bimonthly";
    console.log(`🔧 [Foaming Drain] Install frequency changed from ${state.installFrequency} to ${newInstallFreq}`);
    updateField("installFrequency", newInstallFreq);
  };


  const handleLocationChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    updateField("location", e.target.value as FoamingDrainLocation);
  };

  const handleConditionChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    updateField(
      "facilityCondition",
      e.target.value as FoamingDrainCondition
    );
  };


  const stdServiceQty = state.isAllInclusive
    ? 0
    : isInstallLevelUi
    ? Math.max(state.standardDrainCount - state.installDrainCount, 0)
    : state.standardDrainCount;

  const stdQty = stdServiceQty;
  const stdTotal = breakdown.weeklyStandardDrains;


  const stdQtyForRateCalc = isInstallLevelUi
    ? Math.max(state.standardDrainCount - state.installDrainCount, 0)
    : state.standardDrainCount;


  const effectiveStandardRate = state.customRatePerDrain ?? state.standardDrainRate;
  let stdRate = effectiveStandardRate;
  if (!state.isAllInclusive && stdQtyForRateCalc > 0 && stdTotal > 0) {
    stdRate = stdTotal / stdQtyForRateCalc;
  }

  const greaseQty = state.greaseTrapCount;
  const greaseTotal = breakdown.weeklyGreaseTraps;
  const greaseRate = greaseQty > 0 ? greaseTotal / greaseQty : 0;

  const greenQty = state.greenDrainCount;
  const greenTotal = breakdown.weeklyGreenDrains;
  const greenRate = greenQty > 0 ? greenTotal / greenQty : 0;

  const effectivePlumbingRate = state.customPlumbingAddonRate ?? state.plumbingAddonRate;


  const pricingLabel = (() => {
    const minimumDrains = backendConfig?.volumePricing?.minimumDrains ?? 10;
    const altBase = formatNumber(state.customAltBaseCharge ?? state.altBaseCharge);
    const altPerDrain = formatNumber(state.customAltExtraPerDrain ?? state.altExtraPerDrain);
    const volumeWeekly = formatNumber(state.customVolumeWeeklyRate ?? state.volumeWeeklyRate);
    const volumeBimonthly = formatNumber(state.customVolumeBimonthlyRate ?? state.volumeBimonthlyRate);
    const standardRate = formatNumber(stdRate);

    if (breakdown.usedBigAccountAlt) {
      return `Volume – $${volumeWeekly}/week per drain, install waived (${minimumDrains}+ drains)`;
    }
    if (breakdown.volumePricingApplied) {
      return `Volume (${minimumDrains}+ drains, separate $${volumeWeekly}/$${volumeBimonthly} install-drain)`;
    }
    if (breakdown.usedSmallAlt) {
      return `Alternative (weekly: $${altBase} + $${altPerDrain}/drain)`;
    }
    return `Standard ($${standardRate}/drain)`;
  })();


  const installQty = isInstallLevelUi ? state.installDrainCount : 0;
  const installTotal = breakdown.weeklyInstallDrains;
  const installRate =
    installQty > 0
      ? installTotal / installQty
      : isInstallLevelUi
      ? state.installFrequency === "bimonthly"  
        ? state.volumeBimonthlyRate
        : state.volumeWeeklyRate
      : 0;

  const tripInputValue =
    typeof state.tripChargeOverride === "number"
      ? state.tripChargeOverride
      : breakdown.tripCharge;

  return (
    <div className="svc-card">
      <div className="svc-card__inner">
        <div className="svc-h-row">
          <div className="svc-h">FOAMING DRAIN SERVICE</div>
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
        <div className="svc-row">
          <div className="svc-label">
            <span>Service Frequency</span>
          </div>
          <div className="svc-field">
            <select
              className="svc-in"
              value={state.frequency}
              onChange={handleFrequencyChange}
            >
              <option value="oneTime">One Time</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="twicePerMonth">2× / Month</option>
              <option value="monthly">Monthly</option>
              <option value="bimonthly">Bi-monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="biannual">Bi-annual</option>
              <option value="annual">Annual</option>
            </select>
          </div>
        </div>


        {}
        {}

        {}
        {}

        {}
        <div className="svc-row">
          <div className="svc-label">
            <span>Extras</span>
          </div>
          <div className="svc-field">
            <div className="svc-inline">
              {}
              <label>
                <input
                  type="checkbox"
                  checked={state.needsPlumbing}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    updateField("needsPlumbing", checked);
                    if (!checked) {
                      updateField("plumbingDrainCount", 0);
                    }
                  }}
                />{" "}
                Plumbing (+$
                <input
                  type="number"
                  min={0}
                  step={1}
                  name="customPlumbingAddonRate"
                  className="svc-in field-rate"
                  style={{
                    width: "60px",
                    display: "inline-block",
                    margin: "0 2px",
                    backgroundColor: state.customPlumbingAddonRate !== undefined ? '#fffacd' : 'white'
                  }}
                  value={getDisplayValue(
                    'customPlumbingAddonRate',
                    state.customPlumbingAddonRate !== undefined
                      ? state.customPlumbingAddonRate
                      : state.plumbingAddonRate
                  )}
                  onChange={handleLocalChange}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  title="Plumbing addon rate per drain (editable with yellow highlight if overridden)"
                />
                /drain) – Drains:{" "}
                {state.needsPlumbing && (
                  <input
                    type="number"
            min="0"
                    min={0}
                    className="svc-in field-medium"
                    value={state.plumbingDrainCount || ""}
                    onChange={handleNumberChange("plumbingDrainCount")}
                  />
                )}
              </label>
            </div>
          </div>
        </div>

        {}
        <div className="svc-row">
          <div className="svc-label" />
          <div className="svc-field">
            <div className="svc-inline">
              {}
              <label>
                <input
                  type="checkbox"
                  disabled={!canUseSmallAlt}
                  checked={state.useSmallAltPricingWeekly && canUseSmallAlt}
                  onChange={(e) => {
                    const checked = e.target.checked && canUseSmallAlt;
                    updateField("useSmallAltPricingWeekly", checked);
                    if (checked && state.useBigAccountTenWeekly) {
                      updateField("useBigAccountTenWeekly", false);
                    }
                  }}
                />{" "}
                Small-job alt:{" "}
                <span className="svc-note">
                  weekly &lt; {backendConfig?.volumePricing?.minimumDrains ?? 10} drains → $
                </span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  name="customAltBaseCharge"
                  className="svc-in field-qty"
                  value={getDisplayValue(
                    'customAltBaseCharge',
                    state.customAltBaseCharge !== undefined
                      ? state.customAltBaseCharge
                      : state.altBaseCharge
                  )}
                  onChange={handleLocalChange}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  title="Alt base charge (editable with yellow highlight if overridden)"
                  style={{
                    backgroundColor: state.customAltBaseCharge !== undefined ? '#fffacd' : 'white'
                  }}
                />
                <span className="svc-note"> + $</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  name="customAltExtraPerDrain"
                  className="svc-in field-qty"
                  value={getDisplayValue(
                    'customAltExtraPerDrain',
                    state.customAltExtraPerDrain !== undefined
                      ? state.customAltExtraPerDrain
                      : state.altExtraPerDrain
                  )}
                  onChange={handleLocalChange}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  title="Alt per drain charge (editable with yellow highlight if overridden)"
                  style={{
                    backgroundColor: state.customAltExtraPerDrain !== undefined ? '#fffacd' : 'white'
                  }}
                />
                <span className="svc-note">/drain</span>
              </label>
            </div>
            <div className="svc-inline">
              {}
              <label>
                <input
                  type="checkbox"
                  disabled={!canUseBigAlt}
                  checked={state.useBigAccountTenWeekly && canUseBigAlt}
                  onChange={(e) => {
                    const checked = e.target.checked && canUseBigAlt;
                    updateField("useBigAccountTenWeekly", checked);

                    if (checked && state.useSmallAltPricingWeekly) {
                      updateField("useSmallAltPricingWeekly", false);
                    }
                  }}
                />{" "}
                Big account:{" "}
                <span className="svc-note">
                  weekly {backendConfig?.volumePricing?.minimumDrains ?? 10}+ drains → ${state.standardDrainRate}/week, install waived
                </span>
              </label>
            </div>
          </div>
        </div>

        {}
        {}

        {}
        <div className="svc-row">
          <div className="svc-label" />
          <div className="svc-field">
            <label>
              <input
                type="checkbox"
                checked={state.chargeGreaseTrapInstall}
                onChange={(e) =>
                  updateField(
                    "chargeGreaseTrapInstall",
                    e.target.checked
                  )
                }
              />{" "}
              Grease Trap Install (min $
              <input
                type="number"
                min={0}
                step={1}
                name="customGreaseInstallRate"
                className="svc-in field-rate"
                style={{
                  width: "80px",
                  display: "inline-block",
                  margin: "0 2px",
                  backgroundColor: state.customGreaseInstallRate !== undefined ? '#fffacd' : 'white'
                }}
                value={getDisplayValue(
                  'customGreaseInstallRate',
                  state.customGreaseInstallRate !== undefined
                    ? state.customGreaseInstallRate
                    : state.greaseInstallRate
                )}
                onChange={handleLocalChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                title="Grease trap installation rate per trap (editable with yellow highlight if overridden)"
              />
              if possible)
            </label>
          </div>
        </div>

        {}
        <div className="svc-summary">
          {}
          <div className="svc-row">
            <div className="svc-label">
              <span>Standard Drains</span>
            </div>
            <div className="svc-field">
              <div className="svc-inline">
                {}
                <input
                  type="number"
                  min="0"
                  className="svc-in field-qty"
                  value={state.standardDrainCount || ""}
                  onChange={handleNumberChange("standardDrainCount")}
                />
                {isInstallLevelUi && state.installDrainCount > 0 && (
                  <span className="svc-note" style={{ marginLeft: "8px" }}>
                    Service drains: {stdQtyForRateCalc}
                  </span>
                )}

                <span>@</span>
                {}
                <span>$</span>
                <input
                  type="number"
                  min="0"
                  readOnly={breakdown.usedSmallAlt}
                  step={1}
                  name="customRatePerDrain"
                  className="svc-in field-rate"
                  value={getDisplayValue(
                    'customRatePerDrain',
                    state.customRatePerDrain !== undefined
                      ? state.customRatePerDrain
                      : (stdRate > 0 ? stdRate : state.standardDrainRate)
                  )}
                  onChange={handleLocalChange}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  title={breakdown.usedSmallAlt
                    ? `Effective rate (from alt pricing: $${state.altBaseCharge} + $${state.altExtraPerDrain}/drain) - NOT EDITABLE`
                    : breakdown.usedBigAccountAlt
                    ? "Effective rate (big account: $10/week per drain) - editable with yellow highlight if overridden"
                    : "Standard drain rate - editable with yellow highlight if overridden"}
                  style={{
                    backgroundColor: breakdown.usedSmallAlt
                      ? '#f0f0f0'
                      : (state.customRatePerDrain !== undefined ? '#fffacd' : 'white')
                  }}
                />
                <span>=</span>
                {}
                <span>$</span>
                <input
                  readOnly
                  className="svc-in-box weekly-total-field"
                  value={formatAmount(stdTotal)}
                />
              </div>
            </div>
          </div>

          <div className="svc-row">
            <div className="svc-label">
              <span>Pricing Model</span>
            </div>
            <div className="svc-field">
              <span className="svc-red">{pricingLabel}</span>
            </div>
          </div>

          {}
          {isInstallLevelUi && (
            <div>
                    <div className="svc-row">
          <div className="svc-label">
            <span>Install Frequency</span>
          </div>
          <div className="svc-field">
            <select
              className="svc-in"
              value={state.installFrequency}
              onChange={handleInstallFrequencyChange}
              key="install-frequency-select" 
            >
              {}
              <option value="weekly">Weekly</option>
              <option value="bimonthly">Bimonthly</option>
            </select>
          </div>
        </div>
            <div className="svc-row">
              <div className="svc-label">
                <span>Install Drains (10+)</span>
              </div>
              <div className="svc-field">
                <div className="svc-inline">
                  {}
                  <input
                    type="number"
                    min={0}
                    max={state.standardDrainCount}
                    className="svc-in field-qty"
                    value={state.installDrainCount || ""}
                    onChange={handleNumberChange("installDrainCount")}
                  />
                  <span>@</span>
                  {}
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className="svc-in field-qty"
                    name={state.installFrequency === "weekly" ? "customVolumeWeeklyRate" : "customVolumeBimonthlyRate"}
                    value={getDisplayValue(
                      state.installFrequency === "weekly" ? 'customVolumeWeeklyRate' : 'customVolumeBimonthlyRate',
                      state.installFrequency === "weekly"
                        ? (state.customVolumeWeeklyRate !== undefined ? state.customVolumeWeeklyRate : state.volumeWeeklyRate)
                        : (state.customVolumeBimonthlyRate !== undefined ? state.customVolumeBimonthlyRate : state.volumeBimonthlyRate)
                    )}
                    onChange={handleLocalChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    title={`Volume ${state.installFrequency} rate (editable with yellow highlight if overridden)`}
                    style={{
                      backgroundColor: state.installFrequency === "weekly"
                        ? (state.customVolumeWeeklyRate !== undefined ? '#fffacd' : 'white')
                        : (state.customVolumeBimonthlyRate !== undefined ? '#fffacd' : 'white')
                    }}
                  />
                  <span>=</span>
                  {}
                  <input
                    readOnly
                    className="svc-in field-qty"

                    value={formatAmount(installTotal)}
                  />
                  {}
                </div>
              </div>
            </div>
            </div>
          )}

          {}
          <div className="svc-row">
            <div className="svc-label">
              <span>Grease Traps</span>
            </div>
            <div className="svc-field">
              <div className="svc-inline">
                {}
                <input
                  type="number"
            min="0"
                  min={0}
                  className="svc-in field-qty"
                  className="svc-in field-qty"
                  value={state.greaseTrapCount || ""}
                  onChange={handleNumberChange("greaseTrapCount")}
                />
                <span>@</span>
                {}
                <span>$</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  name="customGreaseWeeklyRate"
                  className="svc-in field-qty"
                  value={getDisplayValue(
                    'customGreaseWeeklyRate',
                    state.customGreaseWeeklyRate !== undefined
                      ? state.customGreaseWeeklyRate
                      : state.greaseWeeklyRate
                  )}
                  onChange={handleLocalChange}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  title="Grease trap weekly rate (editable with yellow highlight if overridden)"
                  style={{
                    backgroundColor: state.customGreaseWeeklyRate !== undefined ? '#fffacd' : 'white'
                  }}
                />
                <span>=</span>
                {}
                <span>$</span>
                <input
                  readOnly
                  className="svc-in field-qty"

                  value={formatAmount(greaseTotal)}
                />
              </div>
            </div>
          </div>

          {}
          <div className="svc-row">
            <div className="svc-label">
              <span>Green Drains</span>
            </div>
            <div className="svc-field">
              <div className="svc-inline">
                {}
                <input
                  type="number"
            min="0"
                  min={0}
                  className="svc-in field-qty"
                  className="svc-in field-qty"
                  value={state.greenDrainCount || ""}
                  onChange={handleNumberChange("greenDrainCount")}
                />
                <span>@</span>
                {}
                <span>$</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  name="customGreenWeeklyRate"
                  className="svc-in field-qty"
                  value={getDisplayValue(
                    'customGreenWeeklyRate',
                    state.customGreenWeeklyRate !== undefined
                      ? state.customGreenWeeklyRate
                      : state.greenWeeklyRate
                  )}
                  onChange={handleLocalChange}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  title="Green drain weekly rate (editable with yellow highlight if overridden)"
                  style={{
                    backgroundColor: state.customGreenWeeklyRate !== undefined ? '#fffacd' : 'white'
                  }}
                />
                <span>=</span>
                {}
                <span>$</span>
                <input
                  readOnly
                  className="svc-in field-qty"

                  value={formatAmount(greenTotal)}
                />
              </div>
            </div>
          </div>

          {}
          {state.needsPlumbing && state.plumbingDrainCount > 0 && (
            <div className="svc-row">
              <div className="svc-label">
                <span>Extra Plumbing Work</span>
              </div>
              <div className="svc-field">
                <div className="svc-inline">
                  {}
                  <input
                    readOnly
                    type="number"
                    min="0"
                    className="svc-in field-qty"
                    value={state.plumbingDrainCount}
                  />
                  <span>@</span>
                  {}
                  <input
                    readOnly
                    type="number"
                    min="0"
                    step={1}
                    className="svc-in field-rate"
                    value={effectivePlumbingRate}
                  />
                  <span>=</span>
                  {}
                  <input
                    readOnly
                    type="number"
                    min="0"
                    step="0.01"
                    name="customPlumbingTotal"
                    className="svc-in field-qty"
                    value={getDisplayValue(
                      'customPlumbingTotal',
                      state.customPlumbingTotal !== undefined
                        ? state.customPlumbingTotal
                        : parseFloat(formatAmount(breakdown.weeklyPlumbing) || '0')
                    )}
                    style={{
                      backgroundColor: state.customPlumbingTotal !== undefined ? '#fffacd' : 'white',
                    }}
                    title="Extra plumbing work total"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {}
        <div className="svc-summary">

          {}
          <div className="svc-row">
            <div className="svc-label">
              <span>Facility Condition</span>
            </div>
            <div className="svc-field">
              <select
                className="svc-in"
                value={state.facilityCondition}
                onChange={handleConditionChange}
              >
                <option value="normal">Normal</option>
                <option value="filthy">Filthy (3× install)</option>
              </select>
            </div>
          </div>

          {}
          {state.facilityCondition === "filthy" && (
            <div className="svc-row">
              <div className="svc-label">
                <span>Filthy Multiplier</span>
              </div>
              <div className="svc-field">
                <div className="svc-inline">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    name="customFilthyMultiplier"
                    className="svc-in field-rate"
                    value={getDisplayValue(
                      'customFilthyMultiplier',
                      state.customFilthyMultiplier !== undefined
                        ? state.customFilthyMultiplier
                        : state.filthyMultiplier
                    )}
                    onChange={handleLocalChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    title="Filthy installation multiplier (editable with yellow highlight if overridden)"
                    style={{
                      backgroundColor: state.customFilthyMultiplier !== undefined ? '#fffacd' : 'white'
                    }}
                  />
                  <span className="svc-note" style={{ marginLeft: 8 }}>
                    × weekly cost = installation fee (usually 3×)
                  </span>
                </div>
              </div>
            </div>
          )}


          {}
          <div className="svc-row">
            <div className="svc-label">
              <span>Installation Total</span>
            </div>
            <div className="svc-field svc-dollar">
              <span>$</span>
              <input
                type="number"
                min="0"
                readOnly
                step="0.01"
                name="customInstallationTotal"
                className="svc-in total-field"
                value={getDisplayValue(
                  'customInstallationTotal',
                  state.customInstallationTotal !== undefined
                    ? state.customInstallationTotal
                    : parseFloat(formatAmount(quote.installation) || '0')
                )}
                style={{
                  backgroundColor: state.customInstallationTotal !== undefined ? '#fffacd' : 'white',
                }}
                title="Installation total"
              />
            </div>
          </div>
          {}
          {}

          {}
          {}

          {}
          {state.frequency !== "oneTime" && (
            <div className="svc-row">
              <div className="svc-label">
                <span>First Visit Total</span>
              </div>
              <div className="svc-field svc-dollar">
                <span>$</span>
                <input
                  readOnly
                  type="number"
                  min="0"
                  step="0.01"
                  name="customFirstMonthPrice"
                  className="svc-in sm"
                  value={getDisplayValue(
                    'customFirstMonthPrice',
                    state.customFirstMonthPrice !== undefined
                      ? state.customFirstMonthPrice
                      : parseFloat(formatAmount(quote.firstVisitPrice) || '0')
                  )}
                  style={{
                    backgroundColor: state.customFirstMonthPrice !== undefined ? '#fffacd' : 'white',
                  }}
                  title="First visit total"
                />
              </div>
            </div>
          )}

          {}
          <div className="svc-row">
            <div className="svc-label">
              <span>Minimum Per Visit</span>
            </div>
            <div className="svc-field">
              <span className="svc-small">${quote.minimumChargePerVisit?.toFixed(2) ?? "0.00"}</span>
              <label className="svc-inline" style={{ marginLeft: '10px' }}>
                <input
                  type="checkbox"
                  checked={state.applyMinimum !== false}
                  onChange={(e) => updateField("applyMinimum", e.target.checked)}
                />
                <span>Apply Minimum</span>
              </label>
            </div>
          </div>

          {}
          <div className="svc-row">
            <div className="svc-label">
              <span>
                {state.frequency === "bimonthly" ||
                 state.frequency === "quarterly" ||
                 state.frequency === "biannual" ||
                 state.frequency === "annual"
                  ? "Recurring Visit Total"
                  : "Per Visit Total"}
              </span>
            </div>
            <div className="svc-field svc-dollar">
              <span>$</span>
              <input
                type="number"
                min="0"
                readOnly
                step="0.01"
                name="customWeeklyService"
                className="svc-in weekly-total-field"
                value={getDisplayValue(
                  'customWeeklyService',
                  state.customWeeklyService !== undefined
                    ? state.customWeeklyService
                    : parseFloat(formatAmount(quote.weeklyTotal) || '0')
                )}
                style={{
                  backgroundColor: state.customWeeklyService !== undefined ? '#fffacd' : 'white',
                }}
                title="Per visit total - editable"
              />
            </div>
          </div>

          {}
          {(state.standardDrainCount > 0 || state.filthyDrainCount > 0 || state.greaseTrapCount > 0 || state.greenDrainCount > 0 || state.plumbingDrainCount > 0) && (
            <div className="svc-row" style={{ marginTop: '-10px', paddingTop: '5px' }}>
              <div className="svc-label"></div>
              <div className="svc-field">
                {quote.contractTotal > quote.originalContractTotal * 1.20 ? (
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
          {state.frequency === "oneTime" && (
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
                  name="customWeeklyService"
                  className="svc-in sm"
                  value={getDisplayValue(
                    'customWeeklyService',
                    state.customWeeklyService !== undefined
                      ? state.customWeeklyService
                      : quote.contractTotal
                  )}
                  style={{
                    backgroundColor: state.customWeeklyService !== undefined ? '#fffacd' : 'white',
                  }}
                  title="Total price for one-time service"
                />
              </div>
            </div>
          )}


          {}
          {state.frequency !== "oneTime" &&
           state.frequency !== "bimonthly" &&
           state.frequency !== "quarterly" &&
           state.frequency !== "biannual" &&
           state.frequency !== "annual" && (
            <div className="svc-row">
              <div className="svc-label">
                <span>First Month Total</span>
              </div>
              <div className="svc-field svc-dollar">
                <span>$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  readOnly
                  name="customFirstMonthPrice"
                  className="svc-in field-qty"
                  value={getDisplayValue(
                    'customFirstMonthPrice',
                    state.customFirstMonthPrice !== undefined
                      ? state.customFirstMonthPrice
                      : parseFloat(formatAmount(quote.firstMonthPrice) || '0')
                  )}
                  style={{
                    backgroundColor: state.customFirstMonthPrice !== undefined ? '#fffacd' : 'white',
                  }}
                  title="First month total - editable"
                />
              </div>
            </div>
          )}

          {}
          {state.frequency !== "oneTime" &&
           state.frequency !== "bimonthly" &&
           state.frequency !== "quarterly" &&
           state.frequency !== "biannual" &&
           state.frequency !== "annual" && (
            <div className="svc-row">
              <div className="svc-label">
                <span>Monthly Recurring</span>
              </div>
              <div className="svc-field svc-dollar">
                <span>$</span>
                <input
                  type="number"
                  min="0"
                  readOnly
                  step="0.01"
                  name="customMonthlyRecurring"
                  className="svc-in monthly-total-field"
                  value={getDisplayValue(
                    'customMonthlyRecurring',
                    state.customMonthlyRecurring !== undefined
                      ? state.customMonthlyRecurring
                      : parseFloat(formatAmount(quote.monthlyRecurring) || '0')
                  )}
                  style={{
                    backgroundColor: state.customMonthlyRecurring !== undefined ? '#fffacd' : 'white',
                  }}
                  title="Monthly recurring"
                />
              </div>
            </div>
          )}


          {}
          {state.frequency !== "oneTime" && (
            <div className="svc-row">
              <div className="svc-label">
                <span>Contract Total</span>
              </div>
              <div className="svc-field">
                <div className="svc-inline">
                <select
                  className="svc-in field-qty"
                  style={{ width: '80px', marginRight: '8px' }}
                  value={state.contractMonths}
                  onChange={(e) =>
                    updateField(
                      "contractMonths",
                      Number(e.target.value) as any
                    )
                  }
                >
                  {state.frequency === "quarterly" ? (

                    Array.from({ length: 12 }, (_, i) => {
                      const months = (i + 1) * 3; 
                      return (
                        <option key={months} value={months}>
                          {months} mo
                        </option>
                      );
                    })
                  ) : state.frequency === "biannual" ? (

                    Array.from({ length: 6 }, (_, i) => {
                      const months = (i + 1) * 6; 
                      return (
                        <option key={months} value={months}>
                          {months} mo
                        </option>
                      );
                    })
                  ) : state.frequency === "annual" ? (

                    Array.from({ length: 3 }, (_, i) => {
                      const months = (i + 1) * 12; 
                      return (
                        <option key={months} value={months}>
                          {months} mo
                        </option>
                      );
                    })
                  ) : (

                    Array.from(
                      {
                        length:
                          cfg.contract.maxMonths - cfg.contract.minMonths + 1,
                      },
                      (_, i) => {
                        const m = cfg.contract.minMonths + i;
                        return (
                          <option key={m} value={m}>
                            {m} mo
                          </option>
                        );
                      }
                    )
                  )}
                </select>
                <div className="svc-field svc-dollar" style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <span style={{ marginRight: '4px' }}>$</span>
                  <input
                    type="number"
                    min="0"
                    readOnly
                    step="0.01"
                    name="customContractTotal"
                    className="svc-in contract-total-field"
                    style={{
                      width: '140px',
                      backgroundColor: state.customContractTotal !== undefined ? '#fffacd' : 'white',
                    }}
                    value={getDisplayValue(
                      'customContractTotal',
                      state.customContractTotal !== undefined
                        ? state.customContractTotal
                        : parseFloat(formatAmount(quote.annualRecurring) || '0')
                    )}
                    title="Contract total"
                  />
                </div>
              </div>
            </div>
          </div>
          )}

          <div className="svc-row" style={{ marginTop: 6 }}>
            <div className="svc-label" />
            {}
          </div>
        </div>
      </div>
    </div>
  );
};
