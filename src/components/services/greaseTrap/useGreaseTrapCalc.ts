// src/features/services/greaseTrap/useGreaseTrapCalc.ts

import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type { GreaseTrapFormState } from "./greaseTrapTypes";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import { annualFromPerVisit } from "../common/pricingUtils";
import { GREASE_TRAP_PER_TRAP_RATE, GREASE_TRAP_PER_GALLON_RATE } from "./greaseTrapConfig";

export function useGreaseTrapCalc(initialData: GreaseTrapFormState) {
  const [form, setForm] = useState<GreaseTrapFormState>(initialData);

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
      return prev;
    });
  };

  const quote: ServiceQuoteResult = useMemo(() => {
    const perVisit = (form.numberOfTraps * GREASE_TRAP_PER_TRAP_RATE) + (form.sizeOfTraps * GREASE_TRAP_PER_GALLON_RATE);
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
        `Number of traps: ${form.numberOfTraps} @ $${GREASE_TRAP_PER_TRAP_RATE.toFixed(2)}`,
        `Size of traps (gallons): ${form.sizeOfTraps} @ $${GREASE_TRAP_PER_GALLON_RATE.toFixed(2)}`,
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
