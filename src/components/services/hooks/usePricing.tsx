// src/components/services/hooks/usePricing.ts
import { useEffect, useState } from "react";
import { pricingApi, type PriceFixDocument } from "../../../backendservice/api";

export type Pricing = {
  sani: {
    ratePerFixture: number;
    weeklyMinimum: number;
    smallThreshold: number;
    smallMin: number;
  };
  trip: {
    standard: number;
    insideBeltway: number;
    paidParking: number;
    twoPerson: number;
  };
  rpm: {
    rateSmall: number;
    rateMedium: number;
    rateLarge: number;
    defaultPerWindowRate: number;
    installFirstTimeMult: number;
  };
};

const DEFAULTS: Pricing = {
  sani: {
    ratePerFixture: 7,
    weeklyMinimum: 40,
    smallThreshold: 5,
    smallMin: 50,
  },
  trip: {
    standard: 6,
    insideBeltway: 8,
    paidParking: 7,
    twoPerson: 12,
  },
  rpm: {
    rateSmall: 1.5,
    rateMedium: 3,
    rateLarge: 7,
    defaultPerWindowRate: 3,
    installFirstTimeMult: 3,
  },
};

type RestroomHygienePricingFromApi = {
  ratePerFixture?: number;
  weeklyMinimum?: number;
  smallAccountThreshold?: number;
  smallAccountMinimum?: number;
};

type TripChargePricingFromApi = {
  standard?: number;
  insideBeltway?: number;
  paidParking?: number;
  twoPerson?: number;
};

type RpmWindowPricingFromApi = {
  smallWindowRate?: number;
  mediumWindowRate?: number;
  largeWindowRate?: number;
  installMultiplierFirstTime?: number;
};

type ServicesPricingFromApi = {
  restroomHygiene?: RestroomHygienePricingFromApi;
  tripCharge?: TripChargePricingFromApi;
  rpmWindow?: RpmWindowPricingFromApi;
  // other services can be added later
};

function mapPriceFixToPricing(doc: PriceFixDocument | null): Pricing {
  if (!doc || !doc.services) return DEFAULTS;

  const rh = doc.services.restroomHygiene || {};
  const trip = doc.services.tripCharge || {};
  const rpm = doc.services.rpmWindow || {};

  return {
    sani: {
      ratePerFixture:
        rh.ratePerFixture ?? DEFAULTS.sani.ratePerFixture,
      weeklyMinimum:
        rh.weeklyMinimum ?? DEFAULTS.sani.weeklyMinimum,
      smallThreshold:
        rh.smallAccountThreshold ?? DEFAULTS.sani.smallThreshold,
      smallMin:
        rh.smallAccountMinimum ?? DEFAULTS.sani.smallMin,
    },
    trip: {
      standard: trip.standard ?? DEFAULTS.trip.standard,
      insideBeltway:
        trip.insideBeltway ?? DEFAULTS.trip.insideBeltway,
      paidParking:
        trip.paidParking ?? DEFAULTS.trip.paidParking,
      twoPerson: trip.twoPerson ?? DEFAULTS.trip.twoPerson,
    },
    rpm: {
      rateSmall: rpm.smallWindowRate ?? DEFAULTS.rpm.rateSmall,
      rateMedium:
        rpm.mediumWindowRate ?? DEFAULTS.rpm.rateMedium,
      rateLarge: rpm.largeWindowRate ?? DEFAULTS.rpm.rateLarge,
      defaultPerWindowRate:
        rpm.mediumWindowRate ?? DEFAULTS.rpm.defaultPerWindowRate,
      installFirstTimeMult:
        rpm.installMultiplierFirstTime ??
        DEFAULTS.rpm.installFirstTimeMult,
    },
  };
}

export function usePricing(): Pricing {
  const [pricing, setPricing] = useState<Pricing>(DEFAULTS);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const master = await pricingApi.getMasterPricing();
        const mapped = mapPriceFixToPricing(master);
        if (!cancelled) setPricing(mapped);
      } catch (err) {
        console.error("Failed to load pricing, using defaults", err);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return pricing;
}
