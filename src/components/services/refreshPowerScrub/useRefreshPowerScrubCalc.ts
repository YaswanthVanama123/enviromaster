import { useMemo, useState } from "react";
import type {ChangeEvent} from 'react';
import type { RefreshPowerScrubFormState } from "./refreshPowerScrubTypes";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import { annualFromPerVisit } from "../common/pricingUtils";
import { REFRESH_DEFAULT_HOURLY, REFRESH_DEFAULT_MIN, REFRESH_DEFAULT_TRIP } from "./refreshPowerScrubConfig";

const DEFAULT_FORM: RefreshPowerScrubFormState = {
  areaType: "kitchen",
  hours: 1,
  workers: 2,
  hourlyRatePerWorker: REFRESH_DEFAULT_HOURLY,
  tripCharge: REFRESH_DEFAULT_TRIP,
  minimumVisit: REFRESH_DEFAULT_MIN,
  frequency: "quarterly",
  tripChargeIncluded: true,
  notes: "",
};

export function useRefreshPowerScrubCalc(initial?: Partial<RefreshPowerScrubFormState>) {
  const [form, setForm] = useState<RefreshPowerScrubFormState>({ ...DEFAULT_FORM, ...initial });

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as any;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? !!checked : name === "areaType" || name === "frequency" ? value : Number(value) || 0 }));
  };

  const quote: ServiceQuoteResult = useMemo(() => {
    let perVisit = form.hours * form.workers * form.hourlyRatePerWorker;
    if (form.tripChargeIncluded) perVisit += form.tripCharge;
    perVisit = Math.max(perVisit, form.minimumVisit);
    const annual = annualFromPerVisit(perVisit, form.frequency);
    return {
      serviceId: "refreshPowerScrub",
      displayName: "Refresh Power Scrub",
      perVisitPrice: perVisit,
      annualPrice: annual,
      detailsBreakdown: [
        `${form.workers} workers × ${form.hours} hr @ $${form.hourlyRatePerWorker}`,
        `Trip ${form.tripChargeIncluded ? `$${form.tripCharge}` : "No"}`,
        `Min $${form.minimumVisit}`,
        `Area: ${form.areaType}, Freq: ${form.frequency}`,
      ],
    };
  }, [form]);

  return { form, setForm, onChange, quote };
}
