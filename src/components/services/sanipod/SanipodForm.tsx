
import React, { useEffect, useRef, useState, type ChangeEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSync, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { useSanipodCalc } from "./useSanipodCalc";
import type { SanipodFormState } from "./useSanipodCalc";
import { sanipodPricingConfig as cfg } from "./sanipodConfig";
import type { ServiceInitialData } from "../common/serviceTypes";
import { useServicesContextOptional } from "../ServicesContext";
import { CustomFieldManager, type CustomField } from "../CustomFieldManager";

const fmt = (n: number): string => (n > 0 ? n.toFixed(2) : "0.00");

const FIELD_ORDER = {
  frequency: 1,
  rateCategory: 2,
  service: 10,
  extraBags: 20,
  installation: 30,
  totals: {
    perVisit: 90,
    monthly: 91,
    monthlyRecurring: 92,
    firstVisit: 93,
    recurringVisit: 94,
    contract: 95,
    totalPrice: 96,
  },
} as const;

export const SanipodForm: React.FC<ServiceInitialData<SanipodFormState>> = ({
  initialData,
  onRemove,
}) => {

  const [customFields, setCustomFields] = useState<CustomField[]>(
    initialData?.customFields || []
  );


  const { form, setForm, onChange, calc, refreshConfig, isLoadingConfig, baselineRates } =
    useSanipodCalc(initialData, customFields);
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
    onChange({ target: { name, type: "number", value: String(numValue) } } as any);
    } else if (value === '') {

    onChange({ target: { name, type: "number", value: '' } } as any);
    }
  };

  const handleRefresh = () => {
    setEditingValues({});
    setOriginalValues({});
    refreshConfig();
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


  const effectiveRate = calc.effectiveRatePerPod;


  const isVisitBasedFrequency = form.frequency === "oneTime" || form.frequency === "quarterly" ||
    form.frequency === "biannual" || form.frequency === "annual" || form.frequency === "bimonthly" ||
    form.frequency === "everyFourWeeks";


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

  const isEditingField = (field: string) => Object.prototype.hasOwnProperty.call(editingValues, field);
  const extraBagPriceChanged =
    form.extraBagPrice !== baselineRates.extraBagPrice || form.customExtraBagsTotal !== undefined || isEditingField("extraBagPrice");
  const installRateChanged =
    form.installRatePerPod !== baselineRates.installRatePerPod || form.customInstallationFee !== undefined || isEditingField("installRatePerPod");
  const baseWeeklyRateChanged =
    form.weeklyRatePerUnit !== baselineRates.weeklyRatePerUnit || isEditingField("weeklyRatePerUnit");
  const altWeeklyRateChanged =
    form.altWeeklyRatePerUnit !== baselineRates.altWeeklyRatePerUnit || isEditingField("altWeeklyRatePerUnit");
  const standaloneBaseChanged =
    form.standaloneExtraWeeklyCharge !== baselineRates.standaloneExtraWeeklyCharge || isEditingField("standaloneExtraWeeklyCharge");

  useEffect(() => {
    if (servicesContext) {
      const hasCustomFieldValues = customFields.some(f =>
        (f.type === 'dollar' && !!f.value && parseFloat(f.value) > 0) ||
        (f.type === 'calc' && !!f.calcValues?.right && parseFloat(f.calcValues.right) > 0)
      );
      const isActive = (form.podQuantity ?? 0) > 0 || hasCustomFieldValues;

      const frequencyLabel =
        typeof form.frequency === "string"
          ? form.frequency.charAt(0).toUpperCase() + form.frequency.slice(1)
          : String(form.frequency || "");
      const rateCategoryLabel = form.rateCategory === "greenRate" ? "Green Rate" : "Red Rate";

      const oneTimeTotalPrice =
        form.customMonthlyPrice !== undefined
          ? form.customMonthlyPrice
          : parseFloat(calc.contractTotal.toFixed(2));

      const totals = (() => {
        const base: any = {
          perVisit: {
            isDisplay: true,
            orderNo: FIELD_ORDER.totals.perVisit,
            label: "Per Visit Total",
            type: "dollar" as const,
            amount: calc.perVisit,
          },
          monthly: {
            isDisplay: true,
            orderNo: FIELD_ORDER.totals.monthly,
            label: "First Month Total",
            type: "dollar" as const,
            amount: calc.monthly,
          },
          monthlyRecurring: {
            isDisplay: true,
            orderNo: FIELD_ORDER.totals.monthlyRecurring,
            label: "Monthly Recurring",
            type: "dollar" as const,
            amount: calc.ongoingMonthly,
            gap: "normal",
          },
          firstVisit: {
            isDisplay: true,
            orderNo: FIELD_ORDER.totals.firstVisit,
            label: form.frequency === "oneTime" ? "Total Price" : "First Visit Total",
            type: "dollar" as const,
            amount: form.frequency === "oneTime" ? oneTimeTotalPrice : calc.firstVisit,
          },
          recurringVisit: {
            isDisplay: true,
            orderNo: FIELD_ORDER.totals.recurringVisit,
            label: "Recurring Visit Total",
            type: "dollar" as const,
            amount: calc.perVisit,
            gap: "normal",
          },
          contract: {
            isDisplay: true,
            orderNo: FIELD_ORDER.totals.contract,
            label: "Contract Total",
            type: "dollar" as const,
            months: form.contractMonths,
            amount: calc.contractTotal,
          },
        };
        if (form.frequency === "oneTime") {
          base.totalPrice = {
            isDisplay: true,
            orderNo: FIELD_ORDER.totals.totalPrice,
            label: "Total Price",
            type: "dollar" as const,
            amount: oneTimeTotalPrice,
          };
        }
        return base;
      })();

      const data = isActive ? {
        serviceId: "sanipod",
        displayName: "SaniPod",
        isActive: true,


        perVisitBase: form.podQuantity * effectiveRate,  
        perVisit: calc.perVisit,  
        minimumChargePerVisit: calc.minimumChargePerVisit,  

        frequency: {
          isDisplay: true,
          orderNo: FIELD_ORDER.frequency,
          label: "Frequency",
          type: "text" as const,
          value: frequencyLabel,
          frequencyKey: form.frequency,
        },
        rateCategory: {
          isDisplay: true,
          orderNo: FIELD_ORDER.rateCategory,
          label: "Rate Category",
          type: "text" as const,
          value: rateCategoryLabel,
        },
        service: {
          isDisplay: true,
          orderNo: FIELD_ORDER.service,
          label: "SaniPods",
          type: "calc" as const,
          qty: form.podQuantity,
          rate: effectiveRate,
          total: form.podQuantity * effectiveRate, 
        },


        ...(form.extraBagsPerWeek > 0 ? {
          extraBags: {
            isDisplay: true,
            orderNo: FIELD_ORDER.extraBags,
            label: form.extraBagsRecurring ? "Extra Bags (Weekly)" : "Extra Bags (One-time)",
            type: "calc" as const,
            qty: form.extraBagsPerWeek,
            rate: form.extraBagPrice,
            total: form.extraBagsPerWeek * form.extraBagPrice,
            recurring: form.extraBagsRecurring,
          },
        } : {}),


        ...(form.isNewInstall && form.installQuantity > 0 ? {
          installation: {
            isDisplay: true,
            orderNo: FIELD_ORDER.installation,
            label: "Installation",
            type: "calc" as const,
            qty: form.installQuantity,
            rate: form.installRatePerPod,
            total: calc.installCost,
          },
        } : {}),

        weeklyRatePerUnit: form.weeklyRatePerUnit,
        altWeeklyRatePerUnit: form.altWeeklyRatePerUnit,
        extraBagPrice: form.extraBagPrice,
        standaloneExtraWeeklyCharge: form.standaloneExtraWeeklyCharge,
        tripChargePerVisit: form.tripChargePerVisit,
        installRatePerPod: form.installRatePerPod,

        totals,


        customInstallationFee: form.customInstallationFee,
        customPerVisitPrice: form.customPerVisitPrice,
        customMonthlyPrice: form.customMonthlyPrice,
        customAnnualPrice: form.customAnnualPrice,
        customWeeklyPodRate: form.customWeeklyPodRate,
        customPodServiceTotal: form.customPodServiceTotal,
        customExtraBagsTotal: form.customExtraBagsTotal,

        notes: form.notes || "",
        customFields: customFields,
      } : null;

      const dataStr = JSON.stringify(data);

      if (dataStr !== prevDataRef.current) {
        prevDataRef.current = dataStr;
        console.log('🔧 [SaniPod] Sending to context:', JSON.stringify(data, null, 2));
        servicesContext.updateService("sanipod", data);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, calc, customFields]);


  const prevInputsRef = useRef({
    podQuantity: form.podQuantity,
    extraBagsPerWeek: form.extraBagsPerWeek,
    weeklyRatePerUnit: form.weeklyRatePerUnit,
    altWeeklyRatePerUnit: form.altWeeklyRatePerUnit,
    extraBagPrice: form.extraBagPrice,
    standaloneExtraWeeklyCharge: form.standaloneExtraWeeklyCharge,
    contractMonths: form.contractMonths,
    frequency: form.frequency,
    rateCategory: form.rateCategory,
    isStandalone: form.isStandalone,
    extraBagsRecurring: form.extraBagsRecurring,
  });


  useEffect(() => {
    const prev = prevInputsRef.current;
    const hasChanged =
      prev.podQuantity !== form.podQuantity ||
      prev.extraBagsPerWeek !== form.extraBagsPerWeek ||
      prev.weeklyRatePerUnit !== form.weeklyRatePerUnit ||
      prev.altWeeklyRatePerUnit !== form.altWeeklyRatePerUnit ||
      prev.extraBagPrice !== form.extraBagPrice ||
      prev.standaloneExtraWeeklyCharge !== form.standaloneExtraWeeklyCharge ||
      prev.contractMonths !== form.contractMonths ||
      prev.frequency !== form.frequency ||
      prev.rateCategory !== form.rateCategory ||
      prev.isStandalone !== form.isStandalone ||
      prev.extraBagsRecurring !== form.extraBagsRecurring;

    if (hasChanged) {
      setForm((prev) => ({
        ...prev,

        customPerVisitPrice: undefined,
        customMonthlyPrice: undefined,
        customAnnualPrice: undefined,
      }));

      prevInputsRef.current = {
        podQuantity: form.podQuantity,
        extraBagsPerWeek: form.extraBagsPerWeek,
        weeklyRatePerUnit: form.weeklyRatePerUnit,
        altWeeklyRatePerUnit: form.altWeeklyRatePerUnit,
        extraBagPrice: form.extraBagPrice,
        standaloneExtraWeeklyCharge: form.standaloneExtraWeeklyCharge,
        contractMonths: form.contractMonths,
        frequency: form.frequency,
        rateCategory: form.rateCategory,
        isStandalone: form.isStandalone,
        extraBagsRecurring: form.extraBagsRecurring,
      };
    }
  }, [
    form.podQuantity,
    form.extraBagsPerWeek,
    form.weeklyRatePerUnit,
    form.altWeeklyRatePerUnit,
    form.extraBagPrice,
    form.standaloneExtraWeeklyCharge,
    form.contractMonths,
    form.frequency,
    form.rateCategory,
    form.isStandalone,
    form.extraBagsRecurring,
    setForm,
  ]);


  const prevInstallRef = useRef({
    isNewInstall: form.isNewInstall,
    installQuantity: form.installQuantity,
    installRatePerPod: form.installRatePerPod,
  });


  useEffect(() => {
    const prev = prevInstallRef.current;
    const hasChanged =
      prev.isNewInstall !== form.isNewInstall ||
      prev.installQuantity !== form.installQuantity ||
      prev.installRatePerPod !== form.installRatePerPod;

    if (hasChanged) {
      setForm((prev) => ({ ...prev, customInstallationFee: undefined }));

      prevInstallRef.current = {
        isNewInstall: form.isNewInstall,
        installQuantity: form.installQuantity,
        installRatePerPod: form.installRatePerPod,
      };
    }
  }, [form.isNewInstall, form.installQuantity, form.installRatePerPod, setForm]);


  const prevCustomRef = useRef({
    customWeeklyPodRate: form.customWeeklyPodRate,
    customPodServiceTotal: form.customPodServiceTotal,
    customExtraBagsTotal: form.customExtraBagsTotal,
    customInstallationFee: form.customInstallationFee,
  });


  useEffect(() => {
    const prev = prevCustomRef.current;


    if (prev.customWeeklyPodRate !== form.customWeeklyPodRate ||
        prev.customPodServiceTotal !== form.customPodServiceTotal ||
        prev.customExtraBagsTotal !== form.customExtraBagsTotal ||
        prev.customInstallationFee !== form.customInstallationFee) {

      setForm((prevForm) => ({
        ...prevForm,
        customPerVisitPrice: undefined,
        customMonthlyPrice: undefined,
        customAnnualPrice: undefined,
      }));
    }

    prevCustomRef.current = {
      customWeeklyPodRate: form.customWeeklyPodRate,
      customPodServiceTotal: form.customPodServiceTotal,
      customExtraBagsTotal: form.customExtraBagsTotal,
      customInstallationFee: form.customInstallationFee,
    };
  }, [
    form.customWeeklyPodRate,
    form.customPodServiceTotal,
    form.customExtraBagsTotal,
    form.customInstallationFee,
    setForm,
  ]);


  const pods = Math.max(0, form.podQuantity || 0);


  const bagUnitLabel = form.extraBagsRecurring
    ? "$/bag/wk"
    : "$/bag one-time";


  const normalizeRate = (value: number | string | undefined) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };
  const formatRateLabel = (value: number | string | undefined) => `$${normalizeRate(value).toFixed(2)}`;
  const formatRatePlain = (value: number | string | undefined) => normalizeRate(value).toFixed(2);
  const customRateActive = form.customWeeklyPodRate !== undefined;
  const effectiveRuleLabel = customRateActive
    ? formatRateLabel(form.customWeeklyPodRate)
    : (calc.chosenServiceRule === "perPod8"
      ? formatRateLabel(form.altWeeklyRatePerUnit)
      : `${formatRateLabel(form.weeklyRatePerUnit)} + ${formatRateLabel(form.standaloneExtraWeeklyCharge)}`);
  const ruleLabel = form.isStandalone
    ? effectiveRuleLabel
    : `${formatRateLabel(form.altWeeklyRatePerUnit)} (always)`;

  return (
    <div className="svc-card">
      {}
      <div className="svc-h-row">
        <div className="svc-h">SANIPOD (STANDALONE ONLY)</div>
        <div className="svc-h-actions">
          <button
            type="button"
            className="svc-mini"
            onClick={handleRefresh}
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
            <option value="everyFourWeeks">Every 4 Weeks</option>
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
            name="isStandalone"
            value={form.isStandalone ? "standalone" : "package"}
            onChange={(e) => {
              const event = {
                target: {
                  name: "isStandalone",
                  type: "checkbox",
                  checked: e.target.value === "standalone",
                  value: e.target.value === "standalone",
                }
              } as any;
              onChange(event);
            }}
          >
            <option value="standalone">
              Standalone (auto-switch: {formatRateLabel(form.weeklyRatePerUnit)} or {formatRateLabel(form.altWeeklyRatePerUnit)}+{formatRateLabel(form.standaloneExtraWeeklyCharge)})
            </option>
            <option value="package">
              Part of Package (always {formatRateLabel(form.weeklyRatePerUnit)}/pod)
            </option>
          </select>
        </div>
      </div>

      <div className="svc-row">
        <label>Package base rate (${formatRatePlain(form.weeklyRatePerUnit)}/pod)</label>
        <div className="svc-row-right">
          <input
            className="svc-in svc-in-small"
            type="number"
            min="0"
            step="0.01"
            name="weeklyRatePerUnit"
            value={getDisplayValue('weeklyRatePerUnit', form.weeklyRatePerUnit)}
            onChange={handleLocalChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={{
              backgroundColor: baseWeeklyRateChanged ? "#fffacd" : "white",
              width: "90px",
            }}
          />
          <span className="svc-small">
            $/wk each (standalone adds ${formatRatePlain(form.standaloneExtraWeeklyCharge)}/wk base)
          </span>
        </div>
      </div>
      <div className="svc-row">
        <label>Alternative flat rate (${formatRatePlain(form.altWeeklyRatePerUnit)}/pod)</label>
        <div className="svc-row-right">
          <input
            className="svc-in svc-in-small"
            type="number"
            min="0"
            step="0.01"
            name="altWeeklyRatePerUnit"
            value={getDisplayValue('altWeeklyRatePerUnit', form.altWeeklyRatePerUnit)}
            onChange={handleLocalChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={{
              backgroundColor: altWeeklyRateChanged ? "#fffacd" : "white",
              width: "90px",
            }}
          />
          <span className="svc-small">$/wk each (for standalone opt A)</span>
        </div>
      </div>
      <div className="svc-row">
        <label>Standalone base weekly charge ({formatRateLabel(form.standaloneExtraWeeklyCharge)})</label>
        <div className="svc-row-right">
          <input
            className="svc-in svc-in-small"
            type="number"
            min="0"
            step="0.01"
            name="standaloneExtraWeeklyCharge"
            value={getDisplayValue('standaloneExtraWeeklyCharge', form.standaloneExtraWeeklyCharge)}
            onChange={handleLocalChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={{
              backgroundColor: standaloneBaseChanged ? "#fffacd" : "white",
              width: "90px",
            }}
          />
          <span className="svc-small">$/wk base used when standalone</span>
        </div>
      </div>

      {}
      <div className="svc-row">
        <label>SaniPods</label>
        <div className="svc-row-right">
          <input
            className="svc-in svc-in-small field-qty"
            type="number"
            min="0"
            name="podQuantity"
            value={form.podQuantity || ""}
            onChange={onChange}
            style={{width:"70px"}}
          />
          <span className="svc-multi">@</span>
          <input
            className="svc-in svc-in-small field-qty"
            type="number"
            min="0"
            readOnly
            step="1"
            name="customWeeklyPodRate"
            value={getDisplayValue(
              'customWeeklyPodRate',
              form.customWeeklyPodRate !== undefined
                ? form.customWeeklyPodRate
                : parseFloat(calc.effectiveRatePerPod.toFixed(2))
            )}
            onChange={handleLocalChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            title="Effective rate per pod (editable)"
            style={{ backgroundColor: form.customWeeklyPodRate !== undefined ? '#fffacd' : 'white', width: "70px"}}
          />
          <span className="svc-small">$/wk</span>
          <span className="svc-eq">=</span>
          <input
            className="svc-in svc-in-small field-qty"
            type="number"
            min="0"
            readOnly
            step="1"
            name="customPodServiceTotal"
            value={getDisplayValue(
              'customPodServiceTotal',
              form.customPodServiceTotal !== undefined
                ? form.customPodServiceTotal
                : parseFloat(calc.adjustedPodServiceTotal.toFixed(2))
            )}
            onChange={handleLocalChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={{
              backgroundColor: form.customPodServiceTotal !== undefined ? '#fffacd' : 'white',
              width: '70px'
            }}
          />
          <span className="svc-small" style={{ marginLeft: "8px" }}>
            (using {ruleLabel})
          </span>
        </div>
      </div>

      {}
      <div className="svc-row">
        <label>Extra Bags</label>
        <div className="svc-row-right">
          <input
            className="svc-in svc-in-small field-qty"
            type="number"
            min="0"
            name="extraBagsPerWeek"
            value={form.extraBagsPerWeek || ""}
            onChange={onChange}
          />
          <span className="svc-multi">@</span>
          <input
            className="svc-in svc-in-small field-qty"
            type="number"
            min="0"
            step="1"
            name="extraBagPrice"
            value={form.extraBagPrice || ""}
            onChange={onChange}
            style={{
              backgroundColor: extraBagPriceChanged ? '#fffacd' : 'white',
              width: "70px",
            }}
          />
          <span className="svc-small">{bagUnitLabel}</span>
          <span className="svc-eq">=</span>
          <input
            className="svc-in svc-in-small field-qty"
            type="number"
            readOnly
            min="0"
            step="1"
            name="customExtraBagsTotal"
            value={getDisplayValue(
              'customExtraBagsTotal',
              form.customExtraBagsTotal !== undefined
                ? form.customExtraBagsTotal
                : parseFloat(calc.adjustedBagsTotal.toFixed(2))
            )}
            onChange={handleLocalChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={{
              backgroundColor: form.customExtraBagsTotal !== undefined ? '#fffacd' : 'white',
              width: '80px'
            }}
          />
          <label className="svc-inline" style={{ marginLeft: "8px" }}>
            <input
              type="checkbox"
              name="extraBagsRecurring"
              checked={form.extraBagsRecurring}
              onChange={onChange}
            />{" "}
            <span className="svc-small">
              Recurring
            </span>
          </label>
        </div>
      </div>

      {}
      {}

      {}
      <div className="svc-row">
        <label>New Install?</label>
        <div className="svc-row-right">
          <input
            type="checkbox"
            name="isNewInstall"
            checked={form.isNewInstall}
            onChange={onChange}
          />{" "}
          <span className="svc-small">$</span>
          <input
            className="svc-in svc-in-small"
            type="number"
            min="0"
            step="1"
            name="installRatePerPod"
            value={form.installRatePerPod || ""}
            onChange={onChange}
            style={{ width: "60px" }}
          />
          <span className="svc-small"> / pod install</span>
        </div>
      </div>

      {}
      {form.isNewInstall && (
        <>
          <div className="svc-row">
            <label>Install Pods</label>
            <div className="svc-row-right">
              <input
                className="svc-in svc-in-small"
                type="number"
                min="0"
                name="installQuantity"
                value={form.installQuantity || ""}
                onChange={onChange}
              />
              <span className="svc-multi">@</span>
              <input
                className="svc-in svc-in-small"
                type="number"
                step="1"
                name="installRatePerPod"
                value={form.installRatePerPod || ""}
                onChange={onChange}
                style={{ backgroundColor: installRateChanged ? '#fffacd' : 'white', width: "70px" }}
              />
              <span className="svc-small">$/pod install</span>
              <span className="svc-eq">=</span>
              <span className="svc-dollar">
                ${fmt(form.installQuantity * form.installRatePerPod)}
              </span>
            </div>
          </div>

          {}
          <div className="svc-row">
            <label>Installation Total</label>
            <div className="svc-row-right">
              <span className="svc-dollar">
                <span>$</span>
                <input
                  className="svc-in svc-in-small"
                  type="number"
                  min="0"
                  readOnly
                  step="1"
                  name="customInstallationFee"
                  value={getDisplayValue(
                    'customInstallationFee',
                    form.customInstallationFee !== undefined
                      ? form.customInstallationFee
                      : parseFloat(calc.installCost.toFixed(2))
                  )}
                  onChange={handleLocalChange}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  style={{ backgroundColor: form.customInstallationFee !== undefined ? '#fffacd' : 'white' }}
                />
              </span>
            </div>
          </div>
        </>
      )}

      {}
      {}

      {}
      {!isVisitBasedFrequency && (
        <div className="svc-row svc-row-total">
          <label>First Visit Total</label>
          <div className="svc-dollar">
            <span className="svc-dollar">
              $  {parseFloat(calc.firstVisit.toFixed(2))}
            </span>
          </div>
        </div>
      )}

            {}
      {isVisitBasedFrequency && form.frequency !== "oneTime" && (
        <div className="svc-row svc-row-total">
          <label>First Visit Total</label>
          <div className="svc-dollar">
            $<input
              className="svc-in svc-in-small"
              type="number"
              readOnly
              step="1"
              name="customMonthlyPrice"
              value={getDisplayValue(
                'customMonthlyPrice',
                form.customMonthlyPrice !== undefined
                  ? form.customMonthlyPrice
                  : parseFloat(calc.adjustedMonthly.toFixed(2))
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{
                backgroundColor: form.customMonthlyPrice !== undefined ? '#fffacd' : 'white',
                border: 'none',
                width: '100px'
              }}
            />
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
           form.frequency === "annual" ||
           form.frequency === "everyFourWeeks"
            ? "Recurring Visit Total"
            : "Per Visit Service"}
        </label>
        <div className="svc-dollar">
          $<input
            className="svc-in svc-in-small"
            type="number"
            min="0"
            readOnly
            step="1"
            name="customPerVisitPrice"
            value={getDisplayValue(
              'customPerVisitPrice',
              form.customPerVisitPrice !== undefined
                ? form.customPerVisitPrice
                : parseFloat(calc.adjustedPerVisit.toFixed(2))
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
                    : "Per visit service - editable"}
          />
        </div>
      </div>


      {}
      {!isVisitBasedFrequency && (
        <div className="svc-row svc-row-total">
          <label>First Month Total</label>
          <div className="svc-dollar">
            $<input
              className="svc-in svc-in-small"
              type="number"
              readOnly
              step="1"
              name="customMonthlyPrice"
              value={getDisplayValue(
                'customMonthlyPrice',
                form.customMonthlyPrice !== undefined
                  ? form.customMonthlyPrice
                  : parseFloat(calc.adjustedMonthly.toFixed(2))
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{
                backgroundColor: form.customMonthlyPrice !== undefined ? '#fffacd' : 'white',
                border: 'none',
                width: '100px'
              }}
            />
          </div>
        </div>
      )}

      {}
      {form.frequency === "oneTime" && (
        <div className="svc-row svc-row-total">
          <label>Total Price</label>
          <div className="svc-dollar">
            $<input
              className="svc-in svc-in-small"
              type="number"
              step="1"
              name="customMonthlyPrice"
              value={getDisplayValue(
                'customMonthlyPrice',
                form.customMonthlyPrice !== undefined
                  ? form.customMonthlyPrice
                  : parseFloat(calc.contractTotal.toFixed(2))
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{
                backgroundColor: form.customMonthlyPrice !== undefined ? '#fffacd' : 'white',
                border: 'none',
                width: '100px'
              }}
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
              className="svc-in svc-in-small"
              type="text"
              readOnly
              value={calc.ongoingMonthly.toFixed(2)}
              style={{
                backgroundColor: '#f5f5f5',
                border: 'none',
                width: '100px'
              }}
            />
          </div>
        </div>
      )}

      {}
      {form.frequency !== "oneTime" && (
        <div className="svc-row svc-row-total">
          <label>Contract Total</label>
          <div className="svc-row-right">
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
            <div className="svc-dollar">
              $<input
                className="svc-in svc-in-small"
                type="number"
                step="1"
                name="customAnnualPrice"
                value={getDisplayValue(
                  'customAnnualPrice',
                  form.customAnnualPrice !== undefined
                    ? form.customAnnualPrice
                    : parseFloat(calc.adjustedAnnual.toFixed(2))
                )}
                onChange={handleLocalChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={{
                  backgroundColor: form.customAnnualPrice !== undefined ? '#fffacd' : 'white',
                  border: 'none',
                  width: '140px'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
