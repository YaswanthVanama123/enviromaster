import React, { useEffect, useState, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSync, faSpinner } from "@fortawesome/free-solid-svg-icons";
import "../ServicesSection.css";
import { useSanicleanCalc } from "./useSanicleanCalc";
import type { SanicleanFormState } from "./sanicleanTypes";
import type { ServiceInitialData } from "../common/serviceTypes";
import { useServicesContextOptional } from "../ServicesContext";
import { CustomFieldManager, type CustomField } from "../CustomFieldManager";

const formatMoney = (n: number): string => `$${(isNaN(n) ? 0 : n).toFixed(2)}`;
const safeNumber = (n: any): number => (typeof n === "number" && !isNaN(n)) ? n : 0;

export const SanicleanForm: React.FC<
  ServiceInitialData<SanicleanFormState>
> = ({ initialData, onRemove }) => {
  const {
    form,
    quote,
    fetchPricing,
    isLoadingConfig,
    updateForm,
    setPricingMode,
    setLocation,
    setSoapType,
    setRateTier,
    setNotes,
  } = useSanicleanCalc(initialData);

  const servicesContext = useServicesContextOptional();

  // Custom fields state
  const [customFields, setCustomFields] = useState<CustomField[]>(
    initialData?.customFields || []
  );
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  const prevDataRef = useRef<string>("");

  // Calculate derived values
  const fixtures = form.sinks + form.urinals + form.maleToilets + form.femaleToilets;
  const soapDispensers = form.sinks; // 1 soap dispenser per sink

  const isAllInclusive = form.pricingMode === "all_inclusive";

  const luxuryUpgradeWeekly = form.soapType === "luxury" && soapDispensers > 0
    ? soapDispensers * form.luxuryUpgradePerDispenser
    : 0;

  const extraSoapRatePerGallon = form.soapType === "luxury"
    ? form.excessLuxurySoapRate
    : form.excessStandardSoapRate;

  const extraSoapWeekly = Math.max(0, form.excessSoapGallonsPerWeek) * extraSoapRatePerGallon;

  // Form change handlers
  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    let processedValue: any = value;

    if (type === "checkbox") {
      processedValue = checked;
    } else if (type === "number") {
      processedValue = parseFloat(value) || 0;
    }

    updateForm({ [name]: processedValue });
  };

  // Save form data to context for form submission
  useEffect(() => {
    if (servicesContext) {
      const isActive = fixtures > 0;

      const data = isActive ? {
        serviceId: "saniclean",
        displayName: "SaniClean",
        isActive: true,

        pricingMode: {
          label: "Pricing Mode",
          type: "text" as const,
          value: form.pricingMode === "all_inclusive" ? "All Inclusive" : "Per Item Charge",
        },

        location: {
          label: "Location",
          type: "text" as const,
          value: form.location === "insideBeltway" ? "Inside Beltway" : "Outside Beltway",
        },

        fixtureBreakdown: [
          ...(form.sinks > 0 ? [{
            label: "Sinks",
            type: "calc" as const,
            qty: form.sinks,
            rate: form.insideBeltwayRatePerFixture,
            total: form.sinks * form.insideBeltwayRatePerFixture,
          }] : []),
          ...(form.urinals > 0 ? [{
            label: "Urinals",
            type: "calc" as const,
            qty: form.urinals,
            rate: form.insideBeltwayRatePerFixture,
            total: form.urinals * form.insideBeltwayRatePerFixture,
          }] : []),
          ...(form.maleToilets > 0 ? [{
            label: "Male Toilets",
            type: "calc" as const,
            qty: form.maleToilets,
            rate: form.insideBeltwayRatePerFixture,
            total: form.maleToilets * form.insideBeltwayRatePerFixture,
          }] : []),
          ...(form.femaleToilets > 0 ? [{
            label: "Female Toilets",
            type: "calc" as const,
            qty: form.femaleToilets,
            rate: form.insideBeltwayRatePerFixture,
            total: form.femaleToilets * form.insideBeltwayRatePerFixture,
          }] : []),
        ],

        soapType: {
          label: "Soap Type",
          type: "text" as const,
          value: form.soapType === "luxury" ? "Luxury" : "Standard",
        },

        totals: {
          weekly: {
            label: "Weekly Total",
            type: "dollar" as const,
            amount: quote.weeklyTotal,
          },
          monthly: {
            label: "Monthly Recurring",
            type: "dollar" as const,
            amount: quote.monthlyTotal,
          },
          contract: {
            label: "Contract Total",
            type: "dollar" as const,
            months: form.contractMonths,
            amount: quote.contractTotal,
          },
        },

        notes: form.notes || "",
        customFields: customFields,
      } : null;

      const dataStr = JSON.stringify(data);

      if (dataStr !== prevDataRef.current) {
        prevDataRef.current = dataStr;
        servicesContext.updateService("saniclean", data);
      }
    }
  }, [form, quote, fixtures, customFields, soapDispensers, isAllInclusive]);

  const paperCreditPerWeek = form.fixtureCount * form.paperCreditPerFixture;
  const paperOveragePerWeek = Math.max(0, form.estimatedPaperSpendPerWeek - paperCreditPerWeek);

  const contractMonths =
    form.contractMonths && form.contractMonths >= 2 && form.contractMonths <= 36
      ? form.contractMonths
      : 12;
  const contractTotal = quote.monthlyTotal * contractMonths;

  return (
    <div className="svc-card">
      {/* HEADER */}
      <div className="svc-h-row">
        <div className="svc-h">SANI CLEAN</div>
        <div className="svc-h-actions">
          <button
            type="button"
            className="svc-mini"
            onClick={fetchPricing}
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

      {/* Custom fields manager */}
      <CustomFieldManager
        fields={customFields}
        onFieldsChange={setCustomFields}
        showAddDropdown={showAddDropdown}
        onToggleAddDropdown={setShowAddDropdown}
      />

      {/* Pricing Mode */}
      <div className="svc-row">
        <label>Pricing Mode</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="pricingMode"
            value={form.pricingMode}
            onChange={onChange}
          >
            <option value="all_inclusive">All Inclusive</option>
            <option value="per_item_charge">Per Item Charge</option>
          </select>
        </div>
      </div>

      {/* Total Restroom Fixtures */}
      <div className="svc-row">
        <label>Restroom Fixtures</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="fixtureCount"
            value={form.fixtureCount}
            readOnly
          />
        </div>
      </div>

      {/* Location - Only show for Per Item Charge */}
      {form.pricingMode === "per_item_charge" && (
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
          </div>
        </div>
      )}

      {/* Parking - Only for inside beltway in per item mode */}
      {form.pricingMode === "per_item_charge" && form.location === "insideBeltway" && (
        <div className="svc-row">
          <label>Parking</label>
          <div className="svc-row-right">
            <label className="svc-inline">
              <input
                type="checkbox"
                name="needsParking"
                checked={form.needsParking}
                onChange={onChange}
              />
              <span>Parking needed (+fee)</span>
            </label>
          </div>
        </div>
      )}

      {/* FIXTURE BREAKDOWN */}
      <div className="svc-h-sub" style={{ marginTop: 10 }}>
        FIXTURE BREAKDOWN
      </div>

      {/* Sinks */}
      <div className="svc-row">
        <label>Sinks</label>
        <div className="svc-row-right">
          <input
            className="svc-in field-qty"
            type="number"
            name="sinks"
            value={form.sinks}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in field-qty"
            type="number"
            step="0.01"
            value={isAllInclusive ? form.allInclusiveWeeklyRatePerFixture :
                  (form.location === "insideBeltway" ? form.insideBeltwayRatePerFixture : form.outsideBeltwayRatePerFixture)}
            readOnly
            title="Rate per sink (auto-calculated based on pricing mode)"
          />
          <span>=</span>
          <input
            className="svc-in field-qty"
            type="text"
            readOnly
            value={formatMoney(form.sinks *
              (isAllInclusive ? form.allInclusiveWeeklyRatePerFixture :
               (form.location === "insideBeltway" ? form.insideBeltwayRatePerFixture : form.outsideBeltwayRatePerFixture)))}
          />
        </div>
      </div>

      {/* Urinals */}
      <div className="svc-row">
        <label>Urinals</label>
        <div className="svc-row-right">
          <input
            className="svc-in field-qty"
            type="number"
            name="urinals"
            value={form.urinals}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in field-qty"
            type="number"
            step="0.01"
            value={isAllInclusive ? form.allInclusiveWeeklyRatePerFixture :
                  (form.location === "insideBeltway" ? form.insideBeltwayRatePerFixture : form.outsideBeltwayRatePerFixture)}
            readOnly
            title="Rate per urinal (auto-calculated based on pricing mode)"
          />
          <span>=</span>
          <input
            className="svc-in field-qty"
            type="text"
            readOnly
            value={formatMoney(form.urinals *
              (isAllInclusive ? form.allInclusiveWeeklyRatePerFixture :
               (form.location === "insideBeltway" ? form.insideBeltwayRatePerFixture : form.outsideBeltwayRatePerFixture)))}
          />
        </div>
      </div>

      {/* Male Toilets */}
      <div className="svc-row">
        <label>Male Toilets</label>
        <div className="svc-row-right">
          <input
            className="svc-in field-qty"
            type="number"
            name="maleToilets"
            value={form.maleToilets}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in field-qty"
            type="number"
            step="0.01"
            value={isAllInclusive ? form.allInclusiveWeeklyRatePerFixture :
                  (form.location === "insideBeltway" ? form.insideBeltwayRatePerFixture : form.outsideBeltwayRatePerFixture)}
            readOnly
            title="Rate per male toilet (auto-calculated based on pricing mode)"
          />
          <span>=</span>
          <input
            className="svc-in field-qty"
            type="text"
            readOnly
            value={formatMoney(form.maleToilets *
              (isAllInclusive ? form.allInclusiveWeeklyRatePerFixture :
               (form.location === "insideBeltway" ? form.insideBeltwayRatePerFixture : form.outsideBeltwayRatePerFixture)))}
          />
        </div>
      </div>

      {/* Female Toilets */}
      <div className="svc-row">
        <label>Female Toilets</label>
        <div className="svc-row-right">
          <input
            className="svc-in field-qty"
            type="number"
            name="femaleToilets"
            value={form.femaleToilets}
            onChange={onChange}
          />
          <span>=</span>
          <input
            className="svc-in field-qty"
            type="number"
            step="0.01"
            value={isAllInclusive ? form.allInclusiveWeeklyRatePerFixture :
                  (form.location === "insideBeltway" ? form.insideBeltwayRatePerFixture : form.outsideBeltwayRatePerFixture)}
            readOnly
            title="Rate per female toilet (auto-calculated based on pricing mode)"
          />
          <span>=</span>
          <input
            className="svc-in field-qty"
            type="text"
            readOnly
            value={formatMoney(form.femaleToilets *
              (isAllInclusive ? form.allInclusiveWeeklyRatePerFixture :
               (form.location === "insideBeltway" ? form.insideBeltwayRatePerFixture : form.outsideBeltwayRatePerFixture)))}
          />
        </div>
      </div>

      {/* SOAP & UPGRADES */}
      <div className="svc-h-sub" style={{ marginTop: 10 }}>
        SOAP &amp; UPGRADES
      </div>

      {/* Soap type selector */}
      <div className="svc-row">
        <label>Soap Type</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="soapType"
            value={form.soapType}
            onChange={onChange}
          >
            <option value="standard">Standard (included)</option>
            <option value="luxury">Luxury (+${form.luxuryUpgradePerDispenser}/disp/wk)</option>
          </select>
        </div>
      </div>

      {/* Luxury upgrade calc */}
      <div className="svc-row">
        <label>Luxury Upgrade</label>
        <div className="svc-row-right">
          <input className="svc-in field-qty" type="text" readOnly value={soapDispensers} />
          <span>@</span>
          <input
            className="svc-in field-qty"
            type="number"
            step="0.01"
            value={form.soapType === "luxury" ? form.luxuryUpgradePerDispenser : 0}
            readOnly
            title="Luxury soap upgrade rate per dispenser per week (from backend)"
          />
          <span>=</span>
          <input
            className="svc-in field-qty"
            type="text"
            readOnly
            value={formatMoney(luxuryUpgradeWeekly)}
          />
        </div>
      </div>

      {/* Extra soap usage - Only for All Inclusive */}
      {isAllInclusive && (
        <div className="svc-row">
          <label>Extra Soap</label>
          <div className="svc-row-right">
            <input
              className="svc-in field-qty"
              type="number"
              name="excessSoapGallonsPerWeek"
              value={form.excessSoapGallonsPerWeek}
              onChange={onChange}
            />
            <span>@</span>
            <input
              className="svc-in field-qty"
              type="number"
              step="0.01"
              value={extraSoapRatePerGallon}
              readOnly
              title={`Excess ${form.soapType} soap rate per gallon (from backend)`}
            />
            <span>=</span>
            <input
              className="svc-in field-qty"
              type="text"
              readOnly
              value={formatMoney(extraSoapWeekly)}
            />
          </div>
        </div>
      )}

      {/* FACILITY COMPONENTS BREAKDOWN - Only for Per Item Charge */}
      {!isAllInclusive && (
        <>
          <div className="svc-h-sub" style={{ marginTop: 10 }}>
            FACILITY COMPONENTS (Monthly Charges)
          </div>

          {/* Urinal Components - Only show if urinals > 0 */}
          {form.urinals > 0 && (
            <>
              <div className="svc-row">
                <label>Urinal Screens</label>
                <div className="svc-row-right">
                  <input
                    className="svc-in field-qty"
                    type="number"
                    value={form.urinals}
                    readOnly
                    title="Number of urinal screens (auto-set to match urinals)"
                  />
                  <span>@</span>
                  <input
                    className="svc-in field-qty"
                    type="number"
                    step="0.01"
                    value={form.urinalScreenMonthly}
                    readOnly
                    title="Urinal screen rate per month (from backend)"
                  />
                  <span>=</span>
                  <input
                    className="svc-in field-qty"
                    type="text"
                    readOnly
                    value={formatMoney(form.urinals * form.urinalScreenMonthly)}
                  />
                </div>
              </div>

              <div className="svc-row">
                <label>Urinal Mats</label>
                <div className="svc-row-right">
                  <input
                    className="svc-in field-qty"
                    type="number"
                    value={form.urinals}
                    readOnly
                    title="Number of urinal mats (auto-set to match urinals)"
                  />
                  <span>@</span>
                  <input
                    className="svc-in field-qty"
                    type="number"
                    step="0.01"
                    value={form.urinalMatMonthly}
                    readOnly
                    title="Urinal mat rate per month (from backend)"
                  />
                  <span>=</span>
                  <input
                    className="svc-in field-qty"
                    type="text"
                    readOnly
                    value={formatMoney(form.urinals * form.urinalMatMonthly)}
                  />
                </div>
              </div>
            </>
          )}

          {/* Male Toilet Components - Only show if maleToilets > 0 */}
          {form.maleToilets > 0 && (
            <>
              <div className="svc-row">
                <label>Toilet Clips</label>
                <div className="svc-row-right">
                  <input
                    className="svc-in field-qty"
                    type="number"
                    value={form.maleToilets}
                    readOnly
                    title="Number of toilet clips (auto-set to match male toilets)"
                  />
                  <span>@</span>
                  <input
                    className="svc-in field-qty"
                    type="number"
                    step="0.01"
                    value={form.toiletClipsMonthly}
                    readOnly
                    title="Toilet clips rate per month (from backend)"
                  />
                  <span>=</span>
                  <input
                    className="svc-in field-qty"
                    type="text"
                    readOnly
                    value={formatMoney(form.maleToilets * form.toiletClipsMonthly)}
                  />
                </div>
              </div>

              <div className="svc-row">
                <label>Seat Cover Dispensers</label>
                <div className="svc-row-right">
                  <input
                    className="svc-in field-qty"
                    type="number"
                    value={form.maleToilets}
                    readOnly
                    title="Number of seat cover dispensers (auto-set to match male toilets)"
                  />
                  <span>@</span>
                  <input
                    className="svc-in field-qty"
                    type="number"
                    step="0.01"
                    value={form.seatCoverDispenserMonthly}
                    readOnly
                    title="Seat cover dispenser rate per month (from backend)"
                  />
                  <span>=</span>
                  <input
                    className="svc-in field-qty"
                    type="text"
                    readOnly
                    value={formatMoney(form.maleToilets * form.seatCoverDispenserMonthly)}
                  />
                </div>
              </div>
            </>
          )}

          {/* Female Toilet Components - Only show if femaleToilets > 0 */}
          {form.femaleToilets > 0 && (
            <div className="svc-row">
              <label>SaniPods</label>
              <div className="svc-row-right">
                <input
                  className="svc-in field-qty"
                  type="number"
                  value={form.femaleToilets}
                  readOnly
                  title="Number of SaniPods (auto-set to match female toilets)"
                />
                <span>@</span>
                <input
                  className="svc-in field-qty"
                  type="number"
                  step="0.01"
                  value={form.sanipodServiceMonthly}
                  readOnly
                  title="SaniPod service rate per month (from backend)"
                />
                <span>=</span>
                <input
                  className="svc-in field-qty"
                  type="text"
                  readOnly
                  value={formatMoney(form.femaleToilets * form.sanipodServiceMonthly)}
                />
              </div>
            </div>
          )}

          {/* Total Facility Components (weekly equivalent) */}
          <div className="svc-row">
            <label>Total Facility Components (weekly equivalent)</label>
            <div className="svc-row-right">
              <input
                className="svc-in-box"
                type="text"
                readOnly
                value={formatMoney(
                  (form.urinals * (form.urinalScreenMonthly + form.urinalMatMonthly) +
                   form.maleToilets * (form.toiletClipsMonthly + form.seatCoverDispenserMonthly) +
                   form.femaleToilets * form.sanipodServiceMonthly) / form.weeklyToMonthlyMultiplier
                )}
                title="Monthly facility components ÷ 4.33 weeks/month"
              />
            </div>
          </div>
        </>
      )}

      {/* Warranty - Only for Per Item Charge and only when there are sinks (dispensers) */}
      {!isAllInclusive && form.sinks > 0 && (
        <div className="svc-row">
          <label>Warranty</label>
          <div className="svc-row-right">
            <input
              className="svc-in field-qty"
              type="number"
              name="warrantyDispensers"
              value={form.warrantyDispensers}
              onChange={onChange}
              min="0"
              placeholder="0"
              title="Number of dispensers for warranty (manually entered by salesman)"
            />
            <span>@</span>
            <input
              className="svc-in field-qty"
              type="number"
              step="0.01"
              value={form.warrantyFeePerDispenserPerWeek}
              readOnly
              title="Warranty rate per dispenser per week"
            />
            <span>=</span>
            <input
              className="svc-in field-qty"
              type="text"
              readOnly
              value={formatMoney(form.warrantyDispensers * form.warrantyFeePerDispenserPerWeek)}
            />
            <span className="svc-note" style={{ marginLeft: '8px', fontSize: '12px', color: '#666' }}>
              Suggested: {Math.ceil(form.sinks * 1.5)} dispensers (soap + air freshener)
            </span>
          </div>
        </div>
      )}

      {/* MICROFIBER MOPPING */}
      <div className="svc-h-sub" style={{ marginTop: 10 }}>
        MICROFIBER MOPPING
      </div>

      {isAllInclusive ? (
        <div className="svc-row">
          <label>Microfiber Mopping</label>
          <div className="svc-row-right">
            <input
              className="svc-in field-qty"
              type="text"
              readOnly
              value="Included in All-Inclusive bundle"
            />
          </div>
        </div>
      ) : (
        <div className="svc-row">
          <label>Microfiber Mopping</label>
          <div className="svc-row-right">
            <label className="svc-inline">
              <input
                type="checkbox"
                name="addMicrofiberMopping"
                checked={form.addMicrofiberMopping}
                onChange={onChange}
              />
              <span>Include</span>
            </label>
            <input
              className="svc-in field-qty"
              type="number"
              name="microfiberBathrooms"
              disabled={!form.addMicrofiberMopping}
              value={form.microfiberBathrooms}
              onChange={onChange}
            />
            <span>@</span>
            <input
              className="svc-in field-qty"
              type="number"
              step="0.01"
              value={form.addMicrofiberMopping ? form.microfiberMoppingPerBathroom : 0}
              readOnly
              title="Microfiber mopping rate per bathroom per week (from backend)"
            />
            <span>=</span>
            <input
              className="svc-in field-qty"
              type="text"
              readOnly
              value={formatMoney(
                form.addMicrofiberMopping
                  ? form.microfiberBathrooms * form.microfiberMoppingPerBathroom
                  : 0
              )}
            />
          </div>
        </div>
      )}

      {/* PAPER - Only for All Inclusive */}
      {isAllInclusive && (
        <>
          <div className="svc-h-sub" style={{ marginTop: 10 }}>
            PAPER
          </div>

          <div className="svc-row">
            <label>Paper Spend - Credit = Overage</label>
            <div className="svc-row-right">
              <input
                className="svc-in"
                type="number"
                name="estimatedPaperSpendPerWeek"
                value={form.estimatedPaperSpendPerWeek}
                onChange={onChange}
              />
              <span>-</span>
              <input
                className="svc-in"
                type="text"
                readOnly
                value={formatMoney(paperCreditPerWeek)}
              />
              <span>=</span>
              <input
                className="svc-in"
                type="text"
                readOnly
                value={formatMoney(paperOveragePerWeek)}
              />
            </div>
          </div>
        </>
      )}

      {/* WHAT'S INCLUDED */}
      <div className="svc-h-sub" style={{ marginTop: 10 }}>
        WHAT&apos;S INCLUDED
      </div>

      <div className="svc-row">
        <label>{isAllInclusive ? "All-Inclusive Bundle" : "Standard Package"}</label>
        <div className="svc-row-right">
          <div>
            {quote.included.map((item, index) => (
              <div key={index}>• {item}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Rate Tier */}
      <div className="svc-row">
        <label>Rate Tier</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="rateTier"
            value={form.rateTier}
            onChange={onChange}
          >
            <option value="redRate">Red</option>
            <option value="greenRate">Green</option>
          </select>
        </div>
      </div>

      {/* Notes */}
      <div className="svc-row">
        <label>Notes</label>
        <div className="svc-row-right">
          <textarea
            className="svc-in"
            name="notes"
            value={form.notes}
            onChange={onChange}
            rows={3}
          />
        </div>
      </div>

      {/* PRICING SUMMARY */}
      <div className="svc-h-sub" style={{ marginTop: 16 }}>
        PRICING SUMMARY
      </div>

      <div className="svc-row">
        <label>Chosen Method</label>
        <div className="svc-row-right">
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={form.pricingMode === "all_inclusive" ? "All Inclusive" : "Per Item Charge"}
          />
        </div>
      </div>

      <div className="svc-row">
        <label>Weekly Total (Service + All Add-Ons)</label>
        <div className="svc-row-right">
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={formatMoney(quote.weeklyTotal)}
          />
        </div>
      </div>

      <div className="svc-row">
        <label>Monthly Recurring</label>
        <div className="svc-row-right">
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={formatMoney(quote.monthlyTotal)}
          />
        </div>
      </div>

      <div className="svc-row">
        <label>Contract Total</label>
        <div className="svc-row-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select
            className="svc-in"
            name="contractMonths"
            value={contractMonths}
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
            {Array.from({ length: 35 }, (_, i) => i + 2).map((m) => (
              <option key={m} value={m}>
                {m} mo
              </option>
            ))}
          </select>
          <span style={{ fontSize: '18px', fontWeight: 'bold' }}>$</span>
          <input
            className="svc-in"
            type="text"
            readOnly
            value={contractTotal.toFixed(2)}
            style={{
              borderBottom: '2px solid #ff0000',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              backgroundColor: 'transparent',
              fontSize: '16px',
              fontWeight: 'bold',
              padding: '4px',
              width: '100px'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default SanicleanForm;
