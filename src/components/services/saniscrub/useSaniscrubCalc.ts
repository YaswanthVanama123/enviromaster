// src/features/services/saniscrub/useSaniscrubCalc.ts

import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type { SaniscrubFormState } from "./saniscrubTypes";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import { calcAnnualFromPerVisit } from "../common/pricingUtils";
import {
  SANISCRUB_MONTHLY_PER_FIXTURE,
  SANISCRUB_MONTHLY_MINIMUM,
  SANISCRUB_NON_BATHROOM_RATE,
} from "./saniscrubConfig";

export function useSaniscrubCalc(initialData: SaniscrubFormState) {
  const [form, setForm] = useState<SaniscrubFormState>(initialData);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setForm((prev) => {
      if (name === "restroomFixtures") {
        return { ...prev, restroomFixtures: Number(value) || 0 };
      }
      if (name === "nonBathroomSqFt") {
        return { ...prev, nonBathroomSqFt: Number(value) || 0 };
      }
      if (name === "frequency") {
        return { ...prev, frequency: value as SaniscrubFormState["frequency"] };
      }
      if (name === "notes") {
        return { ...prev, notes: value };
      }
      return prev;
    });
  };

  const quote: ServiceQuoteResult = useMemo(() => {
    let base = form.restroomFixtures * SANISCRUB_MONTHLY_PER_FIXTURE;

    if (base < SANISCRUB_MONTHLY_MINIMUM) {
      base = SANISCRUB_MONTHLY_MINIMUM;
    }

    const nonBathCharge = form.nonBathroomSqFt * SANISCRUB_NON_BATHROOM_RATE;

    const perVisit = base + nonBathCharge;
    const annual = calcAnnualFromPerVisit(perVisit, form.frequency);

    return {
      serviceId: "saniscrub",
      displayName: "SaniScrub",
      perVisitPrice: perVisit,
      annualPrice: annual,
      detailsBreakdown: [
        `Restroom fixtures: ${form.restroomFixtures} @ $${SANISCRUB_MONTHLY_PER_FIXTURE.toFixed(2)}`,
        `Minimum monthly: $${SANISCRUB_MONTHLY_MINIMUM.toFixed(2)}`,
        `Non-bath sq ft: ${form.nonBathroomSqFt} @ $${SANISCRUB_NON_BATHROOM_RATE.toFixed(2)}/sq ft`,
        `Frequency: ${form.frequency}`,
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
