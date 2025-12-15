import React, { useEffect, useRef, useState } from "react";
import { useRefreshPowerScrubCalc } from "./useRefreshPowerScrubCalc";
import type {
  RefreshAreaKey,
  RefreshPowerScrubFormState,
} from "./refreshPowerScrubTypes";
import type { ServiceInitialData } from "../common/serviceTypes";
import "./refreshPowerScrub.css";
import { useServicesContextOptional } from "../ServicesContext";
import { CustomFieldManager, type CustomField } from "../CustomFieldManager";

const formatAmount = (n: number): string => n.toFixed(2);

const FREQ_OPTIONS = [
  { value: "oneTime", label: "One Time" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "twicePerMonth", label: "2× / Month" },
  { value: "monthly", label: "Monthly" },
  { value: "bimonthly", label: "Bi-monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "biannual", label: "Bi-annual" },
  { value: "annual", label: "Annual" },
];

const AREA_FREQ_OPTIONS = [
  "",
  "One Time",
  "Weekly",
  "Bi-weekly",
  "2× / Month",
  "Monthly",
  "Bi-monthly",
  "Quarterly",
  "Bi-annual",
  "Annual",
];

const AREA_ORDER: RefreshAreaKey[] = [
  "dumpster",
  "patio",
  // "walkway",
  "foh",
  "boh",
  // "other",
];

const PRICING_TYPES = [
  { value: "preset", label: "Preset Package" },
  { value: "perWorker", label: "Per Worker" },
  { value: "perHour", label: "Per Hour" },
  { value: "squareFeet", label: "Square Feet" },
  { value: "custom", label: "Custom Amount" },
];

export const RefreshPowerScrubForm: React.FC<
  ServiceInitialData<RefreshPowerScrubFormState>
> = ({ initialData, onRemove }) => {
  const {
    form,
    setHourlyRate,
    setMinimumVisit,
    setFrequency,
    setContractMonths,
    setNotes,
    toggleAreaEnabled,
    setAreaField,
    areaTotals,
    areaMonthlyTotals,
    areaContractTotals,
    quote,
    refreshConfig,
    isLoadingConfig,
    backendConfig, // ✅ Get backend config for auto-populated rates
  } = useRefreshPowerScrubCalc(initialData);
  const servicesContext = useServicesContextOptional();

  // Save form data to context for form submission
  const prevDataRef = useRef<string>("");

  const [customFields, setCustomFields] = useState<CustomField[]>(
    initialData?.customFields || []
  );
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  // ✅ Helper functions to get backend rates with fallbacks
  const getWorkerRate = (): number => {
    return backendConfig?.coreRates?.perWorkerRate ?? backendConfig?.coreRates?.defaultHourlyRate ?? 200; // Backend per worker rate
  };

  const getHourRate = (): number => {
    return backendConfig?.coreRates?.perHourRate ?? 400; // Backend per hour rate
  };

  const getInsideRate = (): number => {
    return backendConfig?.squareFootagePricing?.insideRate ?? 0.6;
  };

  const getOutsideRate = (): number => {
    return backendConfig?.squareFootagePricing?.outsideRate ?? 0.4;
  };

  const getFixedFee = (): number => {
    return backendConfig?.squareFootagePricing?.fixedFee ?? 200;
  };

  // ✅ Backend-driven preset pricing (replaces static imports)
  const getPatioStandalone = (): number => {
    return backendConfig?.areaSpecificPricing?.patio?.standalone ?? 800;
  };

  const getPatioUpsell = (): number => {
    return backendConfig?.areaSpecificPricing?.patio?.upsell ?? 500;
  };

  const getFohRate = (): number => {
    return backendConfig?.areaSpecificPricing?.frontOfHouse ?? 2500;
  };

  const getKitchenSmallMed = (): number => {
    return backendConfig?.areaSpecificPricing?.kitchen?.smallMedium ?? 1500;
  };

  const getKitchenLarge = (): number => {
    return backendConfig?.areaSpecificPricing?.kitchen?.large ?? 2500;
  };

  useEffect(() => {
    if (servicesContext) {
      const isActive = AREA_ORDER.some(key => form[key]?.enabled);

      const data = isActive ? {
        serviceId: "refreshPowerScrub",
        displayName: "Refresh Power Scrub",
        isActive: true,

        // Global service information
        serviceInfo: {
          isDisplay: true,
          label: "Service Type",
          type: "text" as const,
          value: `Hourly Rate: $${form.hourlyRate}/hr | Minimum: $${form.minimumVisit}`,
        },

        // Services object with new structure
        services: AREA_ORDER
          .filter(key => form[key]?.enabled)
          .reduce((acc, key) => {
            const area = form[key];
            const areaName = key === 'foh' ? 'frontHouse' : key === 'boh' ? 'backHouse' : key;

            // Get pricing method display name
            const pricingMethodNames = {
              'perHour': 'Per Hour',
              'perWorker': 'Per Worker',
              'squareFeet': 'Square Feet',
              'preset': 'Preset Package',
              'custom': 'Custom Amount'
            };

            // Calculate monthly and contract based on frequency
            const getFrequencyMultiplier = (freq: string) => {
              switch (freq?.toLowerCase()) {
                case "one time": return 0;
                case "weekly": return 4.33;
                case "bi-weekly": return 2.165;
                case "2× / month": return 2.0;
                case "monthly": return 1;
                case "bi-monthly": return 0.5;
                case "quarterly": return 0.333;
                case "bi-annual": return 0.167;
                case "annual": return 0.083;
                default: return 1;
              }
            };

            const multiplier = getFrequencyMultiplier(area.frequencyLabel);
            const monthlyAmount = areaTotals[key] * multiplier;

            // Calculate contract amount based on frequency type
            let contractAmount: number;
            const freqLower = area.frequencyLabel?.toLowerCase();

            if (freqLower === "quarterly") {
              // Quarterly: visits = months / 3
              const quarterlyVisits = (area.contractMonths || 12) / 3;
              contractAmount = areaTotals[key] * quarterlyVisits;
            } else if (freqLower === "bi-annual") {
              // Bi-annual: visits = months / 6
              const biannualVisits = (area.contractMonths || 12) / 6;
              contractAmount = areaTotals[key] * biannualVisits;
            } else if (freqLower === "annual") {
              // Annual: visits = months / 12
              const annualVisits = (area.contractMonths || 12) / 12;
              contractAmount = areaTotals[key] * annualVisits;
            } else {
              // All other frequencies: monthly amount × months
              contractAmount = monthlyAmount * (area.contractMonths || 12);
            }

            // Base service structure
            const serviceData: any = {
              enabled: true,
              pricingMethod: {
                isDisplay: true,
                value: pricingMethodNames[area.pricingType] || area.pricingType,
                type: "text"
              }
            };

            // Add pricing-specific fields
            if (area.pricingType === 'perHour') {
              serviceData.hours = {
                isDisplay: true,
                quantity: area.hours || 0,
                priceRate: area.hourlyRate,
                total: (area.hours || 0) * area.hourlyRate,
                type: "calc"
              };
            } else if (area.pricingType === 'perWorker') {
              serviceData.workersCalc = {
                isDisplay: true,
                quantity: area.workers || 0,
                priceRate: area.workerRate,
                total: (area.workers || 0) * area.workerRate,
                type: "calc"
              };
            } else if (area.pricingType === 'squareFeet') {
              serviceData.fixedFee = {
                isDisplay: true,
                value: area.sqFtFixedFee,
                type: "text"
              };
              serviceData.insideSqft = {
                isDisplay: true,
                quantity: area.insideSqFt || 0,
                priceRate: area.insideRate,
                total: (area.insideSqFt || 0) * area.insideRate,
                type: "calc"
              };
              serviceData.outsideSqft = {
                isDisplay: true,
                quantity: area.outsideSqFt || 0,
                priceRate: area.outsideRate,
                total: (area.outsideSqFt || 0) * area.outsideRate,
                type: "calc"
              };
            } else if (area.pricingType === 'preset') {
              if (key === 'patio') {
                console.log(`🔄 [Patio SAVE DEBUG] Patio area state:`, JSON.stringify(area, null, 2));
                serviceData.plan = {
                  isDisplay: true,
                  value: area.patioMode === 'upsell' ? 'Upsell' : 'Standalone',
                  type: "text"
                };
                // ✅ NEW: Save the patio add-on selection
                serviceData.includePatioAddon = {
                  isDisplay: true,
                  value: area.includePatioAddon || false,
                  type: "boolean"
                };
                console.log(`🔄 [Patio SAVE DEBUG] Saving includePatioAddon:`, serviceData.includePatioAddon);
              } else if (key === 'boh') {
                serviceData.plan = {
                  isDisplay: true,
                  value: area.kitchenSize === 'large' ? 'Large' : 'Small/Medium',
                  type: "text"
                };
              }
            }

            // Common fields for all pricing types
            serviceData.frequency = {
              isDisplay: true,
              value: area.frequencyLabel || 'TBD',
              type: "text"
            };
            serviceData.total = {
              isDisplay: true,
              value: areaTotals[key],
              type: "calc"
            };
            serviceData.monthly = {
              isDisplay: true,
              quantity: multiplier,
              priceRate: areaTotals[key],
              total: monthlyAmount,
              type: "calc"
            };
            serviceData.contract = {
              isDisplay: true,
              quantity: area.contractMonths || 12,
              priceRate: monthlyAmount,
              total: contractAmount,
              type: "calc"
            };

            acc[areaName] = serviceData;
            return acc;
          }, {} as Record<string, any>),

        totals: {
          perVisit: {
            isDisplay: true,
            label: "Total Per Visit",
            type: "dollar" as const,
            amount: parseFloat(quote.perVisitPrice.toFixed(2)),
          },
        },

        notes: form.notes || "",
        customFields: customFields,
      } : null;

      console.log(`🔄 [SAVE CONTEXT DEBUG] Final services context data:`, JSON.stringify(data, null, 2));

      const dataStr = JSON.stringify(data);

      if (dataStr !== prevDataRef.current) {
        prevDataRef.current = dataStr;
        servicesContext.updateService("refreshPowerScrub", data);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, areaTotals, quote, customFields]);

  // For each column, show the default rule price so the user
  // knows the starting point even before typing anything.
  const getPresetAmount = (areaKey: RefreshAreaKey): number => {
    switch (areaKey) {
      case "dumpster":
        // Default is the minimum visit (e.g. $475)
        return form.minimumVisit;

      case "patio":
        return form.patio.patioMode === "upsell"
          ? getPatioUpsell()
          : getPatioStandalone();

      case "foh":
        return getFohRate();

      case "boh":
        return form.boh.kitchenSize === "large"
          ? getKitchenLarge()
          : getKitchenSmallMed();

      case "walkway":
      case "other":
      default:
        // These are usually custom – no fixed preset
        return 0;
    }
  };

  const renderConditionalFields = (areaKey: RefreshAreaKey) => {
    const area = form[areaKey];
    if (!area.enabled) return null;

    switch (area.pricingType) {
      case "preset":
        // Show preset-specific options (patio mode, kitchen size)
        return (
          <div className="rps-inline">
            {areaKey === "patio" && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{
                  padding: '8px',
                  backgroundColor: '#f0f8ff',
                  borderRadius: '4px',
                  border: '1px solid #ccc'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                    Patio Service (Base)
                  </div>
                  <div className="rps-inline" style={{ marginBottom: '6px' }}>
                    <span>$</span>
                    <input
                      className="rps-line rps-num"
                      type="number"
                      step="0.01"
                      value={area.customAmount > 0 ? area.customAmount : getPatioStandalone()}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        setAreaField(areaKey, "customAmount", value.toString());
                      }}
                      style={{
                        width: '80px',
                        backgroundColor: area.customAmount > 0 ? '#fffacd' : 'white'
                      }}
                      title={`Patio base price - editable (default: $${getPatioStandalone()})`}
                    />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={area.includePatioAddon}
                      onChange={(e) => setAreaField(areaKey, "includePatioAddon", e.target.checked)}
                    />
                    <span>Add-on Service: +$</span>
                    <input
                      className="rps-line rps-num"
                      type="number"
                      step="0.01"
                      value={getPatioUpsell()}
                      onChange={() => {}} // For now keep static, can be made editable later if needed
                      disabled
                      style={{ width: '60px', backgroundColor: '#f5f5f5' }}
                      title="Add-on service price"
                    />
                  </label>
                  <div style={{
                    marginTop: '6px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: '#0066cc'
                  }}>
                    Total: ${(area.customAmount > 0 ? area.customAmount : getPatioStandalone()) + (area.includePatioAddon ? getPatioUpsell() : 0)}
                  </div>
                </div>
              </div>
            )}
            {areaKey === "boh" && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <select
                  className="rps-line"
                  value={area.kitchenSize}
                  onChange={(e) => setAreaField(areaKey, "kitchenSize", e.target.value)}
                  style={{ width: '160px' }}
                >
                  <option value="smallMedium">Small/Medium Kitchen</option>
                  <option value="large">Large Kitchen</option>
                </select>
                <div className="rps-inline">
                  <span className="rps-label">Price:</span>
                  <span>$</span>
                  <input
                    className="rps-line rps-num"
                    type="number"
                    step="0.01"
                    value={area.customAmount > 0 ? area.customAmount : (area.kitchenSize === "large" ? getKitchenLarge() : getKitchenSmallMed())}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      setAreaField(areaKey, "customAmount", value.toString());
                    }}
                    style={{
                      width: '100px',
                      backgroundColor: area.customAmount > 0 ? '#fffacd' : 'white'
                    }}
                    title={`Kitchen price - editable (default: $${area.kitchenSize === "large" ? getKitchenLarge() : getKitchenSmallMed()})`}
                  />
                </div>
              </div>
            )}
            {areaKey !== "patio" && areaKey !== "boh" && (
              <div className="rps-inline">
                <span className="rps-label">Price:</span>
                <span>$</span>
                <input
                  className="rps-line rps-num"
                  type="number"
                  step="0.01"
                  value={area.customAmount > 0 ? area.customAmount : getPresetAmount(areaKey)}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    setAreaField(areaKey, "customAmount", value.toString());
                  }}
                  style={{
                    width: '100px',
                    backgroundColor: area.customAmount > 0 ? '#fffacd' : 'white'
                  }}
                  title={`Preset package price - editable (default: $${formatAmount(getPresetAmount(areaKey))})`}
                />
              </div>
            )}
          </div>
        );

      case "perWorker":
        return (
          <div className="rps-inline">
            <span className="rps-label">Workers</span>
            <input
              className="rps-line rps-num"
              type="number"
              value={area.workers}
              onChange={(e) => setAreaField(areaKey, "workers", e.target.value)}
              style={{ width: '60px' }}
            />
            <span>@</span>
            <input
              className="rps-line rps-num"
              type="number"
              step="0.01"
              value={area.workerRate}
              onChange={(e) => setAreaField(areaKey, "workerRate", e.target.value)}
              style={{ width: '80px' }}
              title="Per worker rate - editable"
            />
            <span className="rps-label">= ${formatAmount((area.workers || 0) * area.workerRate)}</span>
          </div>
        );

      case "perHour":
        return (
          <div className="rps-inline">
            <span className="rps-label">Hours</span>
            <input
              className="rps-line rps-num"
              type="number"
              value={area.hours}
              onChange={(e) => setAreaField(areaKey, "hours", e.target.value)}
              style={{ width: '60px' }}
            />
            <span>@</span>
            <input
              className="rps-line rps-num"
              type="number"
              step="0.01"
              value={area.hourlyRate}
              onChange={(e) => setAreaField(areaKey, "hourlyRate", e.target.value)}
              style={{ width: '80px' }}
              title="Per hour rate - editable"
            />
            <span className="rps-label">= ${formatAmount((area.hours || 0) * area.hourlyRate)}</span>
          </div>
        );

      case "squareFeet":
        return (
          <>
            <div className="rps-inline">
              <span className="rps-label">Fixed:</span>
              <span>$</span>
              <input
                className="rps-line rps-num"
                type="number"
                step="0.01"
                value={area.sqFtFixedFee}
                onChange={(e) => setAreaField(areaKey, "sqFtFixedFee", e.target.value)}
                style={{ width: '80px' }}
                title="Fixed fee - editable"
              />
            </div>
            <div className="rps-inline" style={{ marginTop: '4px' }}>
              <span className="rps-label">Inside</span>
              <input
                className="rps-line rps-num"
                type="number"
                value={area.insideSqFt}
                onChange={(e) => setAreaField(areaKey, "insideSqFt", e.target.value)}
                style={{ width: '80px' }}
              />
              <span>@</span>
              <input
                className="rps-line rps-num"
                type="number"
                step="0.01"
                value={area.insideRate}
                onChange={(e) => setAreaField(areaKey, "insideRate", e.target.value)}
                style={{ width: '60px' }}
                title="Inside rate - editable"
              />
              <span>= ${formatAmount((area.insideSqFt || 0) * area.insideRate)}</span>
            </div>
            <div className="rps-inline" style={{ marginTop: '4px' }}>
              <span className="rps-label">Outside</span>
              <input
                className="rps-line rps-num"
                type="number"
                value={area.outsideSqFt}
                onChange={(e) => setAreaField(areaKey, "outsideSqFt", e.target.value)}
                style={{ width: '80px' }}
              />
              <span>@</span>
              <input
                className="rps-line rps-num"
                type="number"
                step="0.01"
                value={area.outsideRate}
                onChange={(e) => setAreaField(areaKey, "outsideRate", e.target.value)}
                style={{ width: '60px' }}
                title="Outside rate - editable"
              />
              <span>= ${formatAmount((area.outsideSqFt || 0) * area.outsideRate)}</span>
            </div>
          </>
        );

      case "custom":
        return (
          <div className="rps-inline">
            <span className="rps-label">$</span>
            <input
              className="rps-line rps-num"
              type="number"
              value={area.customAmount}
              onChange={(e) => setAreaField(areaKey, "customAmount", e.target.value)}
              style={{ width: '100px' }}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="svc-card svc-card-wide refresh-rps">
      <div className="svc-h-row">
        <div className="svc-h">REFRESH POWER SCRUB</div>
        <div className="svc-h-actions">
          <button
            type="button"
            className="svc-mini"
            onClick={refreshConfig}
            disabled={isLoadingConfig}
            title={isLoadingConfig ? "Loading config..." : "Refresh pricing config from backend"}
          >
            {isLoadingConfig ? "..." : "⟳"}
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

      {/* Global rule controls */}
      <div className="rps-config-row">
        <div className="rps-inline">
          <span className="rps-label">Hourly Rate</span>
          <span>$</span>
          <input
            type="number"
            className="rps-line rps-num"
            value={form.hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
          />
          <span>/hr/worker</span>
        </div>
        <div className="rps-inline">
          <span className="rps-label">Minimum Visit</span>
          <span>$</span>
          <input
            type="number"
            className="rps-line rps-num"
            value={form.minimumVisit}
            onChange={(e) => setMinimumVisit(e.target.value)}
          />
        </div>
      </div>

      <div className="rps-wrap rps-wrap-full">
        <div className="rps-grid rps-full">
          {/* Header row – Service names + pricing type dropdown */}
          <div className="rps-header-row">
            {AREA_ORDER.map((areaKey) => (
              <div key={`head-${areaKey}`} className="rps-column">
                <label className="rps-area-header">
                  <input
                    type="checkbox"
                    checked={form[areaKey].enabled}
                    onChange={(e) =>
                      toggleAreaEnabled(areaKey, e.target.checked)
                    }
                  />
                  <span className="rps-label-strong">
                    {areaKey === "dumpster"
                      ? "DUMPSTER"
                      : areaKey === "patio"
                      ? "PATIO"
                      : areaKey === "walkway"
                      ? "WALKWAY"
                      : areaKey === "foh"
                      ? "FRONT HOUSE"
                      : areaKey === "boh"
                      ? "BACK HOUSE"
                      : "OTHER"}
                  </span>
                </label>
                <div className="rps-inline" style={{ marginTop: '8px' }}>
                  <select
                    className="rps-line"
                    value={form[areaKey].pricingType}
                    onChange={(e) => setAreaField(areaKey, "pricingType", e.target.value)}
                    disabled={!form[areaKey].enabled}
                    style={{ width: '140px' }}
                  >
                    {PRICING_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          {/* Content row – Conditional calculation fields + frequency + total */}
          <div className="rps-content-row">
            {AREA_ORDER.map((areaKey) => (
              <div key={`calc-${areaKey}`} className="rps-column">
                {renderConditionalFields(areaKey)}

                {form[areaKey].enabled && (
                  <>
                    <div className="rps-inline" style={{ marginTop: '8px' }}>
                      <span className="rps-label">Freq</span>
                      <select
                        className="rps-line"
                        value={form[areaKey].frequencyLabel}
                        onChange={(e) => setAreaField(areaKey, "frequencyLabel", e.target.value)}
                        style={{ width: '100px' }}
                      >
                        {AREA_FREQ_OPTIONS.map((freq) => (
                          <option key={freq} value={freq}>
                            {freq || "Select..."}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* For OneTime frequency, show "Total Visit" instead of regular Total + Monthly */}
                    {form[areaKey].frequencyLabel?.toLowerCase() === "one time" ? (
                      <div className="rps-inline" style={{ marginTop: '8px' }}>
                        <span className="rps-label" style={{ color: '#0066cc', fontWeight: 'bold' }}>
                          Total Visit: ${formatAmount(areaTotals[areaKey])}
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="rps-inline" style={{ marginTop: '8px' }}>
                          <span className="rps-label">Total: ${formatAmount(areaTotals[areaKey])}</span>
                        </div>

                        {/* Monthly Total – HIDE for visit-based frequencies (Quarterly, Bi-annual, Annual) */}
                        {form[areaKey].frequencyLabel?.toLowerCase() !== "quarterly" &&
                         form[areaKey].frequencyLabel?.toLowerCase() !== "bi-annual" &&
                         form[areaKey].frequencyLabel?.toLowerCase() !== "annual" && (
                          <div className="rps-inline" style={{ marginTop: '8px' }}>
                            <span className="rps-label">Monthly: ${formatAmount(areaMonthlyTotals[areaKey])}</span>
                          </div>
                        )}
                      </>
                    )}

                    {/* Hide Contract for OneTime frequency */}
                    {form[areaKey].frequencyLabel?.toLowerCase() !== "one time" && (
                      <div className="rps-inline" style={{ marginTop: '8px' }}>
                        <span className="rps-label">Contract:</span>
                        <select
                          className="rps-line"
                          style={{ width: '60px', marginLeft: '4px', marginRight: '4px' }}
                          value={form[areaKey].contractMonths}
                          onChange={(e) => setAreaField(areaKey, "contractMonths", e.target.value)}
                        >
                          {form[areaKey].frequencyLabel?.toLowerCase() === "quarterly" ? (
                            // For quarterly: show multiples of 3 months only
                            Array.from({ length: 12 }, (_, i) => {
                              const months = (i + 1) * 3; // 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36
                              return (
                                <option key={months} value={months}>
                                  {months} mo
                                </option>
                              );
                            })
                          ) : form[areaKey].frequencyLabel?.toLowerCase() === "bi-annual" ? (
                            // For bi-annual: show multiples of 6 months only
                            Array.from({ length: 6 }, (_, i) => {
                              const months = (i + 1) * 6; // 6, 12, 18, 24, 30, 36
                              return (
                                <option key={months} value={months}>
                                  {months} mo
                                </option>
                              );
                            })
                          ) : form[areaKey].frequencyLabel?.toLowerCase() === "annual" ? (
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
                            Array.from({ length: 35 }, (_, i) => {
                              const months = i + 2; // 2 to 36 months
                              return (
                                <option key={months} value={months}>
                                  {months} mo
                                </option>
                              );
                            })
                          )}
                        </select>
                        <span className="rps-label">${formatAmount(areaContractTotals[areaKey])}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="rps-config-row" style={{ marginTop: '16px', borderTop: '2px solid #ccc', paddingTop: '16px' }}>
        <div className="rps-inline">
          <span className="rps-label-strong">TOTAL PER VISIT: ${formatAmount(quote.perVisitPrice)}</span>
        </div>
      </div>

      {/* Frequency Selection */}
      {/* <div className="rps-config-row" style={{ marginTop: '16px' }}>
        <div className="rps-inline">
          <span className="rps-label">Frequency:</span>
          <select
            className="rps-line"
            value={form.frequency}
            onChange={(e) => setFrequency(e.target.value)}
            style={{ width: '120px', marginLeft: '8px' }}
          >
            {FREQ_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div> */}

      {/* Monthly Total – HIDE for Quarterly */}
      {/* {form.frequency !== "quarterly" && (
        <div className="rps-config-row">
          <div className="rps-inline">
            <span className="rps-label">Monthly Total: ${formatAmount(quote.monthlyRecurring)}</span>
          </div>
        </div>
      )} */}

      {/* Combined Contract Total with months dropdown and amount */}
      {/* <div className="rps-config-row">
        <div className="rps-inline">
          <span className="rps-label">Contract Total:</span>
          <select
            className="rps-line"
            style={{ width: '80px', marginLeft: '8px', marginRight: '8px' }}
            value={form.contractMonths}
            onChange={(e) => setContractMonths(Number(e.target.value))}
          >
            {form.frequency === "quarterly" ? (
              // For quarterly: show multiples of 3 months (3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36)
              Array.from({ length: 12 }, (_, i) => {
                const months = (i + 1) * 3; // 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36
                return (
                  <option key={months} value={months}>
                    {months} mo
                  </option>
                );
              })
            ) : (
              // For all other frequencies: show 2-36 months
              Array.from({ length: 35 }, (_, i) => {
                const months = i + 2; // 2 to 36 months
                return (
                  <option key={months} value={months}>
                    {months} mo
                  </option>
                );
              })
            )}
          </select>
          <span className="rps-label" style={{ marginRight: '4px' }}>$</span>
          <span className="rps-label-strong">{formatAmount(quote.contractTotal)}</span>
        </div>
      </div> */}

      {/* Notes */}
      {/* <div className="rps-config-row" style={{ marginTop: '16px' }}>
        <div className="rps-inline">
          <span className="rps-label">Notes</span>
          <textarea
            className="rps-line"
            style={{ width: '100%', minHeight: '60px' }}
            value={form.notes || ""}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes..."
          />
        </div>
      </div> */}
    </div>
  );
};