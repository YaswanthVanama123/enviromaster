import React, { useEffect, useRef, useState } from "react";
import { useRefreshPowerScrubCalc } from "./useRefreshPowerScrubCalc";
import type {
  RefreshAreaKey,
  RefreshPowerScrubFormState,
} from "./refreshPowerScrubTypes";
import type { ServiceInitialData } from "../common/serviceTypes";
import {
  REFRESH_FOH_RATE,
  REFRESH_KITCHEN_LARGE,
  REFRESH_KITCHEN_SMALL_MED,
  REFRESH_PATIO_STANDALONE,
  REFRESH_PATIO_UPSELL,
} from "./refreshPowerScrubConfig";
import "./refreshPowerScrub.css";
import { useServicesContextOptional } from "../ServicesContext";
import { CustomFieldManager, type CustomField } from "../CustomFieldManager";

const formatAmount = (n: number): string => n.toFixed(2);

const FREQ_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "bimonthly", label: "Bi-monthly" },
  { value: "quarterly", label: "Quarterly" },
];

const AREA_FREQ_OPTIONS = [
  "",
  "Weekly",
  "Bi-weekly",
  "Monthly",
  "Quarterly",
  "One-time",
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

  useEffect(() => {
    if (servicesContext) {
      const isActive = AREA_ORDER.some(key => form[key]?.enabled);

      const data = isActive ? {
        serviceId: "refreshPowerScrub",
        displayName: "Refresh Power Scrub",
        isActive: true,

        // Global service information
        serviceInfo: {
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
                case "weekly": return 4.33;
                case "bi-weekly": return 2.165;
                case "monthly": return 1;
                case "quarterly": return 0.333;
                default: return 1;
              }
            };

            const multiplier = getFrequencyMultiplier(area.frequencyLabel);
            const monthlyAmount = areaTotals[key] * multiplier;
            const contractAmount = area.frequencyLabel?.toLowerCase() === "quarterly"
              ? areaTotals[key] * ((area.contractMonths || 12) / 3)
              : monthlyAmount * (area.contractMonths || 12);

            // Base service structure
            const serviceData: any = {
              enabled: true,
              pricingMethod: {
                value: pricingMethodNames[area.pricingType] || area.pricingType,
                type: "text"
              }
            };

            // Add pricing-specific fields
            if (area.pricingType === 'perHour') {
              serviceData.hours = {
                quantity: area.hours || 0,
                priceRate: getHourRate(),
                total: (area.hours || 0) * getHourRate(),
                type: "calc"
              };
            } else if (area.pricingType === 'perWorker') {
              serviceData.workersCalc = {
                quantity: area.workers || 0,
                priceRate: getWorkerRate(),
                total: (area.workers || 0) * getWorkerRate(),
                type: "calc"
              };
            } else if (area.pricingType === 'squareFeet') {
              serviceData.fixedFee = {
                value: getFixedFee(),
                type: "text"
              };
              serviceData.insideSqft = {
                quantity: area.insideSqFt || 0,
                priceRate: getInsideRate(),
                total: (area.insideSqFt || 0) * getInsideRate(),
                type: "calc"
              };
              serviceData.outsideSqft = {
                quantity: area.outsideSqFt || 0,
                priceRate: getOutsideRate(),
                total: (area.outsideSqFt || 0) * getOutsideRate(),
                type: "calc"
              };
            } else if (area.pricingType === 'preset') {
              if (key === 'patio') {
                serviceData.plan = {
                  value: area.patioMode === 'upsell' ? 'Upsell' : 'Standalone',
                  type: "text"
                };
              } else if (key === 'boh') {
                serviceData.plan = {
                  value: area.kitchenSize === 'large' ? 'Large' : 'Small/Medium',
                  type: "text"
                };
              }
            }

            // Common fields for all pricing types
            serviceData.frequency = {
              value: area.frequencyLabel || 'TBD',
              type: "text"
            };
            serviceData.total = {
              value: areaTotals[key],
              type: "calc"
            };
            serviceData.monthly = {
              quantity: multiplier,
              priceRate: areaTotals[key],
              total: monthlyAmount,
              type: "calc"
            };
            serviceData.contract = {
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
            label: "Total Per Visit",
            type: "dollar" as const,
            amount: parseFloat(quote.perVisitPrice.toFixed(2)),
          },
        },

        notes: form.notes || "",
        customFields: customFields,
      } : null;

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
          ? REFRESH_PATIO_UPSELL
          : REFRESH_PATIO_STANDALONE;

      case "foh":
        return REFRESH_FOH_RATE;

      case "boh":
        return form.boh.kitchenSize === "large"
          ? REFRESH_KITCHEN_LARGE
          : REFRESH_KITCHEN_SMALL_MED;

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
              <select
                className="rps-line"
                value={area.patioMode}
                onChange={(e) => setAreaField(areaKey, "patioMode", e.target.value)}
                style={{ width: '160px' }}
              >
                <option value="standalone">Standalone (${REFRESH_PATIO_STANDALONE})</option>
                <option value="upsell">Upsell (+${REFRESH_PATIO_UPSELL})</option>
              </select>
            )}
            {areaKey === "boh" && (
              <select
                className="rps-line"
                value={area.kitchenSize}
                onChange={(e) => setAreaField(areaKey, "kitchenSize", e.target.value)}
                style={{ width: '160px' }}
              >
                <option value="smallMedium">Small/Med (${REFRESH_KITCHEN_SMALL_MED})</option>
                <option value="large">Large (${REFRESH_KITCHEN_LARGE})</option>
              </select>
            )}
            {areaKey !== "patio" && areaKey !== "boh" && (
              <span className="rps-label">
                Default: ${formatAmount(getPresetAmount(areaKey))}
              </span>
            )}
          </div>
        );

      case "perWorker":
        return (
          <div className="rps-inline">
            <span className="rps-label">Workers</span>
            <input
              className="rps-line rps-num"
              type="text"
              value={area.workers}
              onChange={(e) => setAreaField(areaKey, "workers", e.target.value)}
              style={{ width: '60px' }}
            />
            <span className="rps-label">@ ${getWorkerRate()}</span>
            <span className="rps-label">= ${formatAmount((area.workers || 0) * getWorkerRate())}</span>
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
            <span className="rps-label">@ ${getHourRate()}</span>
            <span className="rps-label">= ${formatAmount((area.hours || 0) * getHourRate())}</span>
          </div>
        );

      case "squareFeet":
        return (
          <>
            <div className="rps-inline">
              <span className="rps-label">Fixed: ${getFixedFee()}</span>
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
              <span>@ ${getInsideRate()}</span>
              <span>= ${formatAmount((area.insideSqFt || 0) * getInsideRate())}</span>
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
              <span>@ ${getOutsideRate()}</span>
              <span>= ${formatAmount((area.outsideSqFt || 0) * getOutsideRate())}</span>
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

                    <div className="rps-inline" style={{ marginTop: '8px' }}>
                      <span className="rps-label">Total: ${formatAmount(areaTotals[areaKey])}</span>
                    </div>

                    {/* Monthly Total – HIDE for Quarterly areas */}
                    {form[areaKey].frequencyLabel?.toLowerCase() !== "quarterly" && (
                      <div className="rps-inline" style={{ marginTop: '8px' }}>
                        <span className="rps-label">Monthly: ${formatAmount(areaMonthlyTotals[areaKey])}</span>
                      </div>
                    )}

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
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary */}
      {/* <div className="rps-config-row" style={{ marginTop: '16px', borderTop: '2px solid #ccc', paddingTop: '16px' }}>
        <div className="rps-inline">
          <span className="rps-label-strong">TOTAL PER VISIT: ${formatAmount(quote.perVisitPrice)}</span>
        </div>
      </div> */}

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