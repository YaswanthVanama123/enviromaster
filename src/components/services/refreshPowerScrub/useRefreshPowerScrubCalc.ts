// src/features/services/refreshPowerScrub/useRefreshPowerScrubCalc.ts
import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type { RefreshPowerScrubFormState } from "./refreshPowerScrubTypes";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import { annualFromPerVisit } from "../common/pricingUtils";
import {
  REFRESH_DEFAULT_HOURLY,
  REFRESH_DEFAULT_MIN,
  REFRESH_DEFAULT_TRIP,
} from "./refreshPowerScrubConfig";

// base defaults for a single Refresh job
const DEFAULT_FORM: RefreshPowerScrubFormState = {
  areaType: "kitchen",
  hours: 1,
  workers: 2,
  hourlyRatePerWorker: REFRESH_DEFAULT_HOURLY,
  tripCharge: REFRESH_DEFAULT_TRIP,
  minimumVisit: REFRESH_DEFAULT_MIN,

  // BaseServiceFormState fields
  frequency: "quarterly",
  tripChargeIncluded: true,
  notes: "",

  // NEW: header-table amounts
  dumpsterAmount: 0,
  patioAmount: 0,
  walkwayAmount: 0,
  fohAmount: 0,
  bohAmount: 0,
  otherAmount: 0,

  // NEW: header-table freqs (free text)
  dumpsterFreq: "",
  patioFreq: "",
  walkwayFreq: "",
  fohFreq: "",
  bohFreq: "",
  otherFreq: "",
};

export function useRefreshPowerScrubCalc(
  initial?: Partial<RefreshPowerScrubFormState>
) {
  const [form, setForm] = useState<RefreshPowerScrubFormState>({
    ...DEFAULT_FORM,
    ...initial,
  });

  const onChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => {
      if (type === "checkbox") {
        return { ...prev, [name]: !!checked };
      }

      const isStringField =
        name === "areaType" ||
        name === "frequency" ||
        name.endsWith("Freq");

      return {
        ...prev,
        [name]: isStringField ? value : Number(value) || 0,
      };
    });
  };

  const quote: ServiceQuoteResult = useMemo(() => {
    let perVisit =
      form.hours * form.workers * form.hourlyRatePerWorker;

    if (form.tripChargeIncluded) {
      perVisit += form.tripCharge;
    }

    // enforce minimum visit
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
