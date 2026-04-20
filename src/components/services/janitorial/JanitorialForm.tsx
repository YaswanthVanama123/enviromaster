
import React, { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSync, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { useJanitorialCalc } from "./useJanitorialCalc";
import type { JanitorialFormState } from "./janitorialTypes";
import type { ServiceInitialData, CustomField } from "../common/serviceTypes";
import { useServicesContextOptional } from "../ServicesContext";


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

  const { form, onChange, calc, quote, refreshConfig, isLoadingConfig, updateField } = useJanitorialCalc(initialData);


  const [customFields, setCustomFields] = useState<CustomField[]>([]);
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


  const handleLocalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;


    setEditingValues(prev => ({ ...prev, [name]: value }));


    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      updateField(name as keyof JanitorialFormState, numValue as any);
    } else if (value === '') {

      updateField(name as keyof JanitorialFormState, undefined as any);
    }
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
        updateField(name as keyof JanitorialFormState, undefined as any);
        return;
      }


      updateField(name as keyof JanitorialFormState, numValue as any);
    }
  };


  const servicesContext = useServicesContextOptional();
  const prevDataRef = useRef<string>('');


  useEffect(() => {
    if (servicesContext) {


      const hasCustomFieldValues = customFields.some(f =>
        (f.type === 'dollar' && !!f.value && parseFloat(f.value) > 0) ||
        (f.type === 'calc' && !!f.calcValues?.right && parseFloat(f.calcValues.right) > 0)
      );
      const customFieldsTotal = customFields.reduce((sum, f) => {
        if (f.type === 'dollar' && f.value) return sum + (parseFloat(f.value) || 0);
        if (f.type === 'calc' && f.calcValues?.right) return sum + (parseFloat(f.calcValues.right) || 0);
        return sum;
      }, 0);
      const isActive = form.baseHours > 0 || hasCustomFieldValues;

      const data = isActive ? {
        serviceId: "janitorial" as const,
        displayName: "Pure Janitorial",
        isActive: true,


        recurringServiceRate: form.customRecurringServiceRate ?? form.recurringServiceRate,
        oneTimeServiceRate: form.customOneTimeServiceRate ?? form.oneTimeServiceRate,
        vacuumingRatePerHour: form.customVacuumingRatePerHour ?? form.vacuumingRatePerHour,
        dustingRatePerHour: form.customDustingRatePerHour ?? form.dustingRatePerHour,
        perVisitMinimum: form.customPerVisitMinimum ?? form.perVisitMinimum,
        recurringContractMinimum: form.customRecurringContractMinimum ?? form.recurringContractMinimum,
        standardTripCharge: form.customStandardTripCharge ?? form.standardTripCharge,
        beltwayTripCharge: form.customBeltwayTripCharge ?? form.beltwayTripCharge,
        paidParkingTripCharge: form.customPaidParkingTripCharge ?? form.paidParkingTripCharge,
        dailyMultiplier: form.customDailyMultiplier ?? form.dailyMultiplier,
        weeklyMultiplier: form.customWeeklyMultiplier ?? form.weeklyMultiplier,
        biweeklyMultiplier: form.customBiweeklyMultiplier ?? form.biweeklyMultiplier,
        monthlyMultiplier: form.customMonthlyMultiplier ?? form.monthlyMultiplier,
        oneTimeMultiplier: form.customOneTimeMultiplier ?? form.oneTimeMultiplier,


        baseHours: form.baseHours,
        vacuumingHours: form.vacuumingHours,
        dustingHours: form.dustingHours,
        parkingCost: form.parkingCost,
        contractMonths: form.contractMonths,
        serviceTypeRaw: form.serviceType,
        frequencyRaw: form.frequency,
        locationRaw: form.location,
        needsParking: form.needsParking,


        perVisitBase: calc.baseServiceCost + calc.vacuumingCost + calc.dustingCost + calc.tripCharge,  
        perVisit: calc.perVisit,  


        serviceType: {
          label: "Service Type",
          type: "text" as const,
          value: form.serviceType === "recurringService" ? "Recurring Service" : "One-Time Service"
        },


        service: {
          label: "Service",
          type: "calc" as const,
          qty: Math.round(form.baseHours * 100) / 100, 
          rate: form.serviceType === "recurringService" ? form.recurringServiceRate : form.oneTimeServiceRate,
          total: Number(calc.baseServiceCost.toFixed(2)),
          unit: "hours"
        },


        vacuuming: {
          label: "Vacuuming",
          type: "text" as const,
          value: `${form.vacuumingHours} hours`
        },


        dusting: {
          label: "Dusting",
          type: "text" as const,
          value: `${form.dustingHours} places`
        },


        ...(form.serviceType === "recurringService" && {
          frequency: {
            label: "Frequency",
            type: "text" as const,
            value: form.frequency.charAt(0).toUpperCase() + form.frequency.slice(1)
          }
        }),


        location: {
          label: "Location",
          type: "text" as const,
          value: form.location === "insideBeltway" ? "Inside Beltway" :
                 form.location === "outsideBeltway" ? "Outside Beltway" :
                 "Paid Parking"
        },


        ...customFields.reduce((acc, field, index) => {
          const key = `custom_${index}`;
          if (field.type === "calc") {
            const calcValue = field.value as { qty: number; rate: number; total: number };
            acc[key] = {
              label: field.label,
              type: "calc" as const,
              qty: calcValue.qty,
              rate: calcValue.rate,
              total: calcValue.total
            };
          } else if (field.type === "dollar" || field.type === "money") {
            acc[key] = {
              label: field.label,
              type: "dollar" as const,
              amount: Number(field.value) || 0
            };
          } else {
            acc[key] = {
              label: field.label,
              type: "text" as const,
              value: field.value as string
            };
          }
          return acc;
        }, {} as Record<string, any>),


        totals: {
          perVisit: {
            label: "Per Visit Total",
            type: "dollar" as const,
            amount: quote.perVisitPrice
          },
          monthly: {
            label: "Monthly Total",
            type: "dollar" as const,
            amount: quote.monthlyPrice
          },
          ...(form.serviceType === "recurringService" && {
            contract: {
              label: "Contract Total",
              type: "dollar" as const,
              months: form.contractMonths,
              amount: quote.contractTotal + customFieldsTotal
            }
          })
        },

        notes: "", 
        customFields: customFields
      } : null;


      const dataStr = JSON.stringify(data);
      if (dataStr !== prevDataRef.current) {
        prevDataRef.current = dataStr;
        servicesContext.updateService("janitorial", data);
      }
    }
  }, [form, calc, quote, customFields, servicesContext]);

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
        <>
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
            className="svc-mini svc-mini--neg"
            title="Remove service"
            onClick={onRemove}
          >
            –
          </button>
        </>
      }
    >
      <div className="svc-form">
        {}
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

        {}
        <div className="svc-row">
          <label>Service</label>
          <div className="svc-row-right">
            <div className="svc-inline svc-inline--tight">
              <input
                name="baseHours"
                className="svc-in sm"
                type="number"
                min="0"
                step="0.01"
                value={form.baseHours || ""}
                onChange={onChange}
              />
              <span>@</span>
              <span>$</span>
              <input
                name={form.serviceType === "recurringService" ? "customRecurringServiceRate" : "customOneTimeServiceRate"}
                className="svc-in sm"
                type="number"
                min="0"
                step="0.01"
                value={getDisplayValue(
                  form.serviceType === "recurringService" ? 'customRecurringServiceRate' : 'customOneTimeServiceRate',
                  form.serviceType === "recurringService"
                    ? (form.customRecurringServiceRate !== undefined ? form.customRecurringServiceRate : form.recurringServiceRate)
                    : (form.customOneTimeServiceRate !== undefined ? form.customOneTimeServiceRate : form.oneTimeServiceRate)
                )}
                onChange={handleLocalChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                title={form.serviceType === "recurringService" ? "Recurring service rate (editable with yellow highlight if overridden)" : "One-time service rate (editable with yellow highlight if overridden)"}
                style={{
                  backgroundColor: form.serviceType === "recurringService"
                    ? (form.customRecurringServiceRate !== undefined ? '#fffacd' : 'white')
                    : (form.customOneTimeServiceRate !== undefined ? '#fffacd' : 'white')
                }}
              />
              <span>=</span>
              <span>$</span>
              <input
                className="svc-in sm"
                type="number"
                min="0"
                value={calc.baseServiceCost.toFixed(2)}
                readOnly
                style={{ backgroundColor: "#f5f5f5" }}
              />
            </div>
          </div>
        </div>

        {}
        <div className="svc-row">
          <label>Vacuuming</label>
          <div className="svc-row-right">
            <div className="svc-inline svc-inline--tight">
              <input
                name="vacuumingHours"
                className="svc-in sm"
                type="number"
                min="0"
                step="0.01"
                value={form.vacuumingHours || ""}
                onChange={onChange}
              />
              <span>hrs @</span>
              <span>$</span>
              <input
                name="customVacuumingRatePerHour"
                className="svc-in sm"
                type="number"
                min="0"
                step="0.01"
                value={getDisplayValue(
                  'customVacuumingRatePerHour',
                  form.customVacuumingRatePerHour !== undefined ? form.customVacuumingRatePerHour : form.vacuumingRatePerHour
                )}
                onChange={handleLocalChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                title="Vacuuming rate per hour (editable with yellow highlight if overridden)"
                style={{
                  backgroundColor: form.customVacuumingRatePerHour !== undefined ? '#fffacd' : 'white'
                }}
              />
              <span>=</span>
              <span>$</span>
              <input
                className="svc-in sm"
                type="number"
                min="0"
                value={calc.vacuumingCost.toFixed(2)}
                readOnly
                style={{ backgroundColor: "#f5f5f5" }}
              />
            </div>
          </div>
        </div>

        {}
        <div className="svc-row">
          <label>Dusting</label>
          <div className="svc-row-right">
            <div className="svc-inline svc-inline--tight">
              <input
                name="dustingHours"
                className="svc-in sm"
                type="number"
                min="0"
                step="0.01"
                value={form.dustingHours || ""}
                onChange={onChange}
              />
              <span>places @</span>
              <span>$</span>
              <input
                name="customDustingRatePerHour"
                className="svc-in sm"
                type="number"
                min="0"
                step="0.01"
                value={getDisplayValue(
                  'customDustingRatePerHour',
                  form.customDustingRatePerHour !== undefined ? form.customDustingRatePerHour : form.dustingRatePerHour
                )}
                onChange={handleLocalChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                title="Dusting rate per place (editable with yellow highlight if overridden)"
                style={{
                  backgroundColor: form.customDustingRatePerHour !== undefined ? '#fffacd' : 'white'
                }}
              />
              <span>=</span>
              <span>$</span>
              <input
                className="svc-in sm"
                type="number"
                min="0"
                value={calc.dustingCost.toFixed(2)}
                readOnly
                style={{ backgroundColor: "#f5f5f5" }}
              />
            </div>
          </div>
        </div>

        {}
        {form.serviceType === "recurringService" && (
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
              </select>
            </div>
          </div>
        )}

        {}
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

        {}
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
            min="0"
                  step="0.01"
                  value={form.parkingCost || ""}
                  onChange={onChange}
                />
              </div>
            </div>
          </div>
        )}

        {}
        {form.serviceType === "recurringService" && (
          <div className="svc-row">
            <label>Contract Months</label>
            <div className="svc-row-right">
              <input
                name="contractMonths"
                className="svc-in"
                type="number"
                min="1"
                value={form.contractMonths || ""}
                onChange={onChange}
              />
            </div>
          </div>
        )}

        {}
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
            min="0"
                    step="0.01"
                    value={field.value as string || ""}
                    onChange={(e) => updateCustomField(field.id, { value: e.target.value })}
                  />
                </div>
              )}
              {field.type === "calc" && (
                <div className="svc-inline svc-inline--tight">
                  <input
                    className="svc-in sm"
                    type="number"
            min="0"
                    value={(field.value as any).qty || 0 || ""}
                    onChange={(e) => updateCustomField(field.id, {
                      value: { ...(field.value as any), qty: Number(e.target.value) }
                    })}
                  />
                  <span>@</span>
                  <span>$</span>
                  <input
                    className="svc-in sm"
                    type="number"
            min="0"
                    value={(field.value as any).rate || 0 || ""}
                    onChange={(e) => updateCustomField(field.id, {
                      value: { ...(field.value as any), rate: Number(e.target.value) }
                    })}
                  />
                  <span>=</span>
                  <span>$</span>
                  <input
                    className="svc-in sm"
                    type="number"
            min="0"
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

        {}
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

        {}
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

        {}
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

        {}
        {isLoadingConfig && (
          <div className="svc-loading">Loading pricing configuration...</div>
        )}
      </div>
    </ServiceCard>
  );
};
