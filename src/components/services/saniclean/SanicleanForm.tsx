import React, { useEffect, useState, useRef } from "react";
import "../ServicesSection.css";
import { useSanicleanCalc } from "./useSanicleanCalc";
import { sanicleanPricingConfig as cfg } from "./sanicleanConfig";
import type { SanicleanFormState } from "./sanicleanTypes";
import type { ServiceInitialData } from "../common/serviceTypes";
import { useServicesContextOptional } from "../ServicesContext";
import { CustomFieldManager, type CustomField } from "../CustomFieldManager";

const formatMoney = (n: number): string => `$${n.toFixed(2)}`;

export const SanicleanForm: React.FC<
  ServiceInitialData<SanicleanFormState>
> = ({ initialData, onRemove }) => {
  const { form, onChange, calc, refreshConfig, isLoadingConfig } = useSanicleanCalc(initialData);
  const servicesContext = useServicesContextOptional();

  // Custom fields state
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  const fixtures = Math.max(0, form.fixtureCount);
  const isAllInclusive = calc.method === "all_inclusive";

  // Save form data to context for form submission
  const prevDataRef = useRef<string>("");

  // Calculate dispensers
  const soapDispensers = form.sinks * cfg.facilityComponents.sinks.ratioSinkToSoap;
  const airFreshDispensers = form.sinks > 0
    ? Math.ceil(form.sinks / cfg.facilityComponents.sinks.ratioSinkToAirFreshener)
    : 0;
  const dispenserCount = soapDispensers + airFreshDispensers;

  // Determine which rate to display based on pricing mode
  const shouldShowAllInclusiveRate =
    form.pricingMode === "all_inclusive" ||
    (form.pricingMode === "auto" && fixtures >= form.allInclusiveMinFixtures);

  const baseRateDisplay = shouldShowAllInclusiveRate
    ? form.allInclusiveWeeklyRate
    : (form.location === "insideBeltway" ? form.insideBeltwayRatePerFixture : form.outsideBeltwayRatePerFixture);

  const luxuryUpgradeWeekly = form.soapType === "luxury" && soapDispensers > 0
    ? soapDispensers * form.standardToLuxuryRate
    : 0;

  const extraSoapRatePerGallon = form.soapType === "luxury"
    ? form.excessLuxurySoapRate
    : form.excessStandardSoapRate;

  const extraSoapWeekly = Math.max(0, form.excessSoapGallonsPerWeek) * extraSoapRatePerGallon;

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
          value: form.pricingMode === "all_inclusive" ? "All Inclusive" :
                 form.pricingMode === "geographic_standard" ? "Per Fixture / Geographic Standard" :
                 `Auto (${calc.method === "all_inclusive" ? "All Inclusive" : "Geographic Standard"})`,
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
            rate: baseRateDisplay,
            total: form.sinks * baseRateDisplay,
          }] : []),
          ...(form.urinals > 0 ? [{
            label: "Urinals",
            type: "calc" as const,
            qty: form.urinals,
            rate: baseRateDisplay,
            total: form.urinals * baseRateDisplay,
          }] : []),
          ...(form.maleToilets > 0 ? [{
            label: "Male Toilets",
            type: "calc" as const,
            qty: form.maleToilets,
            rate: baseRateDisplay,
            total: form.maleToilets * baseRateDisplay,
          }] : []),
          ...(form.femaleToilets > 0 ? [{
            label: "Female Toilets",
            type: "calc" as const,
            qty: form.femaleToilets,
            rate: baseRateDisplay,
            total: form.femaleToilets * baseRateDisplay,
          }] : []),
        ],

        soapType: {
          label: "Soap Type",
          type: "text" as const,
          value: form.soapType === "luxury" ? "Luxury" : "Standard",
        },

        ...(luxuryUpgradeWeekly > 0 ? {
          luxuryUpgrade: {
            label: "Luxury Soap Upgrade",
            type: "calc" as const,
            qty: soapDispensers,
            rate: form.standardToLuxuryRate,
            total: luxuryUpgradeWeekly,
          },
        } : {}),

        ...(extraSoapWeekly > 0 ? {
          extraSoap: {
            label: "Extra Soap",
            type: "calc" as const,
            qty: form.excessSoapGallonsPerWeek,
            rate: extraSoapRatePerGallon,
            total: extraSoapWeekly,
          },
        } : {}),

        ...(!isAllInclusive && dispenserCount > 0 ? {
          warranty: {
            label: "Dispenser Warranty",
            type: "calc" as const,
            qty: dispenserCount,
            rate: form.warrantyFeePerDispenser,
            total: dispenserCount * form.warrantyFeePerDispenser,
          },
        } : {}),

        ...(form.addMicrofiberMopping && form.microfiberBathrooms > 0 && !isAllInclusive ? {
          microfiberMopping: {
            label: "Microfiber Mopping",
            type: "calc" as const,
            qty: form.microfiberBathrooms,
            rate: form.microfiberMoppingPerBathroom,
            total: form.microfiberBathrooms * form.microfiberMoppingPerBathroom,
          },
        } : {}),

        ...(isAllInclusive ? {
          paperCreditInfo: {
            label: "Paper Credit/Overage",
            type: "text" as const,
            value: `Spend: $${form.estimatedPaperSpendPerWeek.toFixed(2)} - Credit: $${calc.weeklyPaperCredit.toFixed(2)} = Overage: $${calc.weeklyPaperOverage.toFixed(2)}`,
          },
        } : {}),

        totals: {
          weekly: {
            label: "Weekly Total",
            type: "dollar" as const,
            amount: calc.weeklyTotal,
          },
          monthly: {
            label: "Monthly Recurring",
            type: "dollar" as const,
            amount: calc.monthlyTotal,
          },
          contract: {
            label: "Contract Total",
            type: "dollar" as const,
            months: form.contractMonths,
            amount: calc.monthlyTotal * (form.contractMonths || 12),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, calc, fixtures, customFields, soapDispensers, dispenserCount, isAllInclusive, shouldShowAllInclusiveRate, baseRateDisplay, luxuryUpgradeWeekly, extraSoapRatePerGallon, extraSoapWeekly]);

  console.log('📊 [SaniClean Form] Display Rate:', {
    pricingMode: form.pricingMode,
    calcMethod: calc.method,
    isAllInclusive,
    shouldShowAllInclusiveRate,
    allInclusiveWeeklyRate: form.allInclusiveWeeklyRate,
    insideBeltwayRatePerFixture: form.insideBeltwayRatePerFixture,
    outsideBeltwayRatePerFixture: form.outsideBeltwayRatePerFixture,
    baseRateDisplay,
    location: form.location,
    fixtures: fixtures,
    allInclusiveMinFixtures: form.allInclusiveMinFixtures,
  });

  const paperCreditPerWeek = calc.weeklyPaperCredit;
  const paperOveragePerWeek = calc.weeklyPaperOverage;

  const contractMonths =
    form.contractMonths && form.contractMonths >= 2 && form.contractMonths <= 36
      ? form.contractMonths
      : 12;
  const contractTotal = calc.monthlyTotal * contractMonths;

  const weeklyWarrantyDisplay = isAllInclusive
    ? 0
    : dispenserCount * cfg.warrantyFeePerDispenser;

  return (
    <div className="svc-card">
      {/* HEADER */}
      <div className="svc-h-row">
        <div className="svc-h">SANI CLEAN</div>
        <button
          type="button"
          className="svc-mini"
          onClick={refreshConfig}
          disabled={isLoadingConfig}
          title="Refresh config from database"
          style={{ fontSize: '14px' }}
        >
          {isLoadingConfig ? '⟳' : '🔄'}
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

      {/* Custom fields manager - appears at the top */}
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
            <option value="auto">Auto (recommended)</option>
            <option value="all_inclusive">All Inclusive</option>
            <option value="geographic_standard">
              Per Fixture / Geographic Standard
            </option>
          </select>
        </div>
      </div>

      {/* Total Restroom Fixtures */}
      <div className="svc-row">
        <label>Total Restroom Fixtures</label>
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

      {/* Location */}
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

      {/* Parking */}
      <div className="svc-row">
        <label>Parking</label>
        <div className="svc-row-right">
          {form.location === "insideBeltway" ? (
            <label className="svc-inline">
              <input
                type="checkbox"
                name="needsParking"
                checked={form.needsParking}
                onChange={onChange}
              />
              <span>Parking needed (+parking fee in trip)</span>
            </label>
          ) : (
            <span className="svc-muted">Not applicable outside beltway</span>
          )}
        </div>
      </div>

      {/* ================== FIXTURE BREAKDOWN ================== */}
      <div className="svc-h" style={{ marginTop: 10 }}>
        FIXTURE BREAKDOWN
      </div>

      {/* Sinks */}
      <div className="svc-row">
        <label>Sinks</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="sinks"
            value={form.sinks}
            onChange={onChange}
          />
          <span>@</span>
          <input
            key={`sinks-rate-${form.pricingMode}-${form.location}`}
            className="svc-in"
            type="number"
            step="0.01"
            name={shouldShowAllInclusiveRate ? "allInclusiveWeeklyRate" : (form.location === "insideBeltway" ? "insideBeltwayRatePerFixture" : "outsideBeltwayRatePerFixture")}
            value={baseRateDisplay}
            onChange={onChange}
            title={shouldShowAllInclusiveRate ? "All-inclusive rate per fixture (from backend)" : "Geographic rate per fixture (from backend)"}
          />
          <span>=</span>
          <input
            className="svc-in"
            type="text"
            readOnly
            value={formatMoney(form.sinks * baseRateDisplay)}
          />
        </div>
      </div>

      {/* Urinals */}
      <div className="svc-row">
        <label>Urinals</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="urinals"
            value={form.urinals}
            onChange={onChange}
          />
          <span>@</span>
          <input
            key={`urinals-rate-${form.pricingMode}-${form.location}`}
            className="svc-in"
            type="number"
            step="0.01"
            name={shouldShowAllInclusiveRate ? "allInclusiveWeeklyRate" : (form.location === "insideBeltway" ? "insideBeltwayRatePerFixture" : "outsideBeltwayRatePerFixture")}
            value={baseRateDisplay}
            onChange={onChange}
            title={shouldShowAllInclusiveRate ? "All-inclusive rate per fixture (from backend)" : "Geographic rate per fixture (from backend)"}
          />
          <span>=</span>
          <input
            className="svc-in"
            type="text"
            readOnly
            value={formatMoney(form.urinals * baseRateDisplay)}
          />
        </div>
      </div>

      {/* Male Toilets */}
      <div className="svc-row">
        <label>Male Toilets</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="maleToilets"
            value={form.maleToilets}
            onChange={onChange}
          />
          <span>@</span>
          <input
            key={`maletoilets-rate-${form.pricingMode}-${form.location}`}
            className="svc-in"
            type="number"
            step="0.01"
            name={shouldShowAllInclusiveRate ? "allInclusiveWeeklyRate" : (form.location === "insideBeltway" ? "insideBeltwayRatePerFixture" : "outsideBeltwayRatePerFixture")}
            value={baseRateDisplay}
            onChange={onChange}
            title={shouldShowAllInclusiveRate ? "All-inclusive rate per fixture (from backend)" : "Geographic rate per fixture (from backend)"}
          />
          <span>=</span>
          <input
            className="svc-in"
            type="text"
            readOnly
            value={formatMoney(form.maleToilets * baseRateDisplay)}
          />
        </div>
      </div>

      {/* Female Toilets */}
      <div className="svc-row">
        <label>Female Toilets</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="femaleToilets"
            value={form.femaleToilets}
            onChange={onChange}
          />
          <span>@</span>
          <input
            key={`femaletoilets-rate-${form.pricingMode}-${form.location}`}
            className="svc-in"
            type="number"
            step="0.01"
            name={shouldShowAllInclusiveRate ? "allInclusiveWeeklyRate" : (form.location === "insideBeltway" ? "insideBeltwayRatePerFixture" : "outsideBeltwayRatePerFixture")}
            value={baseRateDisplay}
            onChange={onChange}
            title={shouldShowAllInclusiveRate ? "All-inclusive rate per fixture (from backend)" : "Geographic rate per fixture (from backend)"}
          />
          <span>=</span>
          <input
            className="svc-in"
            type="text"
            readOnly
            value={formatMoney(form.femaleToilets * baseRateDisplay)}
          />
        </div>
      </div>

      {/* ================== SOAP & UPGRADES ================== */}
      <div className="svc-h" style={{ marginTop: 10 }}>
        SOAP, AIR FRESHENER &amp; UPGRADES
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
            <option value="luxury">Luxury (+$5/dispenser/wk)</option>
          </select>
        </div>
      </div>

      {/* Luxury upgrade calc */}
      <div className="svc-row">
        <label>Luxury Upgrade</label>
        <div className="svc-row-right">
          <input className="svc-in" type="text" readOnly value={soapDispensers} />
          <span>@</span>
          <input
            className="svc-in"
            type="number"
            step="0.01"
            name="standardToLuxuryRate"
            value={form.soapType === "luxury" ? form.standardToLuxuryRate : 0}
            onChange={onChange}
            disabled={form.soapType !== "luxury"}
            title="Luxury soap upgrade rate per dispenser per week (from backend)"
          />
          <span>=</span>
          <input
            className="svc-in"
            type="text"
            readOnly
            value={formatMoney(luxuryUpgradeWeekly)}
          />
        </div>
      </div>

      {/* Extra soap usage */}
      <div className="svc-row">
        <label>Extra Soap</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="excessSoapGallonsPerWeek"
            value={form.excessSoapGallonsPerWeek}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in"
            type="number"
            step="0.01"
            name={form.soapType === "luxury" ? "excessLuxurySoapRate" : "excessStandardSoapRate"}
            value={extraSoapRatePerGallon}
            onChange={onChange}
            title={`Excess ${form.soapType} soap rate per gallon (from backend)`}
          />
          <span>=</span>
          <input
            className="svc-in"
            type="text"
            readOnly
            value={formatMoney(extraSoapWeekly)}
          />
        </div>
      </div>

      {/* Warranty – free in all-inclusive, charged otherwise */}
      <div className="svc-row">
        <label>Dispenser Warranty</label>
        <div className="svc-row-right">
          {isAllInclusive ? (
            <input
              className="svc-in"
              type="text"
              readOnly
              value="Included (fees waived in All-Inclusive)"
            />
          ) : (
            <>
              <input
                className="svc-in"
                type="text"
                readOnly
                value={dispenserCount}
              />
              <span>@</span>
              <input
                className="svc-in"
                type="number"
                step="0.01"
                name="warrantyFeePerDispenser"
                value={form.warrantyFeePerDispenser}
                onChange={onChange}
                title="Warranty fee per dispenser per week (from backend)"
              />
              <span>=</span>
              <input
                className="svc-in"
                type="text"
                readOnly
                value={formatMoney(weeklyWarrantyDisplay)}
              />
            </>
          )}
        </div>
      </div>

      {/* ================== FACILITY COMPONENTS BREAKDOWN ================== */}
      {!isAllInclusive && (form.urinals > 0 || form.maleToilets > 0 || form.femaleToilets > 0) && (
        <>
          <div className="svc-h" style={{ marginTop: 10 }}>
            FACILITY COMPONENTS (Monthly Charges)
          </div>

          {form.urinals > 0 && (
            <div className="svc-row">
              <label>Urinal Components (screens + mats)</label>
              <div className="svc-row-right">
                <input
                  className="svc-in"
                  type="text"
                  readOnly
                  value={form.urinals}
                />
                <span>@</span>
                <input
                  className="svc-in"
                  type="text"
                  readOnly
                  value={formatMoney(form.urinalScreenRate + form.urinalMatRate)}
                  title="Urinal screen + urinal mat per month (from backend)"
                />
                <span>=</span>
                <input
                  className="svc-in"
                  type="text"
                  readOnly
                  value={formatMoney(form.urinals * (form.urinalScreenRate + form.urinalMatRate))}
                />
              </div>
            </div>
          )}

          {form.maleToilets > 0 && (
            <div className="svc-row">
              <label>Male Toilet Components (clips + covers)</label>
              <div className="svc-row-right">
                <input
                  className="svc-in"
                  type="text"
                  readOnly
                  value={form.maleToilets}
                />
                <span>@</span>
                <input
                  className="svc-in"
                  type="text"
                  readOnly
                  value={formatMoney(form.toiletClipsRate + form.seatCoverDispenserRate)}
                  title="Toilet clips + seat cover dispenser per month (from backend)"
                />
                <span>=</span>
                <input
                  className="svc-in"
                  type="text"
                  readOnly
                  value={formatMoney(form.maleToilets * (form.toiletClipsRate + form.seatCoverDispenserRate))}
                />
              </div>
            </div>
          )}

          {form.femaleToilets > 0 && (
            <div className="svc-row">
              <label>Female Toilet Components (SaniPods)</label>
              <div className="svc-row-right">
                <input
                  className="svc-in"
                  type="text"
                  readOnly
                  value={form.femaleToilets}
                />
                <span>@</span>
                <input
                  className="svc-in"
                  type="text"
                  readOnly
                  value={formatMoney(form.sanipodServiceRate)}
                  title="SaniPod service per month (from backend)"
                />
                <span>=</span>
                <input
                  className="svc-in"
                  type="text"
                  readOnly
                  value={formatMoney(form.femaleToilets * form.sanipodServiceRate)}
                />
              </div>
            </div>
          )}

          <div className="svc-row">
            <label>Total Facility Components (weekly equivalent)</label>
            <div className="svc-row-right">
              <input
                className="svc-in-box"
                type="text"
                readOnly
                value={formatMoney(
                  (form.urinals * (form.urinalScreenRate + form.urinalMatRate) +
                   form.maleToilets * (form.toiletClipsRate + form.seatCoverDispenserRate) +
                   form.femaleToilets * form.sanipodServiceRate) / form.weeklyToMonthlyMultiplier
                )}
                title="Monthly facility components ÷ 4.33 weeks/month"
              />
            </div>
          </div>
        </>
      )}

      {/* ================== MICROFIBER ================== */}
      <div className="svc-h" style={{ marginTop: 10 }}>
        MICROFIBER MOPPING
      </div>

      {isAllInclusive ? (
        <div className="svc-row">
          <label>Microfiber Mopping</label>
          <div className="svc-row-right">
            <input
              className="svc-in"
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
              className="svc-in"
              type="number"
              name="microfiberBathrooms"
              disabled={!form.addMicrofiberMopping}
              value={form.microfiberBathrooms}
              onChange={onChange}
            />
            <span>@</span>
            <input
              className="svc-in"
              type="number"
              step="0.01"
              name="microfiberMoppingPerBathroom"
              disabled={!form.addMicrofiberMopping}
              value={form.addMicrofiberMopping ? form.microfiberMoppingPerBathroom : 0}
              onChange={onChange}
              title="Microfiber mopping rate per bathroom per week (from backend)"
            />
            <span>=</span>
            <input
              className="svc-in"
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

      {/* ================== PAPER ================== */}
      <div className="svc-h" style={{ marginTop: 10 }}>
        PAPER
      </div>

      {isAllInclusive ? (
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
      ) : (
        <div className="svc-row">
          <label>Paper (non–All-Inclusive)</label>
          <div className="svc-row-right">
            <input
              className="svc-in"
              type="text"
              readOnly
              value="Paper handled via products table (no automatic credit here)"
            />
          </div>
        </div>
      )}

      {/* ================== WHAT'S INCLUDED ================== */}
      <div className="svc-h" style={{ marginTop: 10 }}>
        WHAT&apos;S INCLUDED
      </div>

      {isAllInclusive ? (
        <div className="svc-row">
          <label>All-Inclusive Bundle</label>
          <div className="svc-row-right">
            <div>
              • Weekly SaniClean service<br />
              • Monthly SaniScrub<br />
              • SaniPods for female toilets<br />
              • Urinal mats &amp; screens<br />
              • Paper dispensers &amp; paper (up to credit)<br />
              • Microfiber mopping system<br />
              • Dispenser warranty fees waived<br />
              • Trip charge waived
            </div>
          </div>
        </div>
      ) : (
        <div className="svc-row">
          <label>Standard Package</label>
          <div className="svc-row-right">
            <div>
              • Weekly SaniClean service<br />
              • Standard soap (one fill/week)<br />
              • Electrostatic spray<br />
              • Other services (SaniPods, mats, paper, microfiber) sold as
              add-ons
            </div>
          </div>
        </div>
      )}

      {/* ================== RATE TIER & NOTES ================== */}
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

      {/* ================== PRICING SUMMARY ================== */}
      <div className="svc-h" style={{ marginTop: 16 }}>
        PRICING SUMMARY
      </div>

      <div className="svc-row">
        <label>Chosen Method</label>
        <div className="svc-row-right">
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={
              calc.method === "all_inclusive"
                ? "All Inclusive"
                : calc.method === "small_facility_minimum"
                ? `Small Facility Minimum ($${form.smallFacilityMinimumWeekly}/wk)`
                : "Per Fixture / Geographic Standard"
            }
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
            value={formatMoney(calc.weeklyTotal)}
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
            value={formatMoney(calc.monthlyTotal)}
          />
        </div>
      </div>

      <div className="svc-row">
        <label>Contract Length (months)</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="contractMonths"
            value={contractMonths}
            onChange={onChange}
          >
            {Array.from({ length: 35 }, (_, i) => i + 2).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="svc-row">
        <label>Total Contract Price</label>
        <div className="svc-row-right">
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={formatMoney(contractTotal)}
          />
        </div>
      </div>
    </div>
  );
};

export default SanicleanForm;
