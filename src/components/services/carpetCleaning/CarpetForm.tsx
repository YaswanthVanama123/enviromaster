import React, { useEffect, useRef, useState } from "react";
import { useCarpetCalc } from "./useCarpetCalc";
import type { CarpetFormState } from "./carpetTypes";
import type { ServiceInitialData } from "../common/serviceTypes";
import { carpetFrequencyLabels } from "./carpetConfig";
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
> = ({ initialData, onQuoteChange }) => {
  const { form, onChange, quote, calc } = useCarpetCalc(initialData);
  const servicesContext = useServicesContextOptional();

  // Custom fields state
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  // Save form data to context for form submission
  const prevDataRef = useRef<string>("");

  useEffect(() => {
    if (servicesContext) {
      const isActive = (form.sqft ?? 0) > 0;
      const data = isActive ? { ...form, ...calc, isActive } : null;
      const dataStr = JSON.stringify(data);

      if (dataStr !== prevDataRef.current) {
        prevDataRef.current = dataStr;
        servicesContext.updateService("carpetclean", data);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, calc]);

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
            className="svc-btn svc-btn--small"
            onClick={() => setShowAddDropdown(!showAddDropdown)}
          >
            + Field
          </button>
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
        <label>Carpet Area Sq Ft</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="areaSqFt"
            value={form.areaSqFt}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in"
            type="text"
            readOnly
            value="1st 500 = 250; +125/500"
          />
          <span>=</span>
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={
              calc.perVisitCharge > 0
                ? `$${calc.perVisitCharge.toFixed(2)} / visit`
                : "$0.00 / visit"
            }
          />
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
        <label>Trip &amp; Location</label>
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
            <span>Parking Needed (+$0)</span>
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
        <label>Installation Fee</label>
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
                <span>Dirty (3×)</span>
              </label>
              <span className="svc-small">
                {form.isDirtyInstall ? "3× monthly base" : "1× monthly base"}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Installation fee display (when enabled) */}
      {form.includeInstall && calc.installOneTime > 0 && (
        <div className="svc-row svc-row-charge">
          <label>Installation (One-Time)</label>
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

      {/* Monthly recurring charge */}
      <div className="svc-row svc-row-charge">
        <label>Monthly Carpet Clean</label>
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

      {/* First month total (when installation is included) */}
      {form.includeInstall && calc.firstMonthTotal > 0 && (
        <div className="svc-row svc-row-charge">
          <label>First Month (Install + Service)</label>
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

      {/* Contract total: 2–36 months */}
      <div className="svc-row svc-row-charge">
        <label>Contract Total</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="contractMonths"
            value={form.contractMonths}
            onChange={onChange}
          >
            {Array.from({ length: 35 }, (_, i) => i + 2).map((months) => (
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

      {/* Per-Visit Effective (just the per-visit service price) */}
      <div className="svc-row svc-row-charge">
        <label>Per-Visit Effective</label>
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
    </div>
  );
};
