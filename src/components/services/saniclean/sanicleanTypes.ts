// src/features/services/saniclean/sanicleanTypes.ts

import type { BaseServiceFormState } from "../common/serviceTypes";

export type SaniRegion = "inside" | "outside" | "standard";

export interface SanicleanFormState extends BaseServiceFormState {
  fixtureCount: number;
  region: SaniRegion;
}
