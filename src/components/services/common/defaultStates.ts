// src/components/services/common/defaultStates.ts

import type { SanicleanFormState } from "../saniclean/sanicleanTypes";
import type { SaniscrubFormState } from "../saniscrub/saniscrubTypes";
import type { RpmWindowsFormState } from "../rpmWindows/rpmWindowsTypes";
import type { RefreshPowerScrubFormState } from "../refreshPowerScrub/refreshPowerScrubTypes";
import type { MicrofiberMoppingFormState } from "../microfiberMopping/microfiberMoppingTypes";
import type { FoamingDrainFormState } from "../foamingDrain/foamingDrainTypes";
import type { GreaseTrapFormState } from "../greaseTrap/greaseTrapTypes";
import type { SanipodFormState } from "../sanipod/sanipodTypes";
import type { CarpetFormState } from "../carpetCleaning/carpetTypes";

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

export const DEFAULT_SANIPOD_FORM: SanipodFormState = {
  serviceId: "sanipod",
  podQuantity: 0,
  extraBagsPerWeek: 0,
  extraBagsRecurring: true,
  frequency: "weekly",  // Default to weekly
  weeklyRatePerUnit: 3,
  altWeeklyRatePerUnit: 8,
  extraBagPrice: 2.0,
  isNewInstall: false,
  location: "insideBeltway",
  needsParking: false,
  selectedRateCategory: "redRate",
  bundleType: "none",
  toiletClipsQty: 0,
  seatCoverDispensersQty: 0,
  standaloneExtraWeeklyCharge: 40,
  installRatePerPod: 25,
  tripChargePerVisit: 0,
  contractMonths: 12,
  isStandalone: true,
  tripChargeIncluded: true,
  notes: "",
};

export const DEFAULT_CARPET_CLEANING_FORM: CarpetFormState = {
  serviceId: "carpetCleaning",
  areaSqFt: 1000,
  useExactSqft: true,  // Default to exact calculation
  frequency: "monthly",
  location: "insideBeltway",
  needsParking: false,
  contractMonths: 12,
  includeInstall: true,
  isDirtyInstall: false,
  // Editable pricing rates from config
  unitSqFt: 500,
  firstUnitRate: 250,
  additionalUnitRate: 125,
  perVisitMinimum: 250,
  installMultiplierDirty: 3,
  installMultiplierClean: 1,
  // Default overrides (none)
  tripChargeIncluded: true,
  notes: "",
};
