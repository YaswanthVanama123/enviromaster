// src/components/services/electrostaticSpray/ElectrostaticSprayForm.tsx

import React, { useEffect, useRef, useState } from "react";
import { useElectrostaticSprayCalc } from "./useElectrostaticSprayCalc";
import type { ElectrostaticSprayFormState } from "./electrostaticSprayTypes";
import { electrostaticSprayPricingConfig as cfg } from "./electrostaticSprayConfig";
import type { ServiceInitialData } from "../common/serviceTypes";
import { useServicesContextOptional } from "../ServicesContext";
import { CustomFieldManager, type CustomField } from "../CustomFieldManager";

const fmt = (n: number): string => (n > 0 ? n.toFixed(2) : "0.00");

export const ElectrostaticSprayForm: React.FC<ServiceInitialData<ElectrostaticSprayFormState>> = ({
  initialData,
  onRemove,
}) => {
  const { form, setForm, onChange, calc, isLoadingConfig } = useElectrostaticSprayCalc(initialData);
  const servicesContext = useServicesContextOptional();

  // Custom fields state - initialize with initialData if available
  const [customFields, setCustomFields] = useState<CustomField[]>(
    initialData?.customFields || []
  );
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  // Save form data to context for form submission
  const prevDataRef = useRef<string>("");

  // Calculate effective rate for payload
  const serviceRate = form.pricingMethod === "byRoom"
    ? form.ratePerRoom
    : form.ratePerThousandSqFt;

  useEffect(() => {
    if (servicesContext) {
      const isActive = (form.roomCount > 0 || form.squareFeet > 0);

      const data = isActive ? {
        serviceId: "electrostaticSpray",
        displayName: "Electrostatic Spray",
        isActive: true,

        pricingMethod: {
          label: "Pricing Method",
          type: "text" as const,
          value: form.pricingMethod === "byRoom" ? "By Room" : "By Square Feet",
        },

        frequency: {
          label: "Frequency",
          type: "text" as const,
          value: typeof form.frequency === 'string'
            ? form.frequency.charAt(0).toUpperCase() + form.frequency.slice(1)
            : String(form.frequency || 'Weekly'),
        },

        location: {
          label: "Location",
          type: "text" as const,
          value: form.location === "insideBeltway" ? "Inside Beltway" :
                 form.location === "outsideBeltway" ? "Outside Beltway" : "Standard",
        },

        ...(form.isCombinedWithSaniClean ? {
          combinedService: {
            label: "Combined with",
            type: "text" as const,
            value: "Sani-Clean",
          },
        } : {}),

        service: {
          label: form.pricingMethod === "byRoom" ? "Rooms" : "Square Feet",
          type: "calc" as const,
          qty: form.pricingMethod === "byRoom" ? form.roomCount : form.squareFeet,
          rate: serviceRate,
          total: calc.serviceCharge,
          unit: form.pricingMethod === "byRoom" ? "rooms" : "sq ft",
        },

        ...(calc.tripCharge > 0 ? {
          tripCharge: {
            label: "Trip Charge",
            type: "dollar" as const,
            amount: calc.tripCharge,
          },
        } : {}),

        totals: {
          perVisit: {
            label: "Per Visit Total",
            type: "dollar" as const,
            amount: calc.perVisit,
          },
          monthly: {
            label: "Monthly Total",
            type: "dollar" as const,
            amount: calc.monthlyRecurring,
          },
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
        console.log('🔧 [ElectrostaticSpray] Sending to context:', JSON.stringify(data, null, 2));
        servicesContext.updateService("electrostaticSpray", data);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, calc, customFields]);

  return (
    <div className="svc-card">
      <div className="svc-card__inner">
        <div className="svc-h-row">
          <div className="svc-h">ELECTROSTATIC SPRAY</div>
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

        {/* Loading indicator */}
        {isLoadingConfig && (
          <div className="svc-row">
            <div className="svc-field" style={{ textAlign: 'center', padding: '10px', color: '#666' }}>
              Loading pricing configuration...
            </div>
          </div>
        )}

        {/* Custom fields manager */}
        <CustomFieldManager
          fields={customFields}
          onFieldsChange={setCustomFields}
          showAddDropdown={showAddDropdown}
          onToggleAddDropdown={setShowAddDropdown}
        />

        {/* Pricing Method */}
        <div className="svc-row">
          <div className="svc-label">
            <span>Pricing Method</span>
          </div>
          <div className="svc-field">
            <select
              name="pricingMethod"
              className="svc-in"
              value={form.pricingMethod}
              onChange={onChange}
            >
              <option value="byRoom">By Room ($20 per room)</option>
              <option value="bySqFt">By Square Feet ($50 per 1000 sq ft)</option>
            </select>
          </div>
        </div>

        {/* Room Count (if by room) */}
        {form.pricingMethod === "byRoom" && (
          <div className="svc-row">
            <div className="svc-label">
            <span>Room Count</span>
            </div>
            <div className="svc-field">
              <input
                type="number"
                name="roomCount"
                min={0}
                className="svc-in sm"
                value={form.roomCount}
                onChange={onChange}
              />
            </div>
          </div>
        )}

        {/* Square Feet (if by sq ft) */}
        {form.pricingMethod === "bySqFt" && (
          <div className="svc-row">
            <div className="svc-label">
              <span>Square Feet</span>
            </div>
            <div className="svc-field">
              <input
                type="number"
                name="squareFeet"
                min={0}
                className="svc-in sm"
                value={form.squareFeet}
                onChange={onChange}
              />
            </div>
          </div>
        )}

        {/* Frequency */}
        <div className="svc-row">
          <div className="svc-label">
            <span>Frequency</span>
          </div>
          <div className="svc-field">
            <select
              name="frequency"
              className="svc-in"
              value={form.frequency}
              onChange={onChange}
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-Weekly (every 2 weeks)</option>
              <option value="monthly">Monthly</option>
              <option value="bimonthly">Bi-Monthly (every 2 months)</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>
        </div>

        {/* Location */}
        <div className="svc-row">
          <div className="svc-label">
            <span>Location</span>
          </div>
          <div className="svc-field">
            <select
              name="location"
              className="svc-in"
              value={form.location}
              onChange={onChange}
            >
              <option value="standard">Standard</option>
              <option value="insideBeltway">Inside Beltway</option>
              <option value="outsideBeltway">Outside Beltway</option>
            </select>
          </div>
        </div>

        {/* Combined with Sani-Clean */}
        <div className="svc-row">
          <div className="svc-label" />
          <div className="svc-field">
            <label>
              <input
                type="checkbox"
                name="isCombinedWithSaniClean"
                checked={form.isCombinedWithSaniClean}
                onChange={onChange}
              />{" "}
              Combined with Sani-Clean
            </label>
          </div>
        </div>

        {/* Value Proposition Info */}
        <div className="svc-row">
          <div className="svc-label">
            <span className="svc-note">Value:</span>
          </div>
          <div className="svc-field">
            <span className="svc-note">
              {cfg.valueProposition.bacteriaReduction} reduction in bacteria in air and walls.
              Bathroom goes from clean to {cfg.valueProposition.cleanlinessLevel.toLowerCase()}.
            </span>
          </div>
        </div>

        {/* SUMMARY / RESULTS */}
        <div className="svc-summary">
          {/* Service Charge */}
          <div className="svc-row">
            <div className="svc-label">
              <span>Service Charge</span>
            </div>
            <div className="svc-field svc-dollar">
              <span>$</span>
              <input
                readOnly
                className="svc-in sm"
                value={fmt(calc.serviceCharge)}
              />
            </div>
          </div>

          {/* Trip Charge */}
          {!form.isCombinedWithSaniClean && (
            <div className="svc-row">
              <div className="svc-label">
                <span>Trip Charge</span>
              </div>
              <div className="svc-field svc-dollar">
                <span>$</span>
                <input
                  readOnly
                  className="svc-in sm"
                  value={fmt(calc.tripCharge)}
                />
              </div>
            </div>
          )}

          {/* Per Visit Total */}
          <div className="svc-row">
            <div className="svc-label">
              <span>Per Visit Total</span>
            </div>
            <div className="svc-field svc-dollar">
              <span>$</span>
              <input
                readOnly
                className="svc-in sm"
                value={fmt(calc.perVisit)}
              />
            </div>
          </div>

          {/* Contract Length */}
          <div className="svc-row">
            <div className="svc-label">
            <span>Contract Length (Months)</span>
            </div>
            <div className="svc-field">
              <select
                name="contractMonths"
                className="svc-in sm"
                value={form.contractMonths}
                onChange={onChange}
              >
                {Array.from(
                  { length: cfg.maxContractMonths - cfg.minContractMonths + 1 },
                  (_, i) => {
                    const m = cfg.minContractMonths + i;
                    return (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    );
                  }
                )}
              </select>
            </div>
          </div>

          {/* Monthly Recurring */}
          <div className="svc-row">
            <div className="svc-label">
              <span>Monthly Recurring</span>
            </div>
            <div className="svc-field svc-dollar">
              <span>$</span>
              <input
                readOnly
                className="svc-in sm"
                value={fmt(calc.monthlyRecurring)}
              />
            </div>
          </div>

          {/* Contract Total */}
          <div className="svc-row">
            <div className="svc-label">
              <span>Contract Total ({form.contractMonths} months)</span>
            </div>
            <div className="svc-field svc-dollar">
              <span>$</span>
              <input
                readOnly
                className="svc-in sm"
                value={fmt(calc.contractTotal)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="svc-row">
            <div className="svc-label">
              <span>Notes</span>
            </div>
            <div className="svc-field">
              <textarea
                name="notes"
                className="svc-in"
                rows={3}
                value={form.notes}
                onChange={onChange as any}
                placeholder="Additional notes..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
