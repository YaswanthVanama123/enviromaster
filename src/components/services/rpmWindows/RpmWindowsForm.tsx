// src/features/services/rpmWindows/RpmWindowsForm.tsx
import React, { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSync, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { useRpmWindowsCalc } from "./useRpmWindowsCalc";
import type { RpmWindowsFormState } from "./rpmWindowsTypes";
import type { ServiceInitialData } from "../common/serviceTypes";
import { useServicesContextOptional } from "../ServicesContext";
import { CustomFieldManager, type CustomField } from "../CustomFieldManager";

export const RpmWindowsForm: React.FC<
  ServiceInitialData<RpmWindowsFormState>
> = ({ initialData, onRemove }) => {
  const {
    form,
    setForm,
    onChange,
    addExtraCharge,
    updateExtraCharge,
    calc,
    quote,
    refreshConfig,
    isLoadingConfig,
  } = useRpmWindowsCalc(initialData);
  const servicesContext = useServicesContextOptional();

  // Custom fields state - initialize with initialData if available
  const [customFields, setCustomFields] = useState<CustomField[]>(
    initialData?.customFields || []
  );
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  // Save form data to context for form submission
  const prevDataRef = useRef<string>("");

  useEffect(() => {
    if (servicesContext) {
      const isActive = (form.smallQty ?? 0) > 0 || (form.mediumQty ?? 0) > 0 || (form.largeQty ?? 0) > 0;

      const data = isActive ? {
        serviceId: "rpmWindows",
        displayName: "RPM Window",
        isActive: true,
        windows: [
          ...(form.smallQty > 0 ? [{
            label: "Small Windows",
            type: "calc" as const,
            qty: form.smallQty,
            rate: calc.effSmall,
            total: form.customSmallTotal ?? (form.smallQty * calc.effSmall),
          }] : []),
          ...(form.mediumQty > 0 ? [{
            label: "Medium Windows",
            type: "calc" as const,
            qty: form.mediumQty,
            rate: calc.effMedium,
            total: form.customMediumTotal ?? (form.mediumQty * calc.effMedium),
          }] : []),
          ...(form.largeQty > 0 ? [{
            label: "Large Windows",
            type: "calc" as const,
            qty: form.largeQty,
            rate: calc.effLarge,
            total: form.customLargeTotal ?? (form.largeQty * calc.effLarge),
          }] : []),
        ],
        installationFee: {
          label: "Installation Fee + First Visit",
          type: "dollar" as const,
          amount: form.customInstallationFee ?? calc.installOneTime,
        },
        installType: {
          label: "Install Type",
          type: "text" as const,
          value: form.isFirstTimeInstall ? "First Time (Install)" : "Ongoing / Clean",
        },
        serviceFrequency: {
          label: "Service Frequency",
          type: "text" as const,
          value: typeof form.frequency === 'string'
            ? form.frequency.charAt(0).toUpperCase() + form.frequency.slice(1)
            : String(form.frequency || ''),
        },
        mirrorCleaning: {
          label: "Mirror Cleaning",
          type: "text" as const,
          value: form.includeMirrors ? "Include (same chemicals)" : "Not included",
        },
        rateCategory: {
          label: "Rate Category",
          type: "text" as const,
          value: form.selectedRateCategory === "redRate" ? "Red Rate" : "Green Rate",
        },
        extraCharges: form.extraCharges.map(charge => ({
          label: charge.description || "Extra Charge",
          type: "dollar" as const,
          amount: charge.amount,
        })),
        totals: {
          perVisit: {
            label: "Total Price (Per Visit)",
            type: "dollar" as const,
            amount: form.customPerVisitPrice ?? quote.perVisitPrice,
          },
          monthlyRecurring: {
            label: "Monthly Recurring",
            type: "dollar" as const,
            amount: form.customMonthlyRecurring ?? calc.monthlyBillRated,
          },
          annual: {
            label: "Annual Price",
            type: "dollar" as const,
            months: form.contractMonths,
            amount: form.customAnnualPrice ?? quote.annualPrice,
          },
        },
        notes: form.notes || "",
        customFields: customFields,
      } : null;

      const dataStr = JSON.stringify(data);

      if (dataStr !== prevDataRef.current) {
        prevDataRef.current = dataStr;
        servicesContext.updateService("rpmWindows", data);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, calc, quote, customFields]);

  const handleInstallTypeChange = (value: "first" | "clean") =>
    setForm((prev) => ({ ...prev, isFirstTimeInstall: value === "first" }));

  // Handler to reset custom values to undefined if left empty
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (value === '' || value === null) {
      setForm((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // Clear custom totals when base inputs change
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      customSmallTotal: undefined,
    }));
  }, [form.smallQty, calc.effSmall]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      customMediumTotal: undefined,
    }));
  }, [form.mediumQty, calc.effMedium]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      customLargeTotal: undefined,
    }));
  }, [form.largeQty, calc.effLarge]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      customInstallationFee: undefined,
    }));
  }, [form.isFirstTimeInstall, calc.firstVisitTotalRated]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      customPerVisitPrice: undefined,
      customMonthlyRecurring: undefined,
      customAnnualPrice: undefined,
    }));
  }, [
    form.smallQty,
    form.mediumQty,
    form.largeQty,
    calc.effSmall,
    calc.effMedium,
    calc.effLarge,
    form.extraCharges,
    form.frequency,
    form.contractMonths,
  ]);

  // Installation Fee + First Visit (now: install-only first visit)
  const installationFeeDisplay = form.isFirstTimeInstall
    ? calc.firstVisitTotalRated
    : 0;

  return (
    <div className="svc-card">
      <div className="svc-h-row">
        <div className="svc-h">RPM WINDOW</div>
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
          <button
            type="button"
            className="svc-mini"
            onClick={addExtraCharge}
            title="Add extra charge"
            style={{ fontSize: '12px' }}
          >
            $
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

      {/* Small */}
      <div className="svc-row">
        <label>Small Windows</label>
        <div className="svc-row-right">
          <input
            className="svc-in field-qty"
            name="smallQty"
            type="number"
            value={form.smallQty}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in field-qty"
            name="smallWindowRate"
            type="number"
            step="0.01"
            value={form.smallWindowRate}
            onChange={onChange}
            title="Base weekly rate (from backend)"
          />
          <span>=</span>
          <input
            className="svc-in-box field-qty"
            name="customSmallTotal"
            type="number"
            step="0.01"
            value={
              form.customSmallTotal !== undefined
                ? form.customSmallTotal
                : (form.smallQty * calc.effSmall)
            }
            onChange={onChange}
            onBlur={handleBlur}
            style={{ backgroundColor: form.customSmallTotal !== undefined ? '#fffacd' : 'white' }}
            title={`Calculated total (Qty × $${calc.effSmall.toFixed(2)} effective rate)`}
          />
        </div>
      </div>

      {/* Medium */}
      <div className="svc-row">
        <label>Medium Windows</label>
        <div className="svc-row-right">
          <input
            className="svc-in field-qty"
            name="mediumQty"
            type="number"
            value={form.mediumQty}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in field-qty"
            name="mediumWindowRate"
            type="number"
            step="0.01"
            value={form.mediumWindowRate}
            onChange={onChange}
            title="Base weekly rate (from backend)"
          />
          <span>=</span>
          <input
            className="svc-in-box field-qty"
            name="customMediumTotal"
            type="number"
            step="0.01"
            value={
              form.customMediumTotal !== undefined
                ? form.customMediumTotal
                : (form.mediumQty * calc.effMedium)
            }
            onChange={onChange}
            onBlur={handleBlur}
            style={{ backgroundColor: form.customMediumTotal !== undefined ? '#fffacd' : 'white' }}
            title={`Calculated total (Qty × $${calc.effMedium.toFixed(2)} effective rate)`}
          />
        </div>
      </div>

      {/* Large */}
      <div className="svc-row">
        <label>Large Windows</label>
        <div className="svc-row-right">
          <input
            className="svc-in field-qty"
            name="largeQty"
            type="number"
            value={form.largeQty}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in field-qty"
            name="largeWindowRate"
            type="number"
            step="0.01"
            value={form.largeWindowRate}
            onChange={onChange}
            title="Base weekly rate (from backend)"
          />
          <span>=</span>
          <input
            className="svc-in-box field-qty"
            name="customLargeTotal"
            type="number"
            step="0.01"
            value={
              form.customLargeTotal !== undefined
                ? form.customLargeTotal
                : (form.largeQty * calc.effLarge)
            }
            onChange={onChange}
            onBlur={handleBlur}
            style={{ backgroundColor: form.customLargeTotal !== undefined ? '#fffacd' : 'white' }}
            title={`Calculated total (Qty × $${calc.effLarge.toFixed(2)} effective rate)`}
          />
        </div>
      </div>

      {/* + Added extra lines */}
      {form.extraCharges.map((line) => (
        <div className="svc-row" key={line.id}>
          <div className="svc-row-right">
            <input
              className="svc-in"
              type="text"
              placeholder="Calc"
              value={line.calcText}
              onChange={(e) =>
                updateExtraCharge(line.id, "calcText", e.target.value)
              }
            />
            <input
              className="svc-in"
              type="text"
              placeholder="Text"
              value={line.description}
              onChange={(e) =>
                updateExtraCharge(line.id, "description", e.target.value)
              }
            />
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                type="number"
                value={line.amount}
                onChange={(e) =>
                  updateExtraCharge(line.id, "amount", e.target.value)
                }
              />
            </div>
          </div>
        </div>
      ))}

      {/* Trip Charge */}
      {/* <div className="svc-row svc-row-charge">
        <label>Trip Charge</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="number"
              value={calc.effTrip.toFixed(2)}
              readOnly
            />
          </div>
          <label className="svc-inline">
            <input type="checkbox" checked readOnly />
            <span>Include</span>
          </label>
        </div>
      </div> */}

      {/* Install Fee + First Visit */}
      <div className="svc-row svc-row-charge">
        <label>Installation + First Visit</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="number"
              step="0.01"
              name="customInstallationFee"
              value={form.customInstallationFee !== undefined ? form.customInstallationFee : installationFeeDisplay}
              onChange={onChange}
              onBlur={handleBlur}
              style={{ backgroundColor: form.customInstallationFee !== undefined ? '#fffacd' : 'white' }}
            />
          </div>
        </div>
      </div>

      {/* Install Type */}
      <div className="svc-row">
        <label>Install Type</label>
        <div className="svc-row-right">
          <label className="svc-inline">
            <input
              type="radio"
              value="first"
              checked={form.isFirstTimeInstall}
              onChange={() => handleInstallTypeChange("first")}
            />
            <span>First Time (Install)</span>
          </label>
          <label className="svc-inline">
            <input
              type="radio"
              value="clean"
              checked={!form.isFirstTimeInstall}
              onChange={() => handleInstallTypeChange("clean")}
            />
            <span>Ongoing / Clean</span>
          </label>
        </div>
      </div>

      {/* Frequency */}
      <div className="svc-row">
        <label>Frequency</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="frequency"
            value={form.frequency}
            onChange={onChange}
          >
            <option value="weekly">Weekly</option>
            <option value="biweekly">Bi-Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
        </div>
      </div>

      {/* Rate Category */}
      {/* <div className="svc-row">
        <label>Rate Category</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="selectedRateCategory"
            value={form.selectedRateCategory}
            onChange={onChange}
          >
            <option value="redRate">Red (Standard)</option>
            <option value="greenRate">Green (Premium)</option>
          </select>
        </div>
      </div> */}

      {/* Mirror */}
      <div className="svc-row">
        <label>Mirror Cleaning</label>
        <div className="svc-row-right">
          <label className="svc-inline">
            <input
              type="checkbox"
              name="includeMirrors"
              checked={form.includeMirrors}
              onChange={onChange}
            />
            <span>Include mirrors</span>
          </label>
        </div>
      </div>

      {/* Total Per Visit */}
      <div className="svc-row svc-row-charge">
        <label>Per Visit Price</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              name="customPerVisitPrice"
              type="number"
              step="0.01"
              value={form.customPerVisitPrice !== undefined ? form.customPerVisitPrice : quote.perVisitPrice}
              onChange={onChange}
              onBlur={handleBlur}
              style={{ backgroundColor: form.customPerVisitPrice !== undefined ? '#fffacd' : 'white' }}
            />
          </div>
        </div>
      </div>

      {/* Monthly Recurring – HIDE for Quarterly */}
      {form.frequency !== "quarterly" && (
        <div className="svc-row svc-row-charge">
          <label>Monthly Recurring</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                name="customMonthlyRecurring"
                type="number"
                step="0.01"
                value={form.customMonthlyRecurring !== undefined ? form.customMonthlyRecurring : calc.monthlyBillRated}
                onChange={onChange}
                onBlur={handleBlur}
                style={{ backgroundColor: form.customMonthlyRecurring !== undefined ? '#fffacd' : 'white' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Annual Price (now: total for selected months) */}
      <div className="svc-row svc-row-charge">
        <label>Contract Total</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="contractMonths"
            value={form.contractMonths}
            onChange={onChange}
          >
            {Array.from({ length: 35 }, (_, i) => i + 2).map((m) => (
              <option key={m} value={m}>
                {m} months
              </option>
            ))}
          </select>
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              name="customAnnualPrice"
              type="number"
              step="0.01"
              value={form.customAnnualPrice !== undefined ? form.customAnnualPrice : quote.annualPrice}
              onChange={onChange}
              onBlur={handleBlur}
              style={{ backgroundColor: form.customAnnualPrice !== undefined ? '#fffacd' : 'white' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
