import React, { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSync, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { useCarpetCalc } from "./useCarpetCalc";
import type { CarpetFormState } from "./carpetTypes";
import type { ServiceInitialData } from "../common/serviceTypes";
import { carpetFrequencyLabels, getContractOptions } from "./carpetConfig";
import { useServicesContextOptional } from "../ServicesContext";
import { CustomFieldManager, type CustomField } from "../CustomFieldManager";

/**
 * Carpet Cleaning form – same UI style as SaniScrub:
 *  - Block pricing: 250 (first 500 sq ft) + 125 per extra 500
 *  - Per-visit minimum $250
 *  - No trip charge in math (field shows $0.00)
 *  - Installation fee options (1× clean / 3× dirty)
 *  - First month calculation includes installation + normal service
 *  - Contract term: 2–36 months
 */
export const CarpetForm: React.FC<
  ServiceInitialData<CarpetFormState>
> = ({ initialData, onQuoteChange, onRemove }) => {
  const { form, setForm, onChange, quote, calc, refreshConfig, isLoadingConfig } = useCarpetCalc(initialData);
  const servicesContext = useServicesContextOptional();

  // Handler for clearing override values when they match calculated values
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = parseFloat(value);

    if (isNaN(numValue)) return;

    // Clear override if it matches the base backend value
    switch (name) {
      case 'customFirstUnitRate':
        if (Math.abs(numValue - (form.firstUnitRate || 250)) < 0.01) {
          onChange({ target: { name, value: '' } } as any);
        }
        break;
      case 'customAdditionalUnitRate':
        if (Math.abs(numValue - (form.additionalUnitRate || 125)) < 0.01) {
          onChange({ target: { name, value: '' } } as any);
        }
        break;
      case 'customPerVisitMinimum':
        if (Math.abs(numValue - (form.perVisitMinimum || 250)) < 0.01) {
          onChange({ target: { name, value: '' } } as any);
        }
        break;
      case 'customPerVisitPrice':
        if (Math.abs(numValue - calc.perVisitCharge) < 0.01) {
          onChange({ target: { name, value: '' } } as any);
        }
        break;
      case 'customMonthlyRecurring':
        if (Math.abs(numValue - calc.monthlyTotal) < 0.01) {
          onChange({ target: { name, value: '' } } as any);
        }
        break;
      case 'customFirstMonthPrice':
        if (Math.abs(numValue - calc.firstMonthTotal) < 0.01) {
          onChange({ target: { name, value: '' } } as any);
        }
        break;
      case 'customContractTotal':
        if (Math.abs(numValue - calc.contractTotal) < 0.01) {
          onChange({ target: { name, value: '' } } as any);
        }
        break;
      case 'customInstallationFee':
        if (Math.abs(numValue - calc.installOneTime) < 0.01) {
          onChange({ target: { name, value: '' } } as any);
        }
        break;
    }
  };

  // Custom fields state - initialize with initialData if available
  const [customFields, setCustomFields] = useState<CustomField[]>(
    initialData?.customFields || []
  );
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  // Save form data to context for form submission
  const prevDataRef = useRef<string>("");

  useEffect(() => {
    if (servicesContext) {
      const isActive = (form.areaSqFt ?? 0) > 0;

      const data = isActive ? {
        serviceId: "carpetclean",
        displayName: "Carpet Cleaning",
        isActive: true,

        frequency: {
          isDisplay: true,
          label: "Frequency",
          type: "text" as const,
          value: carpetFrequencyLabels[form.frequency] || form.frequency,
        },

        location: {
          isDisplay: true,
          label: "Location",
          type: "text" as const,
          value: form.location === "insideBeltway" ? "Inside Beltway" : "Outside Beltway",
        },

        service: {
          isDisplay: true,
          label: "Carpet Area",
          type: "calc" as const,
          qty: form.areaSqFt,
          rate: form.firstUnitRate,
          total: calc.perVisitCharge,
          unit: "sq ft",
        },

        // Installation data
        ...(form.includeInstall ? {
          installation: {
            isDisplay: true,
            label: form.isDirtyInstall ? "Installation (Dirty - 3×)" : "Installation (Clean - 1×)",
            type: "calc" as const,
            qty: 1,
            rate: calc.installOneTime,
            total: calc.installOneTime,
            multiplier: form.isDirtyInstall ? form.installMultiplierDirty : form.installMultiplierClean,
            isDirty: form.isDirtyInstall,
          },
        } : {}),

        totals: {
          perVisit: {
            isDisplay: true,
            label: "Per Visit Total",
            type: "dollar" as const,
            amount: calc.perVisitCharge,
          },
          monthly: {
            isDisplay: form.frequency !== "oneTime",
            label: form.frequency === "oneTime" ? "Total Price" :
                   calc.isVisitBasedFrequency ? "First Visit Total" : "First Month Total",
            type: "dollar" as const,
            amount: form.frequency === "oneTime" ? calc.perVisitCharge : calc.firstMonthTotal,
          },
          ...(form.frequency !== "oneTime" && !calc.isVisitBasedFrequency ? {
            recurring: {
              isDisplay: true,
              label: "Monthly Recurring",
              type: "dollar" as const,
              amount: calc.monthlyTotal,
            },
          } : {}),
          contract: {
            isDisplay: form.frequency !== "oneTime",
            label: "Contract Total",
            type: "dollar" as const,
            months: form.contractMonths,
            amount: calc.contractTotal,
          },
        },

        notes: form.notes || "",
        customFields: customFields,
      } : null;

      const dataStr = JSON.stringify(data);

      if (dataStr !== prevDataRef.current) {
        prevDataRef.current = dataStr;
        servicesContext.updateService("carpetclean", data);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, calc, customFields]);

  React.useEffect(() => {
    if (onQuoteChange) onQuoteChange(quote);
  }, [onQuoteChange, quote]);

  // Clear custom overrides when base inputs change
  useEffect(() => {
    setForm((prev: any) => ({
      ...prev,
      customPerVisitPrice: undefined,
      customMonthlyRecurring: undefined,
      customFirstMonthPrice: undefined,
      customContractTotal: undefined,
    }));
  }, [
    form.areaSqFt,
    form.useExactSqft,
    form.frequency,
    form.contractMonths,
    form.includeInstall,
    form.isDirtyInstall,
    form.customFirstUnitRate,
    form.customAdditionalUnitRate,
    form.customPerVisitMinimum,
    setForm,
  ]);

  return (
    <div className="svc-card">
      <div className="svc-h-row">
        <div className="svc-h">CARPET CLEANING</div>
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
              className="svc-mini"
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

      {/* Pricing Configuration Rates */}
      <div className="svc-row">
        <label>First 500 sq ft Rate</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in field-qty"
              type="number"
              min={0}
              step={0.01}
              name="customFirstUnitRate"
              value={form.customFirstUnitRate !== undefined ? form.customFirstUnitRate : (form.firstUnitRate || 0)}
              onChange={onChange}
              onBlur={handleBlur}
              style={{ backgroundColor: form.customFirstUnitRate !== undefined ? '#fffacd' : 'white' }}
              title="Rate for first 500 sq ft (from backend, editable)"
            />
          </div>
          <span className="svc-small">/ 500 sq ft (${(((form.customFirstUnitRate ?? form.firstUnitRate) || 250) / 500).toFixed(2)}/sq ft)</span>
        </div>
      </div>

      <div className="svc-row">
        <label>Additional Rate</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in field-qty"
              type="number"
              min={0}
              step={0.01}
              name="customAdditionalUnitRate"
              value={form.customAdditionalUnitRate !== undefined ? form.customAdditionalUnitRate : (form.additionalUnitRate || 0)}
              onChange={onChange}
              onBlur={handleBlur}
              style={{ backgroundColor: form.customAdditionalUnitRate !== undefined ? '#fffacd' : 'white' }}
              title="Rate per additional 500 sq ft block (from backend, editable)"
            />
          </div>
          <span className="svc-small">/ 500 sq ft (${(((form.customAdditionalUnitRate ?? form.additionalUnitRate) || 125) / 500).toFixed(2)}/sq ft)</span>
        </div>
      </div>

      <div className="svc-row">
        <label>Minimum Charge</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in field-qty"
              type="number"
              min={0}
              step={0.01}
              name="customPerVisitMinimum"
              value={form.customPerVisitMinimum !== undefined ? form.customPerVisitMinimum : (form.perVisitMinimum || 0)}
              onChange={onChange}
              onBlur={handleBlur}
              style={{ backgroundColor: form.customPerVisitMinimum !== undefined ? '#fffacd' : 'white' }}
              title="Minimum charge per visit (from backend, editable)"
            />
          </div>
          <span className="svc-small">/ visit</span>
        </div>
      </div>

      {/* Carpet area row – ____ @ calculated rate = ____ */}
      <div className="svc-row">
        <label>Carpet Area</label>
        <div className="svc-row-right">
          <input
            className="svc-in field-qty"
            type="number"
            name="areaSqFt"
            value={form.areaSqFt}
            onChange={onChange}
          />
          <span className="svc-small">sq ft</span>
          <span>@</span>
          <span className="svc-small">calculated rate</span>
          <span>=</span>
          <div className="svc-dollar field-qty">
            <span>$</span>
            <input
              className="svc-in-box"
              type="number"
              step="0.01"
              name="customPerVisitPrice"
              value={
                form.customPerVisitPrice !== undefined
                  ? form.customPerVisitPrice
                  : calc.perVisitCharge
              }
              onChange={onChange}
              onBlur={handleBlur}
              style={{ backgroundColor: form.customPerVisitPrice !== undefined ? '#fffacd' : 'white' }}
              title="Per visit total (editable)"
            />
          </div>
        </div>
      </div>

      {/* Exact sq ft calculation checkbox */}
      <div className="svc-row">
        <label>Calculation Method</label>
        <div className="svc-row-right">
          <label className="svc-inline">
            <input
              type="checkbox"
              name="useExactSqft"
              checked={form.useExactSqft}
              onChange={onChange}
            />
            <span>Exact sq ft calculation</span>
          </label>
          <small style={{ color: "#666", fontSize: "11px", marginLeft: "10px" }}>
            {form.useExactSqft
              ? "(Excess × $0.25/sq ft)"
              : "(Excess in 500 sq ft blocks × $125)"}
          </small>
        </div>
      </div>

      {/* Frequency selection */}
      <div className="svc-row">
        <label>Frequency</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="frequency"
            value={form.frequency}
            onChange={onChange}
          >
            {Object.entries(carpetFrequencyLabels).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              )
            )}
          </select>
        </div>
      </div>

      {/* Trip & location – visible but $0 in math */}
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

          <label className="svc-inline">
            <input
              type="checkbox"
              name="needsParking"
              checked={form.needsParking}
              onChange={onChange}
            />
            <span>Parking (+$0)</span>
          </label>
        </div>
      </div>

      {/* Trip charge display – locked at 0 */}
      <div className="svc-row">
        <label>Trip Charge</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="text"
            readOnly
            value="$0.00 / visit"
          />
          <span>·</span>
          <input
            className="svc-in"
            type="text"
            readOnly
            value="$0.00 / month"
          />
        </div>
      </div>

      {/* Installation options (same as SaniScrub) */}
      <div className="svc-row">
        <label>Installation</label>
        <div className="svc-row-right">
          <label className="svc-inline">
            <input
              type="checkbox"
              name="includeInstall"
              checked={form.includeInstall}
              onChange={onChange}
            />
            <span>Include Install</span>
          </label>

          {form.includeInstall && (
            <>
              <label className="svc-inline">
                <input
                  type="checkbox"
                  name="isDirtyInstall"
                  checked={form.isDirtyInstall}
                  onChange={onChange}
                />
                <span>Dirty</span>
              </label>
              <div className="svc-dollar">
                <span>×</span>
                <input
                  className="svc-in"
                  type="number"
                  min={0}
                  step={0.1}
                  name={form.isDirtyInstall ? "installMultiplierDirty" : "installMultiplierClean"}
                  value={form.isDirtyInstall ? form.installMultiplierDirty : form.installMultiplierClean}
                  onChange={onChange}
                  title={`${form.isDirtyInstall ? 'Dirty' : 'Clean'} install multiplier (from backend)`}
                />
              </div>
              <span className="svc-small">monthly base</span>
            </>
          )}
        </div>
      </div>

      {/* Installation fee display (when enabled) */}
      {form.includeInstall && calc.installOneTime > 0 && (
        <div className="svc-row svc-row-charge">
          <label>Installation Total</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                type="number"
                step="0.01"
                name="customInstallationFee"
                value={
                  form.customInstallationFee !== undefined
                    ? form.customInstallationFee.toFixed(2)
                    : calc.installOneTime.toFixed(2)
                }
                onChange={onChange}
                onBlur={handleBlur}
                style={{ backgroundColor: form.customInstallationFee !== undefined ? '#fffacd' : 'white' }}
                title="Installation fee total (editable)"
              />
            </div>
          </div>
        </div>
      )}

      {/* Per-Visit Total - Always show */}
      <div className="svc-row svc-row-total">
        <label>Per Visit Total</label>
        <div className="svc-dollar">
          $<input
            type="number"
            step="0.01"
            name="customPerVisitPrice"
            className="svc-in svc-in-small"
            value={
              form.customPerVisitPrice !== undefined
                ? form.customPerVisitPrice.toFixed(2)
                : calc.perVisitCharge.toFixed(2)
            }
            onChange={onChange}
            onBlur={handleBlur}
            style={{
              backgroundColor: form.customPerVisitPrice !== undefined ? '#fffacd' : 'white',
              border: 'none',
              width: '100px'
            }}
            title="Per visit total - editable"
          />
        </div>
      </div>

      {/* Total Price - Show ONLY for oneTime */}
      {form.frequency === "oneTime" && (
        <div className="svc-row svc-row-total">
          <label>Total Price</label>
          <div className="svc-dollar">
            $<input
              type="number"
              step="0.01"
              name="customFirstMonthPrice"
              className="svc-in svc-in-small"
              value={
                form.customFirstMonthPrice !== undefined
                  ? form.customFirstMonthPrice.toFixed(2)
                  : calc.firstMonthTotal.toFixed(2)
              }
              onChange={onChange}
              onBlur={handleBlur}
              style={{
                backgroundColor: form.customFirstMonthPrice !== undefined ? '#fffacd' : 'white',
                border: 'none',
                width: '100px'
              }}
              title="Total price for one-time service - editable"
            />
          </div>
        </div>
      )}

      {/* First Visit Total - Show for visit-based (not oneTime) */}
      {calc.isVisitBasedFrequency && form.frequency !== "oneTime" && (
        <div className="svc-row svc-row-total">
          <label>First Visit Total</label>
          <div className="svc-dollar">
            $<input
              type="number"
              step="0.01"
              name="customFirstMonthPrice"
              className="svc-in svc-in-small"
              value={
                form.customFirstMonthPrice !== undefined
                  ? form.customFirstMonthPrice.toFixed(2)
                  : calc.firstMonthTotal.toFixed(2)
              }
              onChange={onChange}
              onBlur={handleBlur}
              style={{
                backgroundColor: form.customFirstMonthPrice !== undefined ? '#fffacd' : 'white',
                border: 'none',
                width: '100px'
              }}
              title="First visit total - editable"
            />
          </div>
        </div>
      )}

      {/* First Month Total - Hide for oneTime and visit-based */}
      {!calc.isVisitBasedFrequency && form.frequency !== "oneTime" && (
        <div className="svc-row svc-row-total">
          <label>First Month Total</label>
          <div className="svc-dollar">
            $<input
              type="number"
              step="0.01"
              name="customFirstMonthPrice"
              className="svc-in svc-in-small"
              value={
                form.customFirstMonthPrice !== undefined
                  ? form.customFirstMonthPrice.toFixed(2)
                  : calc.firstMonthTotal.toFixed(2)
              }
              onChange={onChange}
              onBlur={handleBlur}
              style={{
                backgroundColor: form.customFirstMonthPrice !== undefined ? '#fffacd' : 'white',
                border: 'none',
                width: '100px'
              }}
              title="First month total - editable"
            />
          </div>
        </div>
      )}

      {/* Monthly Recurring - Hide for oneTime and visit-based */}
      {!calc.isVisitBasedFrequency && form.frequency !== "oneTime" && (
        <div className="svc-row svc-row-total">
          <label>Monthly Recurring</label>
          <div className="svc-dollar">
            $<input
              type="number"
              step="0.01"
              name="customMonthlyRecurring"
              className="svc-in svc-in-small"
              value={
                form.customMonthlyRecurring !== undefined
                  ? form.customMonthlyRecurring.toFixed(2)
                  : calc.monthlyTotal.toFixed(2)
              }
              onChange={onChange}
              onBlur={handleBlur}
              style={{
                backgroundColor: form.customMonthlyRecurring !== undefined ? '#fffacd' : 'white',
                border: 'none',
                width: '100px'
              }}
              title="Monthly recurring - editable"
            />
          </div>
        </div>
      )}

      {/* Contract Total - Hide for oneTime */}
      {form.frequency !== "oneTime" && (
        <div className="svc-row svc-row-total">
          <label>Contract Total</label>
          <div className="svc-row-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select
              className="svc-in"
              name="contractMonths"
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
              {getContractOptions(form.frequency).map((m) => (
                <option key={m} value={m}>
                  {m} months
                </option>
              ))}
            </select>
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>$</span>
            <input
              type="number"
              step="0.01"
              name="customContractTotal"
              className="svc-in"
              value={
                form.customContractTotal !== undefined
                  ? form.customContractTotal.toFixed(2)
                  : calc.contractTotal.toFixed(2)
              }
              onChange={onChange}
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
    </div>
  );
};
