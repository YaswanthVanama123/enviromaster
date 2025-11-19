
// src/components/services/common/defaultStates.ts

import type { SanicleanFormState } from "../saniclean/sanicleanTypes";
import type { SaniscrubFormState } from "../saniscrub/saniscrubTypes";
import type { RpmWindowsFormState } from "../rpmWindows/rpmWindowsTypes";
import type { RefreshPowerScrubFormState } from "../refreshPowerScrub/refreshPowerScrubTypes";
import type { MicrofiberMoppingFormState } from "../microfiberMopping/microfiberMoppingTypes";
import type { FoamingDrainFormState } from "../foamingDrain/foamingDrainTypes";
import type { GreaseTrapFormState } from "../greaseTrap/greaseTrapTypes";

export const DEFAULT_SANICLEAN_FORM: SanicleanFormState = {
  serviceId: "saniclean",
  fixtureCount: 0,
  region: "inside",
  frequency: "weekly",
  tripChargeIncluded: true,
  notes: "",
};

export const DEFAULT_SANISCRUB_FORM: SaniscrubFormState = {
  serviceId: "saniscrub",
  restroomFixtures: 0,
  nonBathroomSqFt: 0,
  frequency: "monthly",
  tripChargeIncluded: true,
  notes: "",
};

export const DEFAULT_RPM_WINDOWS_FORM: RpmWindowsFormState = {
  serviceId: "rpmWindows",
  numberOfWindows: 0,
  region: "inside",
  frequency: "quarterly",
  tripChargeIncluded: true,
  notes: "",
};

export const DEFAULT_REFRESH_POWER_SCRUB_FORM: RefreshPowerScrubFormState = {
  serviceId: "refreshPowerScrub",
  sqFt: 0,
  frequency: "quarterly",
  tripChargeIncluded: true,
  notes: "",
};

export const DEFAULT_MICROFIBER_MOPPING_FORM: MicrofiberMoppingFormState = {
  serviceId: "microfiberMopping",
  bathroomSqFt: 0,
  nonBathroomSqFt: 0,
  standalone: false,
  frequency: "weekly",
  tripChargeIncluded: true,
  notes: "",
};

export const DEFAULT_FOAMING_DRAIN_FORM: FoamingDrainFormState = {
  serviceId: "foamingDrain",
  numberOfDrains: 0,
  includeGreaseTrap: false,
  includeGreenDrain: false,
  frequency: "weekly",
  tripChargeIncluded: true,
  notes: "",
};

export const DEFAULT_GREASE_TRAP_FORM: GreaseTrapFormState = {
  serviceId: "greaseTrap",
  numberOfTraps: 0,
  sizeOfTraps: 0,
  frequency: "quarterly",
  tripChargeIncluded: true,
  notes: "",
};
