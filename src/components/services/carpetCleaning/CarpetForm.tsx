import React, { useEffect, useRef, useState } from "react";
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
  const { form, onChange, quote, calc, refreshConfig, isLoadingConfig } = useCarpetCalc(initialData);
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
      const isActive = (form.areaSqFt ?? 0) > 0;

      const data = isActive ? {
        serviceId: "carpetclean",
        displayName: "Carpet Cleaning",
        isActive: true,

        frequency: {
          label: "Frequency",
          type: "text" as const,
          value: carpetFrequencyLabels[form.frequency] || form.frequency,
        },

        location: {
          label: "Location",
          type: "text" as const,
          value: form.location === "insideBeltway" ? "Inside Beltway" : "Outside Beltway",
        },

        service: {
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
            label: "Per Visit Total",
            type: "dollar" as const,
            amount: calc.perVisitCharge,
          },
          monthly: {
            label: "Monthly Total",
            type: "dollar" as const,
            amount: calc.monthlyTotal,
          },
          ...(form.includeInstall && calc.firstMonthTotal > 0 ? {
            firstMonth: {
              label: "First Month",
              type: "dollar" as const,
              amount: calc.firstMonthTotal,
            },
          } : {}),
          contract: {
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

      {/* Carpet area row – ____ @ ____ = ____ */}
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
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in field-qty"
              type="number"
              min={0}
              step={0.01}
              name="firstUnitRate"
              value={form.firstUnitRate}
              onChange={onChange}
              title="Rate per 500 sq ft (from backend, editable)"
            />
          </div>
          {/* <span className="svc-small">/ 500 sq ft</span> */}
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
              style={{ backgroundColor: form.customPerVisitPrice !== undefined ? '#fffacd' : 'white' }}
              title="Per visit total (editable)"
            />
          </div>
          {/* <span className="svc-small">(min $</span> */}
          {/* <input
            className="svc-in field-qty"
            type="number"
            min={0}
            step={0.01}
            name="perVisitMinimum"
            value={form.perVisitMinimum}
            onChange={onChange}
            title="Minimum per visit (from backend, editable)"
          />
          <span>)</span> */}
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
                type="text"
                readOnly
                value={calc.installOneTime.toFixed(2)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Monthly recurring charge - only show for month-based frequencies */}
      {!calc.isVisitBasedFrequency && (
        <div className="svc-row svc-row-charge">
          <label>Monthly Recurring</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                type="text"
                readOnly
                value={calc.monthlyTotal.toFixed(2)}
              />
            </div>
          </div>
        </div>
      )}

      {/* First month total / First Visit total (when installation is included) */}
      {form.includeInstall && calc.firstMonthTotal > 0 && (
        <div className="svc-row svc-row-charge">
          <label>{calc.isVisitBasedFrequency ? "First Visit Total" : "First Month Total"}</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                type="text"
                readOnly
                value={calc.firstMonthTotal.toFixed(2)}
              />
            </div>
          </div>
        </div>
      )}


      {/* Per-Visit Effective (just the per-visit service price) */}
      <div className="svc-row svc-row-charge">
        <label>Per-Visit Total</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="text"
              readOnly
              value={calc.perVisitEffective.toFixed(2)}
            />
          </div>
        </div>
      </div>

      {/* Contract total: frequency-specific months */}
      <div className="svc-row svc-row-charge">
        <label>Contract Total</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="contractMonths"
            value={form.contractMonths}
            onChange={onChange}
          >
            {getContractOptions(form.frequency).map((months) => (
              <option key={months} value={months}>
                {months} mo
              </option>
            ))}
          </select>
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="text"
              readOnly
              value={calc.contractTotal.toFixed(2)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
