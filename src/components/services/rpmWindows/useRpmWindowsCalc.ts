import { useMemo, useState } from "react";
import type {ChangeEvent} from 'react';
import type { RpmWindowsFormState } from "./rpmWindowsTypes";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import { annualFromPerVisit } from "../common/pricingUtils";
import { RPM_SMALL_RATE, RPM_MEDIUM_RATE, RPM_LARGE_RATE, RPM_INSTALL_MULTIPLIER, RPM_DEFAULT_TRIP } from "./rpmWindowsConfig";

const DEFAULT_FORM: RpmWindowsFormState = {
  small: 0,
  smallRate: RPM_SMALL_RATE,
  medium: 0,
  mediumRate: RPM_MEDIUM_RATE,
  large: 0,
  largeRate: RPM_LARGE_RATE,
  tripCharge: RPM_DEFAULT_TRIP,
  installMultiplier: 1,
  frequency: "monthly",
  tripChargeIncluded: true,
  notes: "",
};

export function useRpmWindowsCalc(initial?: Partial<RpmWindowsFormState>) {
  const [form, setForm] = useState<RpmWindowsFormState>({ ...DEFAULT_FORM, ...initial });

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target as any;
    setForm((p) => ({ ...p, [name]: name === "frequency" ? value : Number(value) || 0 }));
  };

  const quote: ServiceQuoteResult = useMemo(() => {
    let perVisit =
      form.small * form.smallRate +
      form.medium * form.mediumRate +
      form.large * form.largeRate;

    perVisit *= form.installMultiplier || 1;
    if (form.tripChargeIncluded) perVisit += form.tripCharge || 0;

    const annual = annualFromPerVisit(perVisit, form.frequency);
    return {
      serviceId: "rpmWindows",
      displayName: "RPM Window",
      perVisitPrice: perVisit,
      annualPrice: annual,
      detailsBreakdown: [
        `Small: ${form.small} @ $${form.smallRate}`,
        `Medium: ${form.medium} @ $${form.mediumRate}`,
        `Large: ${form.large} @ $${form.largeRate}`,
        `Install ×${form.installMultiplier}, Trip ${form.tripChargeIncluded ? `$${form.tripCharge}` : "No"}`,
        `Frequency: ${form.frequency}`,
      ],
    };
  }, [form]);

  return { form, setForm, onChange, quote };
}
