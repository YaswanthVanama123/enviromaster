import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRefreshPowerScrubCalc } from "./useRefreshPowerScrubCalc";
import type {
  RefreshAreaKey,
  RefreshPowerScrubFormState,
} from "./refreshPowerScrubTypes";
import type { ServiceInitialData } from "../common/serviceTypes";
import "./refreshPowerScrub.css";
import { useServicesContextOptional } from "../ServicesContext";
import { CustomFieldManager, type CustomField } from "../CustomFieldManager";
import { buildRefreshPowerScrubDraftPayload } from "./refreshPowerScrubDraftPayload";


const formatNumber = (num: number | undefined): string => {
  if (num === undefined || num === null || isNaN(num)) {
    return "0";
  }
  return num % 1 === 0 ? num.toString() : num.toFixed(2);
};

const formatAmount = (n: number): string => formatNumber(n);

const FREQ_OPTIONS = [
  { value: "oneTime", label: "One Time" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "twicePerMonth", label: "2× / Month" },
  { value: "monthly", label: "Monthly" },
  { value: "everyFourWeeks", label: "Every 4 Weeks" },
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
  "Every 4 Weeks",
  "Bi-monthly",
  "Quarterly",
  "Bi-annual",
  "Annual",
];

const AREA_ORDER: RefreshAreaKey[] = [
  "dumpster",
  "patio",

  "foh",
  "boh",

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

  const [customFields, setCustomFields] = useState<CustomField[]>(
    initialData?.customFields || []
  );


  const {
    form,
    setHourlyRate,
    setMinimumVisit,
    setFrequency,
    setContractMonths,
    setNotes,
    setApplyMinimum,
    toggleAreaEnabled,
    setAreaField,
    areaTotals,
    areaMonthlyTotals,
    areaContractTotals,
    quote,
    refreshConfig,
    isLoadingConfig,
    backendConfig, 
  } = useRefreshPowerScrubCalc(initialData, customFields);
  const servicesContext = useServicesContextOptional();


  useEffect(() => {
    if (servicesContext?.globalContractMonths && servicesContext.globalContractMonths !== form.contractMonths) {
      setContractMonths(servicesContext.globalContractMonths);
    }
  }, [servicesContext?.globalContractMonths]);


  const prevDataRef = useRef<string>("");

  const [showAddDropdown, setShowAddDropdown] = useState(false);


  const getWorkerRate = (): number => {
    return backendConfig?.coreRates?.perWorkerRate ?? backendConfig?.coreRates?.defaultHourlyRate ?? 200; 
  };

  const getHourRate = (): number => {
    return backendConfig?.coreRates?.perHourRate ?? 400; 
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

  const isOneTimeLabel = (label?: string) => {
    if (!label) return false;
    const normalized = label.toLowerCase().replace(/-/g, " ").trim();
    return normalized === "one time" || normalized === "one time service";
  };

  const totalServiceCost = useMemo(() => {
    return AREA_ORDER.reduce((sum, key) => {
      const areaForm = form[key];
      const target = areaForm?.frequencyLabel || form.frequency;
      const isOneTime = isOneTimeLabel(target);
      const value = isOneTime ? areaTotals[key] || 0 : areaContractTotals[key] || 0;
      return sum + value;
    }, 0);
  }, [areaTotals, areaContractTotals, form.frequency, form]);

  useEffect(() => {
    if (servicesContext) {
      const activeAreaKeys = AREA_ORDER.filter((key) => {
        const area = form[key];
        const areaTotal = areaTotals[key] || 0;
        return area?.enabled && areaTotal > 0;
      });


      const totalPerVisitCost = activeAreaKeys.reduce(
        (sum, key) => sum + (areaTotals[key] || 0),
        0
      );

      const hasCustomFieldValues = customFields.some(f =>
        (f.type === 'dollar' && !!f.value && parseFloat(f.value) > 0) ||
        (f.type === 'calc' && !!f.calcValues?.right && parseFloat(f.calcValues.right) > 0)
      );
      const isActive = totalPerVisitCost > 0 || hasCustomFieldValues;

      const draftPayload = buildRefreshPowerScrubDraftPayload(form, customFields);

      const data = isActive ? {
        serviceId: "refreshPowerScrub",
        displayName: "Refresh Power Scrub",
        isActive: true,


        perVisitBase: isActive ? totalPerVisitCost : 0,  
        perVisit: isActive
          ? Math.max(totalPerVisitCost, form.minimumVisit || 0)
          : 0,  
        minimumVisit: form.minimumVisit,  


        serviceInfo: {
          isDisplay: true,
          label: "Service Type",
          type: "text" as const,
          value: `Hourly Rate: $${form.hourlyRate}/hr | Minimum: $${form.minimumVisit}`,
        },
        hourlyRateIsCustom: form.hourlyRateIsCustom,
        minimumVisitIsCustom: form.minimumVisitIsCustom,


        services: activeAreaKeys.reduce((acc, key) => {
            const area = form[key];
            const areaName = key === 'foh' ? 'frontHouse' : key === 'boh' ? 'backHouse' : key;


            const pricingMethodNames = {
              'perHour': 'Per Hour',
              'perWorker': 'Per Worker',
              'squareFeet': 'Square Feet',
              'preset': 'Preset Package',
              'custom': 'Custom Amount'
            };


            const getFrequencyMultiplier = (freq: string) => {
              switch (freq?.toLowerCase()) {
                case "one time": return 0;
                case "weekly": return 4.33;
                case "bi-weekly": return 2.165;
                case "2× / month": return 2.0;
                case "monthly": return 1;
                case "every 4 weeks": return 1.0833;
                case "bi-monthly": return 0.5;
                case "quarterly": return 0.333;
                case "bi-annual": return 0.167;
                case "annual": return 0.083;
                default: return 1;
              }
            };

            const frequencyLabel = area.frequencyLabel || 'TBD';
            const freqLower = frequencyLabel.toLowerCase();
            const baseMultiplier = getFrequencyMultiplier(area.frequencyLabel);
            const visitsPerMonth =
              freqLower === "one time" ? 1 : (baseMultiplier <= 0 ? 1 : baseMultiplier);
            const monthlyAmount = areaTotals[key] * visitsPerMonth;


            let contractAmount: number;

            if (freqLower === "quarterly") {

              const quarterlyVisits = (area.contractMonths || 12) / 3;
              contractAmount = areaTotals[key] * quarterlyVisits;
            } else if (freqLower === "bi-annual" || freqLower === "biannual") {

              const biannualVisits = (area.contractMonths || 12) / 6;
              contractAmount = areaTotals[key] * biannualVisits;
            } else if (freqLower === "annual") {

              const annualVisits = (area.contractMonths || 12) / 12;
              contractAmount = areaTotals[key] * annualVisits;
            } else {

              contractAmount = monthlyAmount * (area.contractMonths || 12);
            }


            const serviceData: any = {
              enabled: true,
              pricingMethod: {
                isDisplay: true,
                value: pricingMethodNames[area.pricingType] || area.pricingType,
                type: "text"
              }
            };


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

                serviceData.includePatioAddon = {
                  isDisplay: true,
                  value: area.includePatioAddon || false,
                  type: "boolean"
                };
                console.log(`🔄 [Patio SAVE DEBUG] Saving includePatioAddon:`, serviceData.includePatioAddon);
              } else if (key === 'boh') {

                serviceData.smallMediumQuantity = {
                  isDisplay: true,
                  value: area.smallMediumQuantity || 0,
                  type: "text"
                };
                serviceData.smallMediumRate = {
                  isDisplay: true,
                  value: area.smallMediumRate ?? 0,
                  type: "text"
                };
                serviceData.smallMediumTotal = {
                  isDisplay: true,
                  value: area.smallMediumCustomAmount > 0 ? area.smallMediumCustomAmount : ((area.smallMediumQuantity || 0) * (area.smallMediumRate ?? 0)),
                  type: "calc"
                };
                serviceData.largeQuantity = {
                  isDisplay: true,
                  value: area.largeQuantity || 0,
                  type: "text"
                };
                serviceData.largeRate = {
                  isDisplay: true,
                  value: area.largeRate ?? 0,
                  type: "text"
                };
                serviceData.largeTotal = {
                  isDisplay: true,
                  value: area.largeCustomAmount > 0 ? area.largeCustomAmount : ((area.largeQuantity || 0) * (area.largeRate ?? 0)),
                  type: "calc"
                };
              }
            }


            serviceData.frequency = {
              isDisplay: true,
              value: frequencyLabel,
              type: "text"
            };
            serviceData.total = {
              isDisplay: true,
              value: areaTotals[key],
              type: "calc"
            };
            serviceData.presetQuantity = area.presetQuantity;
            serviceData.presetRate = area.presetRate;
            const monthlyQuantity =
              area.pricingType === "preset"
                ? area.presetQuantity || 1
                : visitsPerMonth;
            const monthlyPriceRate =
              area.pricingType === "preset"
                ? (area.presetRate ?? areaTotals[key])
                : areaTotals[key];
            serviceData.monthly = {
              isDisplay: true,
              quantity: monthlyQuantity,
              priceRate: monthlyPriceRate,
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

            serviceData.customAmount = area.customAmount;
            if (key === "boh") {
              serviceData.smallMediumCustomAmount = area.smallMediumCustomAmount;
              serviceData.largeCustomAmount = area.largeCustomAmount;
            }
            if (key === "patio") {
              serviceData.patioAddonRate = area.patioAddonRate;
            }

            serviceData.workerRateIsCustom = area.workerRateIsCustom;
            serviceData.hourlyRateIsCustom = area.hourlyRateIsCustom;
            serviceData.insideRateIsCustom = area.insideRateIsCustom;
            serviceData.outsideRateIsCustom = area.outsideRateIsCustom;
            serviceData.sqFtFixedFeeIsCustom = area.sqFtFixedFeeIsCustom;
            serviceData.presetRateIsCustom = area.presetRateIsCustom;
            serviceData.smallMediumRateIsCustom = area.smallMediumRateIsCustom;
            serviceData.largeRateIsCustom = area.largeRateIsCustom;

            serviceData.savedPresetRate = area.presetRate;
            serviceData.savedPresetQuantity = area.presetQuantity;
            serviceData.savedWorkerRate = area.workerRate;
            serviceData.savedHours = area.hours;
            serviceData.savedHourlyRate = area.hourlyRate;
            serviceData.savedInsideRate = area.insideRate;
            serviceData.savedOutsideRate = area.outsideRate;
            serviceData.savedSqFtFixedFee = area.sqFtFixedFee;
            serviceData.savedSmallMediumRate = area.smallMediumRate;
            serviceData.savedLargeRate = area.largeRate;

            acc[areaName] = serviceData;
            return acc;
          }, {} as Record<string, any>),

            totals: {
              perVisit: {
                isDisplay: true,
                label: "Total Service Cost",
                type: "dollar" as const,
                amount: parseFloat(formatNumber(totalServiceCost)),
              },
              contract: {
                isDisplay: true,
                label: "Contract Total",
                type: "dollar" as const,
                months: form.contractMonths,
                amount: totalServiceCost,
              },
            },


            contractTotal: totalServiceCost,

        notes: form.notes || "",
        applyMinimum: form.applyMinimum !== false,
        customFields: customFields,
        draftPayload,
      } : null;

      console.log(`🔄 [SAVE CONTEXT DEBUG] Final services context data:`, JSON.stringify(data, null, 2));

      const dataStr = JSON.stringify(data);

      if (dataStr !== prevDataRef.current) {
        prevDataRef.current = dataStr;
        servicesContext.updateService("refreshPowerScrub", data);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, areaTotals, quote, customFields, totalServiceCost]);


  const getPresetAmount = (areaKey: RefreshAreaKey): number => {
    switch (areaKey) {
      case "dumpster":

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

        return 0;
    }
  };

  const renderConditionalFields = (areaKey: RefreshAreaKey) => {
    const area = form[areaKey];
    if (!area.enabled) return null;

    switch (area.pricingType) {
      case "preset":

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
                    <input
                      className="rps-line rps-num"
                      type="number"
                      min="0"
                      value={area.presetQuantity || 1}
                      onChange={(e) => setAreaField(areaKey, "presetQuantity", e.target.value)}
                      style={{ width: '50px' }}
                      title="Quantity - editable"
                    />
                    <span>@</span>
                    <span>$</span>
                    <input
                      className="rps-line rps-num"
                      type="number"
                      min="0"
                      step="1"
                      value={area.presetRate === null ? '' : (area.presetRate ?? getPatioStandalone())}
                      onChange={(e) => setAreaField(areaKey, "presetRate", e.target.value)}
                      style={{
                        width: '80px',
                        backgroundColor: area.presetRateIsCustom ? '#fffacd' : 'white',
                      }}
                      title="Patio base rate - editable"
                    />
                    <span>=</span>
                    <span>$</span>
                    <input
                      className="rps-line rps-num"
                      type="number"
                      readOnly
                      min="0"
                      step="1"
                      value={area.customAmount > 0 ? area.customAmount : ((area.presetQuantity || 1) * (area.presetRate === null ? 0 : (area.presetRate ?? getPatioStandalone())))}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        setAreaField(areaKey, "customAmount", value.toString());
                      }}
                      style={{
                        width: '90px',
                        backgroundColor: area.customAmount > 0 ? '#fffacd' : 'white'
                      }}
                      title={`Patio base total - editable (default: $${formatAmount((area.presetQuantity || 1) * (area.presetRate === null ? 0 : (area.presetRate ?? getPatioStandalone())))})`}
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
                      min="0"
                      step="1"
                      value={area.patioAddonRate === null ? '' : (area.patioAddonRate ?? getPatioUpsell())}
                      onChange={(e) => setAreaField(areaKey, "patioAddonRate", e.target.value)}
                      style={{
                        width: '60px',
                        backgroundColor: area.patioAddonRate !== undefined && area.patioAddonRate !== null ? '#fffacd' : 'white',
                      }}
                      title="Add-on service price - editable"
                    />
                  </label>
                  <div style={{
                    marginTop: '6px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: '#0066cc'
                  }}>
                    Total: ${formatAmount((area.customAmount > 0 ? area.customAmount : ((area.presetQuantity || 1) * (area.presetRate === null ? 0 : (area.presetRate ?? getPatioStandalone())))) + (area.includePatioAddon ? (area.patioAddonRate === null ? 0 : (area.patioAddonRate ?? getPatioUpsell())) : 0))}
                  </div>
                </div>
              </div>
            )}
            {areaKey === "boh" && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {}
                <div className="rps-inline">
                  <span className="rps-label" style={{ fontSize: '11px' }}>S/M:</span>
                  <input
                    className="rps-line rps-num"
                    type="number"
                    min="0"
                    value={area.smallMediumQuantity || 0}
                    onChange={(e) => setAreaField(areaKey, "smallMediumQuantity", e.target.value)}
                    style={{ width: '50px' }}
                    title="Small/Medium quantity - editable"
                  />
                  <span>@</span>
                  <span>$</span>
                  <input
                    className="rps-line rps-num"
                    type="number"
                    min="0"
                    step="1"
                    value={area.smallMediumRate === null ? '' : (area.smallMediumRate ?? getKitchenSmallMed())}
                    onChange={(e) => setAreaField(areaKey, "smallMediumRate", e.target.value)}
                    style={{
                      width: '80px',
                      backgroundColor: area.smallMediumRateIsCustom ? '#fffacd' : 'white',
                    }}
                    title="Small/Medium Kitchen rate - editable"
                  />
                  <span>=</span>
                  <span>$</span>
                  <input
                    className="rps-line rps-num"
                    type="number"
                    min="0"
                    step="1"
                    value={area.smallMediumCustomAmount > 0 ? area.smallMediumCustomAmount : ((area.smallMediumQuantity || 0) * (area.smallMediumRate === null ? 0 : (area.smallMediumRate ?? getKitchenSmallMed())))}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      setAreaField(areaKey, "smallMediumCustomAmount", value.toString());
                    }}
                    style={{
                      width: '90px',
                      backgroundColor: area.smallMediumCustomAmount > 0 ? '#fffacd' : 'white'
                    }}
                    title={`Small/Medium Kitchen total - editable (default: $${formatAmount((area.smallMediumQuantity || 0) * (area.smallMediumRate === null ? 0 : (area.smallMediumRate ?? getKitchenSmallMed())))})`}
                  />
                </div>
                {}
                <div className="rps-inline">
                  <span className="rps-label" style={{ fontSize: '11px' }}>Large:</span>
                  <input
                    className="rps-line rps-num"
                    type="number"
                    min="0"
                    value={area.largeQuantity || 0}
                    onChange={(e) => setAreaField(areaKey, "largeQuantity", e.target.value)}
                    style={{ width: '50px' }}
                    title="Large quantity - editable"
                  />
                  <span>@</span>
                  <span>$</span>
                  <input
                    className="rps-line rps-num"
                    type="number"
                    min="0"
                    step="1"
                    value={area.largeRate === null ? '' : (area.largeRate ?? getKitchenLarge())}
                    onChange={(e) => setAreaField(areaKey, "largeRate", e.target.value)}
                    style={{
                      width: '80px',
                      backgroundColor: area.largeRateIsCustom ? '#fffacd' : 'white',
                    }}
                    title="Large Kitchen rate - editable"
                  />
                  <span>=</span>
                  <span>$</span>
                  <input
                    className="rps-line rps-num"
                    type="number"
                    min="0"
                    step="1"
                    value={area.largeCustomAmount > 0 ? area.largeCustomAmount : ((area.largeQuantity || 0) * (area.largeRate === null ? 0 : (area.largeRate ?? getKitchenLarge())))}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      setAreaField(areaKey, "largeCustomAmount", value.toString());
                    }}
                    style={{
                      width: '90px',
                      backgroundColor: area.largeCustomAmount > 0 ? '#fffacd' : 'white'
                    }}
                    title={`Large Kitchen total - editable (default: $${formatAmount((area.largeQuantity || 0) * (area.largeRate === null ? 0 : (area.largeRate ?? getKitchenLarge())))})`}
                  />
                </div>
              </div>
            )}
            {areaKey !== "patio" && areaKey !== "boh" && (
              <div className="rps-inline">
                <input
                  className="rps-line rps-num"
                  type="number"
                  min="0"
                  value={area.presetQuantity || 1}
                  onChange={(e) => setAreaField(areaKey, "presetQuantity", e.target.value)}
                  style={{ width: '50px' }}
                  title="Quantity - editable"
                />
                <span>@</span>
                <span>$</span>
                <input
                  className="rps-line rps-num"
                  type="number"
                  min="0"
                  step="1"
                  value={area.presetRate === null ? '' : (area.presetRate ?? getPresetAmount(areaKey))}
                  onChange={(e) => setAreaField(areaKey, "presetRate", e.target.value)}
                  style={{
                    width: '80px',
                    backgroundColor: area.presetRateIsCustom ? '#fffacd' : 'white',
                  }}
                  title="Rate - editable"
                />
                <span>=</span>
                <span>$</span>
                <input
                  className="rps-line rps-num"
                  type="number"
                  min="0"
                  step="1"
                  value={area.customAmount > 0 ? area.customAmount : ((area.presetQuantity || 1) * (area.presetRate === null ? 0 : (area.presetRate ?? getPresetAmount(areaKey))))}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    setAreaField(areaKey, "customAmount", value.toString());
                  }}
                  style={{
                    width: '90px',
                    backgroundColor: area.customAmount > 0 ? '#fffacd' : 'white'
                  }}
                  title={`Total - editable (default: $${formatAmount((area.presetQuantity || 1) * (area.presetRate === null ? 0 : (area.presetRate ?? getPresetAmount(areaKey))))})`}
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
              min="0"
              value={area.workers || ""}
              onChange={(e) => setAreaField(areaKey, "workers", e.target.value)}
              style={{ width: '60px' }}
            />
            <span>@</span>
            <input
              className="rps-line rps-num"
              type="number"
              min="0"
              step="1"
              value={area.workerRate || ""}
              onChange={(e) => setAreaField(areaKey, "workerRate", e.target.value)}
              style={{
                width: '80px',
                backgroundColor: area.workerRateIsCustom ? '#fffacd' : 'white',
              }}
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
              min="0"
              value={area.hours || ""}
              onChange={(e) => setAreaField(areaKey, "hours", e.target.value)}
              style={{ width: '60px' }}
            />
            <span>@</span>
            <input
              className="rps-line rps-num"
              type="number"
              min="0"
              step="1"
              value={area.hourlyRate}
              onChange={(e) => setAreaField(areaKey, "hourlyRate", e.target.value)}
              style={{
                width: '80px',
                backgroundColor: area.hourlyRateIsCustom ? '#fffacd' : 'white',
              }}
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
                min="0"
                step="1"
                value={area.sqFtFixedFee}
                onChange={(e) => setAreaField(areaKey, "sqFtFixedFee", e.target.value)}
                style={{
                  width: '80px',
                  backgroundColor: area.sqFtFixedFeeIsCustom ? '#fffacd' : 'white',
                }}
                title="Fixed fee - editable"
              />
            </div>
            <div className="rps-inline" style={{ marginTop: '4px' }}>
              <span className="rps-label">Inside</span>
              <input
                className="rps-line rps-num"
                type="number"
                min="0"
                value={area.insideSqFt}
                onChange={(e) => setAreaField(areaKey, "insideSqFt", e.target.value)}
                style={{ width: '80px' }}
              />
              <span>@</span>
              <input
                className="rps-line rps-num"
                type="number"
                min="0"
                step="0.1"
                value={area.insideRate}
                onChange={(e) => setAreaField(areaKey, "insideRate", e.target.value)}
                style={{
                  width: '60px',
                  backgroundColor: area.insideRateIsCustom ? '#fffacd' : 'white',
                }}
                title="Inside rate - editable"
              />
              <span>= ${formatAmount((area.insideSqFt || 0) * area.insideRate)}</span>
            </div>
            <div className="rps-inline" style={{ marginTop: '4px' }}>
              <span className="rps-label">Outside</span>
              <input
                className="rps-line rps-num"
                type="number"
                min="0"
                value={area.outsideSqFt}
                onChange={(e) => setAreaField(areaKey, "outsideSqFt", e.target.value)}
                style={{ width: '80px' }}
              />
              <span>@</span>
              <input
                className="rps-line rps-num"
                type="number"
                min="0"
                step="0.1"
                value={area.outsideRate}
                onChange={(e) => setAreaField(areaKey, "outsideRate", e.target.value)}
                style={{
                  width: '60px',
                  backgroundColor: area.outsideRateIsCustom ? '#fffacd' : 'white',
                }}
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
            min="0"
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
    <div className="svc-card svc-card-wide refresh-rps" style={{ position: 'relative' }}>
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

      {}
      <CustomFieldManager
        fields={customFields}
        onFieldsChange={setCustomFields}
        showAddDropdown={showAddDropdown}
        onToggleAddDropdown={setShowAddDropdown}
      />

      {}
      <div className="rps-config-row">
        {}
        {}
      </div>

      {}
      <div className="rps-config-row">
        <div className="rps-inline">
          <span className="rps-label">Minimum: ${form.minimumVisit}</span>
          <label className="svc-inline" style={{ marginLeft: '10px' }}>
            <input
              type="checkbox"
              checked={form.applyMinimum !== false}
              onChange={(e) => setApplyMinimum(e.target.checked)}
            />
            <span>Apply Minimum</span>
          </label>
        </div>
      </div>

      <div className="rps-wrap rps-wrap-full">
        <div className="rps-grid rps-full">
          {}
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

          {}
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

                    {}
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

                        {}
                        {form[areaKey].frequencyLabel?.toLowerCase() !== "bi-monthly" &&
                         form[areaKey].frequencyLabel?.toLowerCase() !== "quarterly" &&
                         form[areaKey].frequencyLabel?.toLowerCase() !== "bi-annual" &&
                         form[areaKey].frequencyLabel?.toLowerCase() !== "annual" && (
                          <div className="rps-inline" style={{ marginTop: '8px' }}>
                            <span className="rps-label">Monthly: ${formatAmount(areaMonthlyTotals[areaKey])}</span>
                          </div>
                        )}
                      </>
                    )}

                    {}
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

                            Array.from({ length: 12 }, (_, i) => {
                              const months = (i + 1) * 3; 
                              return (
                                <option key={months} value={months}>
                                  {months} mo
                                </option>
                              );
                            })
                          ) : form[areaKey].frequencyLabel?.toLowerCase() === "bi-annual" ? (

                            Array.from({ length: 6 }, (_, i) => {
                              const months = (i + 1) * 6; 
                              return (
                                <option key={months} value={months}>
                                  {months} mo
                                </option>
                              );
                            })
                          ) : form[areaKey].frequencyLabel?.toLowerCase() === "annual" ? (

                            Array.from({ length: 3 }, (_, i) => {
                              const months = (i + 1) * 12; 
                              return (
                                <option key={months} value={months}>
                                  {months} mo
                                </option>
                              );
                            })
                          ) : (

                            Array.from({ length: 35 }, (_, i) => {
                              const months = i + 2; 
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

      {}
          <div className="rps-config-row" style={{ marginTop: '16px', borderTop: '2px solid #ccc', paddingTop: '16px' }}>
        <div className="rps-inline">
          <span className="rps-label-strong">TOTAL REFRESH POWER SCRUB COST: ${formatAmount(totalServiceCost)}</span>
        </div>
      </div>

      {}
      {}

      {}
      {}

      {}
      {}

      {}
      {}
    </div>
  );
};
