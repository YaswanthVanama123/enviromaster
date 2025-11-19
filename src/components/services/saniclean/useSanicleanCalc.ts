import { useEffect, useMemo, useState } from "react";
import type {ChangeEvent} from 'react';
import type { SanicleanFormState } from "./sanicleanTypes";
import { SANICLEAN_FIXTURE_RATE, SANICLEAN_TRIP_CHARGE, DEFAULT_MIN_WEEKLY } from "./sanicleanConfig";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import { annualFromPerVisit } from "../common/pricingUtils";

const DEFAULT_FORM: SanicleanFormState = {
  fixtureCount: 0,
  region: "inside",
  allInclusiveRatePerFixture: SANICLEAN_FIXTURE_RATE.inside,
  minimumWeeklyCharge: DEFAULT_MIN_WEEKLY,
  tripCharge: SANICLEAN_TRIP_CHARGE.inside,
  frequency: "weekly",
  tripChargeIncluded: true,
  notes: "",
};

export function useSanicleanCalc(initial?: Partial<SanicleanFormState>) {
  const [form, setForm] = useState<SanicleanFormState>({ ...DEFAULT_FORM, ...initial });

  useEffect(() => {
    // keep rate & trip in sync with region unless user overwrites
    setForm((p) => ({
      ...p,
      allInclusiveRatePerFixture: SANICLEAN_FIXTURE_RATE[p.region],
      tripCharge: SANICLEAN_TRIP_CHARGE[p.region],
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.region]);

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as any;
    setForm((p) => {
      switch (name) {
        case "fixtureCount": return { ...p, fixtureCount: Number(value) || 0 };
        case "region": return { ...p, region: value as SanicleanFormState["region"] };
        case "allInclusiveRatePerFixture": return { ...p, allInclusiveRatePerFixture: Number(value) || 0 };
        case "minimumWeeklyCharge": return { ...p, minimumWeeklyCharge: Number(value) || 0 };
        case "tripCharge": return { ...p, tripCharge: Number(value) || 0 };
        case "frequency": return { ...p, frequency: value as SanicleanFormState["frequency"] };
        case "tripChargeIncluded": return { ...p, tripChargeIncluded: type === "checkbox" ? checked : value === "true" };
        case "notes": return { ...p, notes: value };
        default: return p;
      }
    });
  };

  const quote: ServiceQuoteResult = useMemo(() => {
    const fixtures = form.fixtureCount * form.allInclusiveRatePerFixture;
    const trip = form.tripChargeIncluded ? form.tripCharge : 0;
    let perVisit = fixtures + trip;

    if (form.frequency === "weekly") {
      perVisit = Math.max(perVisit, form.minimumWeeklyCharge);
    }
    const annual = annualFromPerVisit(perVisit, form.frequency);

    return {
      serviceId: "saniclean",
      displayName: "SaniClean",
      perVisitPrice: perVisit,
      annualPrice: annual,
      detailsBreakdown: [
        `Fixtures: ${form.fixtureCount} @ $${form.allInclusiveRatePerFixture.toFixed(2)}`,
        `Trip: $${trip.toFixed(2)}`,
        `Min weekly: $${form.minimumWeeklyCharge.toFixed(2)}`,
        `Frequency: ${form.frequency}`,
      ],
    };
  }, [form]);

  return { form, setForm, onChange, quote };
}
