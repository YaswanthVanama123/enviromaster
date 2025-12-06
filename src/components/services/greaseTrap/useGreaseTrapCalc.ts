// src/features/services/greaseTrap/useGreaseTrapCalc.ts

import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type { GreaseTrapFormState } from "./greaseTrapTypes";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import { annualFromPerVisit } from "../common/pricingUtils";
import { GREASE_TRAP_PER_TRAP_RATE, GREASE_TRAP_PER_GALLON_RATE } from "./greaseTrapConfig";

export function useGreaseTrapCalc(initialData: GreaseTrapFormState) {
  const [form, setForm] = useState<GreaseTrapFormState>({
    // Set defaults for new rate fields if not provided in initialData
    perTrapRate: GREASE_TRAP_PER_TRAP_RATE,
    perGallonRate: GREASE_TRAP_PER_GALLON_RATE,
    ...initialData
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setForm((prev) => {
      if (name === "numberOfTraps") {
        return { ...prev, numberOfTraps: Number(value) || 0 };
      }
      if (name === "sizeOfTraps") {
        return { ...prev, sizeOfTraps: Number(value) || 0 };
      }
      if (name === "frequency") {
        return { ...prev, frequency: value as GreaseTrapFormState["frequency"] };
      }
      if (name === "contractMonths") {
        return { ...prev, contractMonths: Number(value) || 12 };
      }
      if (name === "notes") {
        return { ...prev, notes: value };
      }
      if (name === "perTrapRate") {
        return { ...prev, perTrapRate: Number(value) || 0 };
      }
      if (name === "perGallonRate") {
        return { ...prev, perGallonRate: Number(value) || 0 };
      }
      return prev;
    });
  };

  const quote: ServiceQuoteResult = useMemo(() => {
    // Use form values instead of hardcoded constants
    const perVisit = (form.numberOfTraps * form.perTrapRate) + (form.sizeOfTraps * form.perGallonRate);
    const annual = annualFromPerVisit(perVisit, form.frequency);

    // Calculate monthly based on frequency
    let monthlyTotal = 0;
    switch (form.frequency) {
      case 'daily': monthlyTotal = perVisit * 30; break;
      case 'weekly': monthlyTotal = perVisit * 4.33; break;
      case 'biweekly': monthlyTotal = perVisit * 2.165; break;
      case 'monthly': monthlyTotal = perVisit; break;
      default: monthlyTotal = perVisit * 4.33;
    }

    const contractMonths = form.contractMonths || 12;
    const contractTotal = monthlyTotal * contractMonths;

    return {
      serviceId: "greaseTrap",
      displayName: "Grease Trap",
      perVisitPrice: perVisit,
      perVisitTotal: perVisit,
      annualPrice: annual,
      monthlyTotal,
      contractTotal,
      detailsBreakdown: [
        `Number of traps: ${form.numberOfTraps} @ $${form.perTrapRate.toFixed(2)}`,
        `Size of traps (gallons): ${form.sizeOfTraps} @ $${form.perGallonRate.toFixed(2)}`,
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
