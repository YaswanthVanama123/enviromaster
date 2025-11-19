import { useMemo, useState } from "react";
import type {ChangeEvent} from 'react';
import type { SaniscrubFormState } from "./saniscrubTypes";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import { annualFromPerVisit } from "../common/pricingUtils";
import {
  DEFAULT_SCRUB_FIXTURE_RATE,
  DEFAULT_SCRUB_MIN,
  DEFAULT_SCRUB_NONBATH_RATE,
  DEFAULT_SCRUB_ADDL_500_UNIT,
} from "./saniscrubConfig";

const DEFAULT_FORM: SaniscrubFormState = {
  fixtureCount: 0,
  fixtureUnitRate: DEFAULT_SCRUB_FIXTURE_RATE,
  fixtureMinimumCharge: DEFAULT_SCRUB_MIN,
  nonBathroomSqFt: 0,
  nonBathroomRate: DEFAULT_SCRUB_NONBATH_RATE,
  addl500SqFtUnitRate: DEFAULT_SCRUB_ADDL_500_UNIT,
  installMultiplier: 1,
  frequency: "monthly",
  tripChargeIncluded: true,
  notes: "",
};

export function useSaniscrubCalc(initial?: Partial<SaniscrubFormState>) {
  const [form, setForm] = useState<SaniscrubFormState>({ ...DEFAULT_FORM, ...initial });

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target as any;
    setForm((p) => ({ ...p, [name]: name === "frequency" ? value : Number(value) || 0 }));
  };

  const quote: ServiceQuoteResult = useMemo(() => {
    let perVisit = Math.max(form.fixtureCount * form.fixtureUnitRate, form.fixtureMinimumCharge);
    perVisit += form.nonBathroomSqFt * form.nonBathroomRate;
    perVisit *= form.installMultiplier || 1;

    const annual = annualFromPerVisit(perVisit, form.frequency);

    return {
      serviceId: "saniscrub",
      displayName: "SaniScrub",
      perVisitPrice: perVisit,
      annualPrice: annual,
      detailsBreakdown: [
        `Fixtures: ${form.fixtureCount} @ $${form.fixtureUnitRate.toFixed(2)} (min $${form.fixtureMinimumCharge})`,
        `Non-bath: ${form.nonBathroomSqFt} ft² @ $${form.nonBathroomRate.toFixed(2)}`,
        `Install ×${form.installMultiplier}`,
        `Frequency: ${form.frequency}`,
      ],
    };
  }, [form]);

  return { form, setForm, onChange, quote };
}
