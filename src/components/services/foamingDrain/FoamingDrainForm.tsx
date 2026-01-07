// src/features/services/foamingDrain/FoamingDrainForm.tsx
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
  // location: 3,
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

// Hide 0.00 when nothing entered
const formatAmount = (n: number): string => (n > 0 ? n.toFixed(2) : "");

// Helper function to format numbers without unnecessary decimals (like SaniScrub)
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
  // Custom fields state - initialize with initialData if available
  const [customFields, setCustomFields] = useState<CustomField[]>(
    initialData?.customFields || []
  );

  // ✅ UPDATED: Pass customFields to calculation hook
  const { state, quote, updateField, reset, refreshConfig, isLoadingConfig, backendConfig } =
    useFoamingDrainCalc(initialData, customFields);
  const servicesContext = useServicesContextOptional();

  // ✅ NEW: Sync global contract months to individual service
  useEffect(() => {
    if (servicesContext?.globalContractMonths && servicesContext.globalContractMonths !== state.contractMonths) {
      updateField("contractMonths", servicesContext.globalContractMonths as any);
    }
  }, [servicesContext?.globalContractMonths]);

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
      updateField(name as keyof FoamingDrainFormState, numValue as any);
    } else if (value === '') {
      // If field is cleared, update form to clear the override
      updateField(name as keyof FoamingDrainFormState, undefined as any);
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
        updateField(name as keyof FoamingDrainFormState, undefined as any);
        return;
      }

      // ✅ Update form state with parsed numeric value ONLY if changed
      updateField(name as keyof FoamingDrainFormState, numValue as any);
    }
  };

  // Save form data to context for form submission
  const prevDataRef = useRef<string>("");

  const breakdown = quote.breakdown;

  useEffect(() => {
    // Calculate effective rates for payload (these match what's shown in the UI)
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
      const isActive = state.standardDrainCount > 0 || state.greaseTrapCount > 0 || state.greenDrainCount > 0;
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
          ? state.customWeeklyService ?? quote.firstVisitPrice
          : undefined;

      const data = isActive ? {
        serviceId: "foamingDrain",
        displayName: "Foaming Drain",
        isActive: true,

        // ✅ FIXED: Save EFFECTIVE pricing fields (custom override if set, otherwise base value)
        // This ensures edited values are saved to backend, not just backend defaults
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

        // ✅ NEW: Save quantity inputs for proper loading in edit mode
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
        // location: state.location,
        useSmallAltPricingWeekly: state.useSmallAltPricingWeekly,
        useBigAccountTenWeekly: state.useBigAccountTenWeekly,
        isAllInclusive: state.isAllInclusive,
        chargeGreaseTrapInstall: state.chargeGreaseTrapInstall,
        needsPlumbing: state.needsPlumbing,

        // Red/Green Line pricing data (weekly pricing)
        perVisitBase: quote.weeklyService,  // Weekly service total
        perVisit: quote.weeklyTotal,  // Weekly total including all charges
        minimumChargePerVisit: quote.minimumChargePerVisit,  // Minimum threshold

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
        // location: {
        //   isDisplay: true,
        //   orderNo: FIELD_ORDER.location,
        //   label: "Location",
        //   type: "text" as const,
        //   value: state.location === "insideBeltway" ? "Inside Beltway" : "Outside Beltway",
        // },

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

      // Only update if data actually changed
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

  // Availability for alt options - ✅ USE DYNAMIC BACKEND CONFIG
  const dynamicMinimumDrains = backendConfig?.volumePricing?.minimumDrains ?? cfg.volumePricing.minimumDrains;
  const isWeekly = state.frequency === "weekly";
  const isVolume = state.standardDrainCount >= dynamicMinimumDrains; // ✅ DYNAMIC from backend

  // Small alt only for weekly, <10 drains
  const canUseSmallAlt =
    isWeekly && state.standardDrainCount > 0 && !isVolume;

  // Big account 10$/drain allowed for ANY frequency when 10+ drains
  const canUseBigAlt = isVolume;

  const isInstallLevelUi =
    isVolume && !state.useBigAccountTenWeekly && !state.isAllInclusive;

  const handleNumberChange =
    (field: keyof FoamingDrainFormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const num = raw === "" ? 0 : Number(raw);
      const safe = Number.isFinite(num) && num >= 0 ? num : 0;

      // Special logic for standard drains to auto-clear invalid alt checkboxes
      if (field === "standardDrainCount") {
        const newCount = safe;
        const newIsVolume =
          newCount >= dynamicMinimumDrains; // ✅ USE DYNAMIC from backend
        const newCanSmallAlt =
          state.frequency === "weekly" &&
          newCount > 0 &&
          !newIsVolume;

        updateField("standardDrainCount", newCount);

        // If small-alt selection no longer valid, clear it
        if (!newCanSmallAlt && state.useSmallAltPricingWeekly) {
          updateField("useSmallAltPricingWeekly", false);
        }

        // Big account is allowed for any frequency as long as 10+ drains,
        // so no need to auto-clear it here.

        return;
      }

      updateField(field, safe);
    };

  const handleFrequencyChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newFreq = e.target.value as FoamingDrainFrequency;
    updateField("frequency", newFreq);

    // Small-alt only meaningful for weekly; big-account works for any frequency
    if (newFreq !== "weekly") {
      // Leaving weekly: turn off only the small alt
      updateField("useSmallAltPricingWeekly", false);
    } else {
      // If we come back to weekly, revalidate small-alt with current count
      const count = state.standardDrainCount;
      const newIsVolume =
        count >= dynamicMinimumDrains; // ✅ USE DYNAMIC from backend
      const newCanSmallAlt = count > 0 && !newIsVolume;

      if (!newCanSmallAlt && state.useSmallAltPricingWeekly) {
        updateField("useSmallAltPricingWeekly", false);
      }
    }
  };

  // ✅ UPDATED: Separate handler for install frequency changes (weekly/bimonthly)
  const handleInstallFrequencyChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newInstallFreq = e.target.value as "weekly" | "bimonthly";
    console.log(`🔧 [Foaming Drain] Install frequency changed from ${state.installFrequency} to ${newInstallFreq}`);
    updateField("installFrequency", newInstallFreq);
  };

  // ✅ REMOVED: Old frequency validation - no longer needed with separate install frequency field

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

  // --------- Calc-line numbers: qty @ rate = total ---------

  // Standard drains: show only the drains that are billed as "standard"
  // If 12 total drains and 3 are install drains → show 9 here.
  const stdServiceQty = state.isAllInclusive
    ? 0
    : isInstallLevelUi
    ? Math.max(state.standardDrainCount - state.installDrainCount, 0)
    : state.standardDrainCount;

  const stdQty = stdServiceQty;
  const stdTotal = breakdown.weeklyStandardDrains;

  // Use the count that's visible in the input field
  const stdQtyForRateCalc = isInstallLevelUi
    ? Math.max(state.standardDrainCount - state.installDrainCount, 0)
    : state.standardDrainCount;

  // ✅ FIXED: Calculate rate for display
  // When all-inclusive: show the base rate even though total is $0
  // Otherwise: calculate from actual pricing
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

  // Pricing model label - ✅ DYNAMIC from current form state (updates in real-time when editing)
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

  // NEW: install-program calc line (qty @ rate = total)
  const installQty = isInstallLevelUi ? state.installDrainCount : 0;
  const installTotal = breakdown.weeklyInstallDrains;
  const installRate =
    installQty > 0
      ? installTotal / installQty
      : isInstallLevelUi
      ? state.installFrequency === "bimonthly"  // ✅ FIXED: Use installFrequency and form values
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

        {/* Custom fields manager - appears at the top */}
        <CustomFieldManager
          fields={customFields}
          onFieldsChange={setCustomFields}
          showAddDropdown={showAddDropdown}
          onToggleAddDropdown={setShowAddDropdown}
        />

        {/* Frequency */}
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



        {/* How many filthy install drains (for 3× install) */}
        {/* {state.facilityCondition === "filthy" && isInstallLevelUi && (
          <div className="svc-row">
            <div className="svc-label">
              <span>Filthy Install (3×)</span>
            </div>
            <div className="svc-field">
              <input
                type="number"
                min="0"
                className="svc-in field-rate"
                value={state.filthyDrainCount || ""}
                onChange={handleNumberChange("filthyDrainCount")}
              />{" "}
              <span className="svc-note">
                leave 0 = all install drains filthy
              </span>
            </div>
          </div>
        )} */}

        {/* Location / trip */}
        {/* <div className="svc-row">
          <div className="svc-label">
            <span>Location</span>
          </div>
          <div className="svc-field">
            <select
              className="svc-in"
              value={state.location}
              onChange={handleLocationChange}
            >
              <option value="standard">Standard</option>
              <option value="beltway">Inside Beltway</option>
            </select>
          </div>
        </div> */}

        {/* Extras */}
        <div className="svc-row">
          <div className="svc-label">
            <span>Extras</span>
          </div>
          <div className="svc-field">
            <div className="svc-inline">
              {/* Plumbing */}
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

        {/* Alt pricing options (two checkboxes) */}
        <div className="svc-row">
          <div className="svc-label" />
          <div className="svc-field">
            <div className="svc-inline">
              {/* Small-job alternative */}
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
              {/* Big-account alternative */}
              <label>
                <input
                  type="checkbox"
                  disabled={!canUseBigAlt}
                  checked={state.useBigAccountTenWeekly && canUseBigAlt}
                  onChange={(e) => {
                    const checked = e.target.checked && canUseBigAlt;
                    updateField("useBigAccountTenWeekly", checked);
                    // Clear small alt when enabling big account
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

        {/* All-inclusive */}
        {/* <div className="svc-row">
          <div className="svc-label" />
          <div className="svc-field">
            <label>
              <input
                type="checkbox"
                checked={state.isAllInclusive}
                onChange={(e) =>
                  updateField("isAllInclusive", e.target.checked)
                }
              />{" "}
              All-Inclusive (drains included, trip waived)
            </label>
          </div>
        </div> */}

        {/* Optional grease trap install */}
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

        {/* CALC BREAKDOWN: MAIN INPUT AREA */}
        <div className="svc-summary">
          {/* Standard drains */}
          <div className="svc-row">
            <div className="svc-label">
              <span>Standard Drains</span>
            </div>
            <div className="svc-field">
              <div className="svc-inline">
                {/* QTY = ALWAYS show actual standardDrainCount for input */}
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
                {/* RATE = Shows effective rate based on active pricing model */}
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
                {/* TOTAL = Shows calculated total (0 when all-inclusive) */}
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

          {/* Drains for Install (10+) – now a calc line */}
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
              key="install-frequency-select" // ✅ Ensure stable identity
            >
              {/* ✅ UPDATED: Install frequency supports Weekly and Bimonthly per backend config */}
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
                  {/* QTY = INPUT (how many drains go into install program) */}
                  <input
                    type="number"
            min="0"
                    min={0}
                    max={state.standardDrainCount}
                    className="svc-in field-qty"
                    className="svc-in field-qty"
                    value={state.installDrainCount || ""}
                    onChange={handleNumberChange("installDrainCount")}
                  />
                  <span>@</span>
                  {/* RATE depends on frequency: weekly/bimonthly - EDITABLE */}
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
                  {/* TOTAL weekly cost for install drains */}
                  <input
                    readOnly
                    className="svc-in field-qty"
                    
                    value={formatAmount(installTotal)}
                  />
                  {/* <span className="svc-note" style={{ marginLeft: 4 }}>
                    of {state.standardDrainCount || 0} standard drains
                  </span> */}
                </div>
              </div>
            </div>
            </div>
          )}

          {/* Grease traps */}
          <div className="svc-row">
            <div className="svc-label">
              <span>Grease Traps</span>
            </div>
            <div className="svc-field">
              <div className="svc-inline">
                {/* QTY */}
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
                {/* RATE - EDITABLE */}
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
                {/* TOTAL */}
                <input
                  readOnly
                  className="svc-in field-qty"
                  
                  value={formatAmount(greaseTotal)}
                />
              </div>
            </div>
          </div>

          {/* Green drains */}
          <div className="svc-row">
            <div className="svc-label">
              <span>Green Drains</span>
            </div>
            <div className="svc-field">
              <div className="svc-inline">
                {/* QTY */}
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
                {/* RATE - EDITABLE */}
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
                {/* TOTAL */}
                <input
                  readOnly
                  className="svc-in field-qty"
                  
                  value={formatAmount(greenTotal)}
                />
              </div>
            </div>
          </div>

          {/* Extra Plumbing Work - calc breakdown */}
          {state.needsPlumbing && state.plumbingDrainCount > 0 && (
            <div className="svc-row">
              <div className="svc-label">
                <span>Extra Plumbing Work</span>
              </div>
              <div className="svc-field">
                <div className="svc-inline">
                  {/* QTY */}
                  <input
                    readOnly
                    type="number"
                    min="0"
                    className="svc-in field-qty"
                    value={state.plumbingDrainCount}
                  />
                  <span>@</span>
                  {/* RATE - shows from state */}
                  <input
                    readOnly
                    type="number"
                    min="0"
                    step={1}
                    className="svc-in field-rate"
                    value={effectivePlumbingRate}
                  />
                  <span>=</span>
                  {/* TOTAL - calculated */}
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

        {/* SUMMARY / RESULTS */}
        <div className="svc-summary">

          {/* Facility condition */}
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

          {/* Filthy Multiplier - Only show when filthy condition */}
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


          {/* Installation total */}
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
          {/* Weekly per visit */}
          {/* <div className="svc-row">
            <div className="svc-label">
              <span>Weekly Subtotal</span>
            </div>
            <div className="svc-field svc-dollar">
              <span>$</span>
              <input
                readOnly
                className="svc-in field-qty"
                value={formatAmount(quote.weeklyService)}
              />
            </div>
          </div> */}

          {/* Trip charge (locked to 0, display only) */}
          {/* <div className="svc-row">
            <div className="svc-label">
              <span>Trip Charge</span>
            </div>
            <div className="svc-field svc-dollar">
              <span>$</span>
              <input
                className="svc-in field-qty"
                type="number"
            min="0"
                value={tripInputValue}
                readOnly
              />
            </div>
          </div> */}

          {/* First Visit Total - Show for ALL frequencies except oneTime */}
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

          {/* Per Visit Total */}
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

          {/* Redline/Greenline Pricing Indicator */}
          {(state.standardDrainCount > 0 || state.filthyDrainCount > 0 || state.greaseTrapCount > 0 || state.greenDrainCount > 0 || state.plumbingDrainCount > 0) && (
            <div className="svc-row" style={{ marginTop: '-10px', paddingTop: '5px' }}>
              <div className="svc-label"></div>
              <div className="svc-field">
                {quote.weeklyTotal <= quote.minimumChargePerVisit ? (
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



          {/* Total Price - Show ONLY for oneTime */}
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
                      : quote.firstVisitPrice
                  )}
                  style={{
                    backgroundColor: state.customWeeklyService !== undefined ? '#fffacd' : 'white',
                  }}
                  title="Total price for one-time service"
                />
              </div>
            </div>
          )}


          {/* First month total - HIDE for one-time and visit-based frequencies */}
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

          {/* Normal month (recurring) - HIDE for one-time and visit-based frequencies */}
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



          {/* Combined Contract Total with months dropdown and amount - HIDE for one-time */}
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
                    // For quarterly: show multiples of 3 months only
                    Array.from({ length: 12 }, (_, i) => {
                      const months = (i + 1) * 3; // 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36
                      return (
                        <option key={months} value={months}>
                          {months} mo
                        </option>
                      );
                    })
                  ) : state.frequency === "biannual" ? (
                    // For bi-annual: show multiples of 6 months only
                    Array.from({ length: 6 }, (_, i) => {
                      const months = (i + 1) * 6; // 6, 12, 18, 24, 30, 36
                      return (
                        <option key={months} value={months}>
                          {months} mo
                        </option>
                      );
                    })
                  ) : state.frequency === "annual" ? (
                    // For annual: show multiples of 12 months only
                    Array.from({ length: 3 }, (_, i) => {
                      const months = (i + 1) * 12; // 12, 24, 36
                      return (
                        <option key={months} value={months}>
                          {months} mo
                        </option>
                      );
                    })
                  ) : (
                    // For all other frequencies: show 2-36 months
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
                      width: '120px',
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
            {/* <div className="svc-field">
              <button
                type="button"
                className="svc-mini svc-mini--neg"
                onClick={reset}
              >
                Reset Foaming Drain
              </button>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
};
