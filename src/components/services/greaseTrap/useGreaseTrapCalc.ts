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
      if (name === "notes") {
        return { ...prev, notes: value };
      }
      return prev;
    });
  };

  const quote: ServiceQuoteResult = useMemo(() => {
    const perVisit = (form.numberOfTraps * GREASE_TRAP_PER_TRAP_RATE) + (form.sizeOfTraps * GREASE_TRAP_PER_GALLON_RATE);
    const annual = annualFromPerVisit(perVisit, form.frequency);

    return {
      serviceId: "greaseTrap",
      displayName: "Grease Trap",
      perVisitPrice: perVisit,
      annualPrice: annual,
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
