// src/features/services/refreshPowerScrub/useRefreshPowerScrubCalc.ts

import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type { RefreshPowerScrubFormState } from "./refreshPowerScrubTypes";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import { calcAnnualFromPerVisit } from "../common/pricingUtils";
import {
  REFRESH_MINIMUM_VISIT,
  REFRESH_RATE_PER_HOUR_PER_WORKER,
  REFRESH_TRIP_CHARGE,
} from "./refreshPowerScrubConfig";

export function useRefreshPowerScrubCalc(initialData: RefreshPowerScrubFormState) {
  const [form, setForm] = useState<RefreshPowerScrubFormState>(initialData);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const target = e.target as HTMLInputElement | HTMLSelectElement;

    const { name, value, type } = target;
    const checked =
      type === "checkbox" ? (target as HTMLInputElement).checked : undefined;

    setForm((prev) => {
      if (name === "areaType") {
        return {
          ...prev,
          areaType: value as RefreshPowerScrubFormState["areaType"],
        };
      }
      if (name === "estimatedHours") {
        return { ...prev, estimatedHours: Number(value) || 0 };
      }
      if (name === "workers") {
        return { ...prev, workers: Number(value) || 0 };
      }
      if (name === "frequency") {
        return {
          ...prev,
          frequency: value as RefreshPowerScrubFormState["frequency"],
        };
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
    let perVisit =
      form.estimatedHours * form.workers * REFRESH_RATE_PER_HOUR_PER_WORKER;

    if (form.tripChargeIncluded) {
      perVisit += REFRESH_TRIP_CHARGE;
    }

    if (perVisit < REFRESH_MINIMUM_VISIT) {
      perVisit = REFRESH_MINIMUM_VISIT;
    }

    const annual = calcAnnualFromPerVisit(perVisit, form.frequency);

    return {
      serviceId: "refreshPowerScrub",
      displayName: "Refresh Power Scrub",
      perVisitPrice: perVisit,
      annualPrice: annual,
      detailsBreakdown: [
        `Area type: ${form.areaType}`,
        `Hours: ${form.estimatedHours}`,
        `Workers: ${form.workers}`,
        `Base hourly: $${REFRESH_RATE_PER_HOUR_PER_WORKER.toFixed(2)}`,
        `Trip charge included: ${form.tripChargeIncluded ? "Yes" : "No"}`,
        `Minimum applied: ${
          perVisit === REFRESH_MINIMUM_VISIT ? "Yes" : "No"
        }`,
        `Frequency: ${form.frequency}`,
      ],
    };
  }, [form]);

  return { form, setForm, handleChange, quote };
}
