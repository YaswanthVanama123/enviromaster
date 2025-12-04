// src/components/services/janitorial/JanitorialForm.tsx
import React, { useState } from "react";
import { useJanitorialCalc } from "./useJanitorialCalc";
import type { JanitorialFormState } from "./janitorialTypes";
import type { ServiceInitialData, CustomField } from "../common/serviceTypes";

// ServiceCard wrapper component (you may need to import this from your shared components)
const ServiceCard: React.FC<{
  title: string;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
}> = ({ title, children, headerActions }) => (
  <div className="svc-card">
    <div className="svc-h-row">
      <h3 className="svc-h">{title}</h3>
      <div className="svc-h-actions">{headerActions}</div>
    </div>
    {children}
  </div>
);

export const JanitorialForm: React.FC<ServiceInitialData<JanitorialFormState>> = ({
  initialData,
  onRemove
}) => {
  // Get calculation hook
  const { form, onChange, calc, quote, refreshConfig, isLoadingConfig } = useJanitorialCalc(initialData);

  // Custom fields state (for user-added fields)
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  const addCustomField = (type: "text" | "money" | "calc") => {
    const newField: CustomField = {
      id: Date.now().toString(),
      type,
      label: type === "text" ? "Custom Field" : type === "money" ? "Custom Charge" : "Custom Calculation",
      value: type === "calc" ? { qty: 0, rate: 0, total: 0 } : "",
    };
    setCustomFields(prev => [...prev, newField]);
    setShowAddDropdown(false);
  };

  const removeCustomField = (id: string) => {
    setCustomFields(prev => prev.filter(f => f.id !== id));
  };

  const updateCustomField = (id: string, updates: Partial<CustomField>) => {
    setCustomFields(prev =>
      prev.map(f => f.id === id ? { ...f, ...updates } : f)
    );
  };

  return (
    <ServiceCard
      title="Pure Janitorial"
      headerActions={
        <button
          type="button"
          className="svc-mini svc-mini--neg"
          title="Remove service"
          onClick={onRemove}
        >
          –
        </button>
      }
    >
      <div className="svc-form">
        {/* Service Type */}
        <div className="svc-row">
          <label>Service Type</label>
          <div className="svc-row-right">
            <select
              name="serviceType"
              value={form.serviceType}
              onChange={onChange}
              className="svc-in"
            >
              <option value="recurringService">Recurring Service</option>
              <option value="oneTimeService">One-Time Service</option>
            </select>
          </div>
        </div>

        {/* Base Service Hours - Calculation Row */}
        <div className="svc-row">
          <label>Service</label>
          <div className="svc-row-right">
            <div className="svc-inline svc-inline--tight">
              <input
                name="baseHours"
                className="svc-in sm"
                type="number"
                step="0.01"
                value={form.baseHours}
                onChange={onChange}
              />
              <span>@</span>
              <input
                name={form.serviceType === "recurringService" ? "recurringServiceRate" : "oneTimeServiceRate"}
                className="svc-in sm"
                type="number"
                value={form.serviceType === "recurringService" ? form.recurringServiceRate : form.oneTimeServiceRate}
                onChange={onChange}
              />
              <span>=</span>
              <input
                className="svc-in sm"
                type="number"
                value={calc.baseServiceCost.toFixed(2)}
                readOnly
                style={{ backgroundColor: "#f5f5f5" }}
              />
            </div>
          </div>
        </div>

        {/* Vacuuming */}
        <div className="svc-row">
          <label>Vacuuming</label>
          <div className="svc-row-right">
            <input
              name="vacuumingHours"
              className="svc-in"
              type="text"
              value={`${form.vacuumingHours} hours`}
              onChange={(e) => {
                const hours = parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0;
                onChange({
                  target: { name: "vacuumingHours", value: hours.toString() }
                } as any);
              }}
            />
          </div>
        </div>

        {/* Dusting */}
        <div className="svc-row">
          <label>Dusting</label>
          <div className="svc-row-right">
            <input
              name="dustingHours"
              className="svc-in"
              type="text"
              value={`${form.dustingHours} places`}
              onChange={(e) => {
                const places = parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0;
                onChange({
                  target: { name: "dustingHours", value: places.toString() }
                } as any);
              }}
            />
          </div>
        </div>

        {/* Frequency */}
        <div className="svc-row">
          <label>Frequency</label>
          <div className="svc-row-right">
            <select
              name="frequency"
              value={form.frequency}
              onChange={onChange}
              className="svc-in"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
              <option value="oneTime">One-Time</option>
            </select>
          </div>
        </div>

        {/* Location */}
        <div className="svc-row">
          <label>Location</label>
          <div className="svc-row-right">
            <select
              name="location"
              value={form.location}
              onChange={onChange}
              className="svc-in"
            >
              <option value="insideBeltway">Inside Beltway</option>
              <option value="outsideBeltway">Outside Beltway</option>
              <option value="paidParking">Paid Parking</option>
            </select>
          </div>
        </div>

        {/* Parking Cost (conditional) */}
        {form.location === "paidParking" && (
          <div className="svc-row">
            <label>Parking Cost</label>
            <div className="svc-row-right">
              <div className="svc-dollar">
                <span>$</span>
                <input
                  name="parkingCost"
                  className="svc-in-box"
                  type="number"
                  step="0.01"
                  value={form.parkingCost}
                  onChange={onChange}
                />
              </div>
            </div>
          </div>
        )}

        {/* Contract Months (for recurring) */}
        {form.serviceType === "recurringService" && (
          <div className="svc-row">
            <label>Contract Months</label>
            <div className="svc-row-right">
              <input
                name="contractMonths"
                className="svc-in"
                type="number"
                min="1"
                value={form.contractMonths}
                onChange={onChange}
              />
            </div>
          </div>
        )}

        {/* Custom Fields */}
        {customFields.map((field) => (
          <div key={field.id} className="svc-row">
            <input
              className="svc-label-edit"
              value={field.label}
              onChange={(e) => updateCustomField(field.id, { label: e.target.value })}
            />
            <div className="svc-row-right">
              {field.type === "text" && (
                <input
                  className="svc-in"
                  value={field.value as string}
                  onChange={(e) => updateCustomField(field.id, { value: e.target.value })}
                />
              )}
              {field.type === "money" && (
                <div className="svc-dollar">
                  <span>$</span>
                  <input
                    className="svc-in-box"
                    type="number"
                    step="0.01"
                    value={field.value as string}
                    onChange={(e) => updateCustomField(field.id, { value: e.target.value })}
                  />
                </div>
              )}
              {field.type === "calc" && (
                <div className="svc-inline svc-inline--tight">
                  <input
                    className="svc-in sm"
                    type="number"
                    value={(field.value as any).qty || 0}
                    onChange={(e) => updateCustomField(field.id, {
                      value: { ...(field.value as any), qty: Number(e.target.value) }
                    })}
                  />
                  <span>@</span>
                  <input
                    className="svc-in sm"
                    type="number"
                    value={(field.value as any).rate || 0}
                    onChange={(e) => updateCustomField(field.id, {
                      value: { ...(field.value as any), rate: Number(e.target.value) }
                    })}
                  />
                  <span>=</span>
                  <input
                    className="svc-in sm"
                    type="number"
                    value={((field.value as any).qty || 0) * ((field.value as any).rate || 0)}
                    readOnly
                    style={{ backgroundColor: "#f5f5f5" }}
                  />
                </div>
              )}
              <button
                type="button"
                className="svc-mini svc-mini--inline"
                title="Remove"
                onClick={() => removeCustomField(field.id)}
              >
                –
              </button>
            </div>
          </div>
        ))}

        {/* Add Field Dropdown */}
        <div className="svc-chooser-wrap">
          <button
            type="button"
            className="svc-mini"
            title="Add field"
            onClick={() => setShowAddDropdown(!showAddDropdown)}
          >
            +
          </button>
          {showAddDropdown && (
            <div className="svc-chooser">
              <button
                type="button"
                className="svc-btn svc-btn--small"
                onClick={() => addCustomField("text")}
              >
                Text
              </button>
              <button
                type="button"
                className="svc-btn svc-btn--small"
                onClick={() => addCustomField("money")}
              >
                Money
              </button>
              <button
                type="button"
                className="svc-btn svc-btn--small"
                onClick={() => addCustomField("calc")}
              >
                Calc
              </button>
              <button
                type="button"
                className="svc-mini svc-mini--neg"
                title="Close"
                onClick={() => setShowAddDropdown(false)}
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* Pricing Summary */}
        <div className="svc-summary">
          <div className="svc-summary-row">
            <span>Per Visit:</span>
            <span className="svc-summary-amount">${quote.perVisitPrice.toFixed(2)}</span>
          </div>
          <div className="svc-summary-row">
            <span>Monthly:</span>
            <span className="svc-summary-amount">${quote.monthlyPrice.toFixed(2)}</span>
          </div>
          {form.serviceType === "recurringService" && (
            <div className="svc-summary-row">
              <span>Contract Total ({form.contractMonths} months):</span>
              <span className="svc-summary-amount">${quote.contractTotal.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Applied Rules */}
        {calc.appliedRules.length > 0 && (
          <div className="svc-details">
            <small>Applied Rules:</small>
            <ul>
              {calc.appliedRules.map((rule, i) => (
                <li key={i} style={{ fontSize: "11px", color: "#666" }}>{rule}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Loading indicator */}
        {isLoadingConfig && (
          <div className="svc-loading">Loading pricing configuration...</div>
        )}
      </div>
    </ServiceCard>
  );
};