import { useMemo, useState } from "react";
import type {ChangeEvent} from 'react';
import type { MicrofiberMoppingFormState } from "./microfiberMoppingTypes";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import { annualFromPerVisit } from "../common/pricingUtils";
import { MF_COMBINED_RATE, MF_EXTRAAREA_RATE, MF_STANDALONE_MIN, MF_STANDALONE_RATE } from "./microfiberMoppingConfig";

const DEFAULT_FORM: MicrofiberMoppingFormState = {
  isCombinedWithSani: true,
  bathroomsSqFt: 0,
  bathroomsRate: MF_COMBINED_RATE,
  extraNonBathSqFt: 0,
  extraNonBathRate: MF_EXTRAAREA_RATE,
  standaloneSqFt: 0,
  standaloneRate: MF_STANDALONE_RATE,
  standaloneMinimum: MF_STANDALONE_MIN,
  frequency: "weekly",
  tripChargeIncluded: true,
  notes: "",
};

export function useMicrofiberMoppingCalc(initial?: Partial<MicrofiberMoppingFormState>) {
  const [form, setForm] = useState<MicrofiberMoppingFormState>({ ...DEFAULT_FORM, ...initial });

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as any;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? !!checked : name === "frequency" ? value : Number(value) || 0 }));
  };

  const quote: ServiceQuoteResult = useMemo(() => {
    let perVisit = 0;

    if (form.isCombinedWithSani) {
      perVisit += form.bathroomsSqFt * form.bathroomsRate;
      perVisit += form.extraNonBathSqFt * form.extraNonBathRate;
    } else {
      perVisit += form.standaloneSqFt * form.standaloneRate;
      perVisit = Math.max(perVisit, form.standaloneMinimum);
    }

    const annual = annualFromPerVisit(perVisit, form.frequency);
    return {
      serviceId: "microfiberMopping",
      displayName: "Micromax Floor",
      perVisitPrice: perVisit,
      annualPrice: annual,
      detailsBreakdown: [
        `Combined: ${form.isCombinedWithSani ? "Yes" : "No"}`,
        `Bath ${form.bathroomsSqFt} ft² @ $${form.bathroomsRate.toFixed(4)}`,
        `Extra ${form.extraNonBathSqFt} ft² @ $${form.extraNonBathRate.toFixed(4)}`,
        `Standalone ${form.standaloneSqFt} ft² @ $${form.standaloneRate.toFixed(4)} (min $${form.standaloneMinimum})`,
        `Frequency: ${form.frequency}`,
      ],
    };
  }, [form]);

  return { form, setForm, onChange, quote };
}
