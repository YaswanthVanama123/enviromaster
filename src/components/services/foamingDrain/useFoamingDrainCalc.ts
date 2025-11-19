import { useMemo, useState, } from "react";
import type {ChangeEvent} from 'react';
import type { FoamingDrainFormState } from "./foamingDrainTypes";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import { annualFromPerVisit } from "../common/pricingUtils";
import { FD_INSTALL_MULT, FD_LARGE_BASE, FD_LARGE_RATE, FD_STANDARD_RATE } from "./foamingDrainConfig";

const DEFAULT_FORM: FoamingDrainFormState = {
  totalDrains: 0,
  greaseTraps: 0,
  standardPlanRate: FD_STANDARD_RATE,
  largePlanRate: FD_LARGE_RATE,
  largePlanCount: 0,
  baseChargeForLargePlan: FD_LARGE_BASE,
  installMultiplier: FD_INSTALL_MULT,
  frequency: "weekly",
  tripChargeIncluded: true,
  notes: "",
};

export function useFoamingDrainCalc(initial?: Partial<FoamingDrainFormState>) {
  const [form, setForm] = useState<FoamingDrainFormState>({ ...DEFAULT_FORM, ...initial });

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target as any;
    setForm((p) => ({ ...p, [name]: name === "frequency" ? value : Number(value) || 0 }));
  };

  const quote: ServiceQuoteResult = useMemo(() => {
    let perVisit =
      form.totalDrains * form.standardPlanRate +
      form.largePlanCount * form.largePlanRate +
      (form.largePlanCount > 0 ? form.baseChargeForLargePlan : 0);

    perVisit *= form.installMultiplier || 1;

    const annual = annualFromPerVisit(perVisit, form.frequency);
    return {
      serviceId: "foamingDrain",
      displayName: "Foaming Drain",
      perVisitPrice: perVisit,
      annualPrice: annual,
      detailsBreakdown: [
        `Std drains: ${form.totalDrains} @ $${form.standardPlanRate}`,
        `Large drains: ${form.largePlanCount} @ $${form.largePlanRate}`,
        `Large plan base: $${form.baseChargeForLargePlan}`,
        `Install ×${form.installMultiplier}, Freq: ${form.frequency}`,
      ],
    };
  }, [form]);

  return { form, setForm, onChange, quote };
}
