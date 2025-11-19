// src/features/services/microfiberMopping/useMicrofiberMoppingCalc.ts

import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type { MicrofiberMoppingFormState } from "./microfiberMoppingTypes";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import { calcAnnualFromPerVisit } from "../common/pricingUtils";
import {
  MICROFIBER_BATHROOM_RATE,
  MICROFIBER_STANDALONE_RATE,
  MICROFIBER_STANDALONE_MINIMUM,
} from "./microfiberMoppingConfig";

const DEFAULT_FORM: MicrofiberMoppingFormState = {
  bathroomSqFt: 0,
  nonBathroomSqFt: 0,
  standalone: false,
  frequency: "weekly",
  tripChargeIncluded: true,
  notes: "",
};

export function useMicrofiberMoppingCalc(initialData: MicrofiberMoppingFormState) {
  const [form, setForm] = useState<MicrofiberMoppingFormState>(initialData || DEFAULT_FORM);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const target = e.target as HTMLInputElement | HTMLSelectElement;

    const { name, value, type } = target;
    const checked =
      type === "checkbox" ? (target as HTMLInputElement).checked : undefined;

    setForm((prev) => {
      if (name === "bathroomSqFt")
        return { ...prev, bathroomSqFt: Number(value) || 0 };

      if (name === "nonBathroomSqFt")
        return { ...prev, nonBathroomSqFt: Number(value) || 0 };

      if (name === "standalone") {
        return {
          ...prev,
          standalone: type === "checkbox" ? checked! : value === "true",
        };
      }

      if (name === "frequency") {
        return {
          ...prev,
          frequency: value as MicrofiberMoppingFormState["frequency"],
        };
      }

      if (name === "notes") {
        return { ...prev, notes: value };
      }

      return prev;
    });
  };

  const quote: ServiceQuoteResult = useMemo(() => {
    let perVisit = 0;

    if (!form.standalone) {
      // Included with Sani — cheap bathroom-only rate
      perVisit += form.bathroomSqFt * MICROFIBER_BATHROOM_RATE;
    } else {
      // Standalone — use higher rate for entire area
      perVisit +=
        (form.bathroomSqFt + form.nonBathroomSqFt) *
        MICROFIBER_STANDALONE_RATE;

      if (perVisit < MICROFIBER_STANDALONE_MINIMUM) {
        perVisit = MICROFIBER_STANDALONE_MINIMUM;
      }
    }

    const annual = calcAnnualFromPerVisit(perVisit, form.frequency);

    return {
      serviceId: "microfiberMopping",
      displayName: "Microfiber Mopping",
      perVisitPrice: perVisit,
      annualPrice: annual,
      detailsBreakdown: [
        `Bathroom sq ft: ${form.bathroomSqFt}`,
        `Non-bathroom sq ft: ${form.nonBathroomSqFt}`,
        `Standalone: ${form.standalone ? "Yes" : "No"}`,
        `Frequency: ${form.frequency}`,
      ],
    };
  }, [form]);

  return { form, setForm, handleChange, quote };
}
