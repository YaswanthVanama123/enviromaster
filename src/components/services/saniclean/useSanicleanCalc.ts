// src/features/services/saniclean/useSanicleanCalc.ts
import { useMemo, useState } from "react";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import { SANICLEAN_CONFIG } from "./sanicleanConfig";
import type {
  SanicleanFormState,
  SanicleanQuoteResult,
  SanicleanPricingMethod,
} from "./sanicleanTypes";

const BILLING_WEEKLY = "weekly" as const;

const DEFAULT_SANICLEAN_FORM_STATE: SanicleanFormState = {
  serviceId: "saniclean",
  fixtureCount: 0,
  location: "insideBeltway",
  needsParking: false,
  isAllInclusive: false,

  sinks: 0,
  urinals: 0,
  maleToilets: 0,
  femaleToilets: 0,

  soapUpgradeType: "none",
  soapDispensers: 0,

  bathroomsForMopping: 0,

  includeDrainService: false,
  drains: 0,

  rateTier: "redRate",

  notes: "",
};

function round2(v: number): number {
  return Number(v.toFixed(2));
}

export function useSanicleanCalc(initial?: Partial<SanicleanFormState>) {
  const [state, setState] = useState<SanicleanFormState>({
    ...DEFAULT_SANICLEAN_FORM_STATE,
    ...initial,
    serviceId: "saniclean",
  });

  const quote: SanicleanQuoteResult = useMemo(() => {
    const cfg = SANICLEAN_CONFIG;
    const {
      fixtureCount,
      location,
      needsParking,
      isAllInclusive,
      urinals,
      maleToilets,
      femaleToilets,
      soapUpgradeType,
      soapDispensers,
      bathroomsForMopping,
      includeDrainService,
      drains,
      rateTier,
      notes,
    } = state;

    // If nothing entered yet, keep everything zero but valid shape
    if (!fixtureCount || fixtureCount <= 0) {
      const zeroBase: ServiceQuoteResult = {
        serviceId: "saniclean",
        label: "SaniClean",
        billingFrequency: BILLING_WEEKLY,
        weekly: 0,
        monthly: 0,
        annual: 0,
        notes: "Enter fixture count to calculate SaniClean pricing.",
        detailsBreakdown: [],
      };

      return {
        ...zeroBase,
        pricingMethod: "geographic_standard",
        breakdown: {
          weeklyBase: 0,
          weeklyFacilityComponents: 0,
          weeklySoapUpgrade: 0,
          weeklyMicrofiber: 0,
          weeklyDrain: 0,
          tierMultiplier: 1,
        },
      };
    }

    const { billingConversions } = cfg;
    const weeklyToMonthly = billingConversions.weekly.monthlyMultiplier;
    const weeklyToAnnual = billingConversions.weekly.annualMultiplier;

    let pricingMethod: SanicleanPricingMethod;
    let weeklyBase = 0;

    // 1. Primary pricing track
    if (isAllInclusive) {
      // All-inclusive: $20 / fixture monthly, no trip charges, no warranty
      const monthlyAllInclusive =
        fixtureCount * cfg.allInclusivePackage.ratePerFixture;
      weeklyBase = monthlyAllInclusive / weeklyToMonthly;
      pricingMethod = "all_inclusive";
    } else if (
      fixtureCount <= cfg.smallFacilityMinimum.fixtureThreshold &&
      fixtureCount > 0
    ) {
      // Small facility minimum: $50 / week including trip
      weeklyBase = cfg.smallFacilityMinimum.minimumCharge;
      pricingMethod = "small_facility_minimum";
    } else {
      // Geographic standard pricing
      const geo = cfg.geographicPricing[location];

      const fixturePrice = fixtureCount * geo.ratePerFixture;
      const weeklyBaseBeforeTrip = Math.max(
        fixturePrice,
        geo.weeklyMinimum
      );

      let tripCharge = geo.tripCharge;
      if (needsParking && location === "insideBeltway") {
        tripCharge += cfg.geographicPricing.insideBeltway.parkingFee ?? 0;
      }

      weeklyBase = weeklyBaseBeforeTrip + tripCharge;
      pricingMethod = "geographic_standard";
    }

    // 2. Facility component pricing (monthly → weekly) — only for non all-inclusive
    let weeklyFacilityComponents = 0;
    if (!isAllInclusive) {
      const fc = cfg.facilityComponents;
      const monthlyComponents =
        urinals * (fc.urinals.urinalScreen + fc.urinals.urinalMat) +
        maleToilets *
          (fc.maleToilets.toiletClips +
            fc.maleToilets.seatCoverDispenser) +
        femaleToilets * fc.femaleToilets.sanipodService;

      weeklyFacilityComponents = monthlyComponents / weeklyToMonthly;
    }

    // 3. Soap upgrade weekly bump
    let weeklySoapUpgrade = 0;
    if (soapUpgradeType === "luxury" && soapDispensers > 0) {
      weeklySoapUpgrade =
        soapDispensers * cfg.soapUpgrades.standardToLuxury;
    }

    // 4. Microfiber mopping if included with Sani (non all-inclusive)
    let weeklyMicrofiber = 0;
    if (!isAllInclusive && bathroomsForMopping > 0) {
      weeklyMicrofiber =
        bathroomsForMopping *
        cfg.addOnServices.microfiberMopping.pricePerBathroom;
    }

    // 5. Drain line service add-on
    let weeklyDrain = 0;
    if (!isAllInclusive && includeDrainService && drains > 0) {
      weeklyDrain =
        drains * cfg.addOnServices.drainLineService.ratePerDrain;
    }

    // 6. Sum weekly before tier
    let weeklyTotal =
      weeklyBase +
      weeklyFacilityComponents +
      weeklySoapUpgrade +
      weeklyMicrofiber +
      weeklyDrain;

    const tierMultiplier = cfg.rateTiers[rateTier].multiplier;
    weeklyTotal *= tierMultiplier;

    const monthlyTotal = weeklyTotal * weeklyToMonthly;
    const annualTotal = weeklyTotal * weeklyToAnnual;

    const detailsBreakdown: string[] = [];

    detailsBreakdown.push(
      `Pricing method: ${
        pricingMethod === "all_inclusive"
          ? "All-inclusive ($20/fixture monthly)"
          : pricingMethod === "small_facility_minimum"
          ? "Small facility minimum ($50/week including trip)"
          : "Geographic standard (inside/outside beltway)"
      }`
    );

    detailsBreakdown.push(
      `Base weekly (incl. trip/minimums): $${round2(weeklyBase).toFixed(2)}`
    );

    if (weeklyFacilityComponents > 0) {
      detailsBreakdown.push(
        `Fixture components (urinal screens/mats, clips, Sanipods): $${round2(
          weeklyFacilityComponents
        ).toFixed(2)} / week`
      );
    }

    if (weeklySoapUpgrade > 0) {
      detailsBreakdown.push(
        `Soap upgrade (luxury at $5/disp/week): $${round2(
          weeklySoapUpgrade
        ).toFixed(2)} / week`
      );
    }

    if (weeklyMicrofiber > 0) {
      detailsBreakdown.push(
        `Microfiber mopping add-on ($10/bathroom): $${round2(
          weeklyMicrofiber
        ).toFixed(2)} / week`
      );
    }

    if (weeklyDrain > 0) {
      detailsBreakdown.push(
        `Drain line service add-on ($10/drain): $${round2(
          weeklyDrain
        ).toFixed(2)} / week`
      );
    }

    if (tierMultiplier > 1) {
      detailsBreakdown.push(
        `Rate tier: ${rateTier} (×${tierMultiplier.toFixed(2)} over red)`
      );
    }

    const baseQuote: ServiceQuoteResult = {
      serviceId: "saniclean",
      label: "SaniClean",
      billingFrequency: BILLING_WEEKLY,
      weekly: round2(weeklyTotal),
      monthly: round2(monthlyTotal),
      annual: round2(annualTotal),
      notes,
      detailsBreakdown,
    };

    return {
      ...baseQuote,
      pricingMethod,
      breakdown: {
        weeklyBase: round2(weeklyBase),
        weeklyFacilityComponents: round2(weeklyFacilityComponents),
        weeklySoapUpgrade: round2(weeklySoapUpgrade),
        weeklyMicrofiber: round2(weeklyMicrofiber),
        weeklyDrain: round2(weeklyDrain),
        tierMultiplier,
      },
    };
  }, [state]);

  const updateField = <K extends keyof SanicleanFormState>(
    key: K,
    value: SanicleanFormState[K]
  ) => {
    setState((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const reset = () => setState(DEFAULT_SANICLEAN_FORM_STATE);

  return {
    state,
    updateField,
    reset,
    quote,
  };
}
