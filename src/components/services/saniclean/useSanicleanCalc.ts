// src/features/services/saniclean/useSanicleanCalc.ts

import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type { SanicleanFormState } from "./sanicleanTypes";
import { SANICLEAN_FIXTURE_RATE, SANICLEAN_TRIP_CHARGE, SANICLEAN_MINIMUM_WEEKLY } from "./sanicleanConfig";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import { calcAnnualFromPerVisit } from "../common/pricingUtils";

export function useSanicleanCalc(initialData: SanicleanFormState) {
  const [form, setForm] = useState<SanicleanFormState>(initialData);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement | HTMLSelectElement;
  
    const { name, value, type } = target;
    const checked = type === "checkbox" ? (target as HTMLInputElement).checked : undefined;
  
    setForm((prev) => {
      if (name === "fixtureCount") {
        return { ...prev, fixtureCount: Number(value) || 0 };
      }
  
      if (name === "region") {
        return { ...prev, region: value as SanicleanFormState["region"] };
      }
  
      if (name === "frequency") {
        return { ...prev, frequency: value as SanicleanFormState["frequency"] };
      }
  
      if (name === "tripChargeIncluded") {
        return {
          ...prev,
          tripChargeIncluded:
            type === "checkbox" ? checked! : value === "true",
        };
      }
  
      if (name === "notes") {
        return { ...prev, notes: value };
      }
  
      return prev;
    });
  };
  

  const quote: ServiceQuoteResult = useMemo(() => {
    const rate = SANICLEAN_FIXTURE_RATE[form.region];
    const trip = form.tripChargeIncluded ? SANICLEAN_TRIP_CHARGE[form.region] : 0;

    let perVisit = form.fixtureCount * rate + trip;
    if (form.frequency === "weekly" && perVisit < SANICLEAN_MINIMUM_WEEKLY) {
      perVisit = SANICLEAN_MINIMUM_WEEKLY;
    }

    const annual = calcAnnualFromPerVisit(perVisit, form.frequency);

    return {
      serviceId: "saniclean",
      displayName: "SaniClean",
      perVisitPrice: perVisit,
      annualPrice: annual,
      detailsBreakdown: [
        `Fixtures: ${form.fixtureCount} @ $${rate.toFixed(2)}`,
        `Trip charge: $${trip.toFixed(2)}`,
        `Frequency: ${form.frequency}`,
        `Minimum weekly applied: ${
          form.frequency === "weekly" && perVisit === SANICLEAN_MINIMUM_WEEKLY ? "Yes" : "No"
        }`,
      ],
    };
  }, [form]);

  return {
    form,
    setForm,
    handleChange,
    quote,
  };
}
