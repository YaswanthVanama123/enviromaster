// src/features/services/foamingDrain/useFoamingDrainCalc.ts

import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type { FoamingDrainFormState } from "./foamingDrainTypes";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import { calcAnnualFromPerVisit } from "../common/pricingUtils";
import {
  FOAMING_DRAIN_PER_DRAIN,
  FOAMING_DRAIN_BUNDLE_BASE,
  GREEN_DRAIN_INSTALL,
  GREEN_DRAIN_WEEKLY,
  GREASE_TRAP_INSTALL,
  GREASE_TRAP_WEEKLY,
} from "./foamingDrainConfig";

export function useFoamingDrainCalc(initialData: FoamingDrainFormState) {
  const [form, setForm] = useState<FoamingDrainFormState>(initialData);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const target = e.target as HTMLInputElement | HTMLSelectElement;

    const { name, value, type } = target;
    const checked =
      type === "checkbox" ? (target as HTMLInputElement).checked : undefined;

    setForm((prev) => {
      if (name === "numberOfDrains") {
        return { ...prev, numberOfDrains: Number(value) || 0 };
      }
      if (name === "includeGreaseTrap") {
        return {
          ...prev,
          includeGreaseTrap:
            type === "checkbox" ? checked! : value === "true",
        };
      }
      if (name === "includeGreenDrain") {
        return {
          ...prev,
          includeGreenDrain:
            type === "checkbox" ? checked! : value === "true",
        };
      }
      if (name === "frequency") {
        return {
          ...prev,
          frequency: value as FoamingDrainFormState["frequency"],
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
      FOAMING_DRAIN_BUNDLE_BASE +
      form.numberOfDrains * FOAMING_DRAIN_PER_DRAIN;

    // base annual calculation
    let annual = calcAnnualFromPerVisit(perVisit, form.frequency);

    // add-ons
    if (form.includeGreenDrain) {
      annual += GREEN_DRAIN_INSTALL + GREEN_DRAIN_WEEKLY * 52;
    }

    if (form.includeGreaseTrap) {
      annual += GREASE_TRAP_INSTALL + GREASE_TRAP_WEEKLY * 52;
    }

    const frequencyMap = {
      weekly: 50,
      biweekly: 25,
      monthly: 12,
      bimonthly: 6,
      quarterly: 4,
    };

    const frequencyAnnualMultiplier = frequencyMap[form.frequency] ?? 0;

    const effectivePerVisit =
      frequencyAnnualMultiplier > 0
        ? annual / frequencyAnnualMultiplier
        : perVisit;

    return {
      serviceId: "foamingDrain",
      displayName: "Foaming Drain / Drain Line Service",
      perVisitPrice: effectivePerVisit,
      annualPrice: annual,
      detailsBreakdown: [
        `Drains: ${form.numberOfDrains} @ $${FOAMING_DRAIN_PER_DRAIN.toFixed(
          2
        )}`,
        `Green Drain Included: ${form.includeGreenDrain ? "Yes" : "No"}`,
        `Grease Trap Included: ${form.includeGreaseTrap ? "Yes" : "No"}`,
        `Frequency: ${form.frequency}`,
      ],
    };
  }, [form]);

  return { form, setForm, handleChange, quote };
}
