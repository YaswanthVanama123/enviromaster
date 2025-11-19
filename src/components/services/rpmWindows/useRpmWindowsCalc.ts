// src/features/services/rpmWindows/useRpmWindowsCalc.ts

import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type { RpmWindowsFormState } from "./rpmWindowsTypes";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import { calcAnnualFromPerVisit } from "../common/pricingUtils";
import {
  RPM_SMALL_RATE,
  RPM_MEDIUM_RATE,
  RPM_LARGE_RATE,
  RPM_FIRST_TIME_MULTIPLIER,
} from "./rpmWindowsConfig";

export function useRpmWindowsCalc(initialData: RpmWindowsFormState) {
  const [form, setForm] = useState<RpmWindowsFormState>(initialData);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement | HTMLSelectElement;
  
    const { name, value, type } = target;
    const checked = type === "checkbox" ? (target as HTMLInputElement).checked : undefined;
  
    setForm((prev) => {
      if (name === "smallWindows") {
        return { ...prev, smallWindows: Number(value) || 0 };
      }
      if (name === "mediumWindows") {
        return { ...prev, mediumWindows: Number(value) || 0 };
      }
      if (name === "largeWindows") {
        return { ...prev, largeWindows: Number(value) || 0 };
      }
      if (name === "firstTimeInstall") {
        return {
          ...prev,
          firstTimeInstall: type === "checkbox" ? checked! : value === "true",
        };
      }
      if (name === "frequency") {
        return {
          ...prev,
          frequency: value as RpmWindowsFormState["frequency"],
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
      form.smallWindows * RPM_SMALL_RATE +
      form.mediumWindows * RPM_MEDIUM_RATE +
      form.largeWindows * RPM_LARGE_RATE;

    if (form.firstTimeInstall) {
      perVisit *= RPM_FIRST_TIME_MULTIPLIER;
    }

    const annual = calcAnnualFromPerVisit(perVisit, form.frequency);

    return {
      serviceId: "rpmWindows",
      displayName: "RPM Windows",
      perVisitPrice: perVisit,
      annualPrice: annual,
      detailsBreakdown: [
        `Small: ${form.smallWindows} @ $${RPM_SMALL_RATE.toFixed(2)}`,
        `Medium: ${form.mediumWindows} @ $${RPM_MEDIUM_RATE.toFixed(2)}`,
        `Large: ${form.largeWindows} @ $${RPM_LARGE_RATE.toFixed(2)}`,
        `First-time install: ${form.firstTimeInstall ? "Yes" : "No"}`,
        `Frequency: ${form.frequency}`,
      ],
    };
  }, [form]);

  return { form, setForm, handleChange, quote };
}
