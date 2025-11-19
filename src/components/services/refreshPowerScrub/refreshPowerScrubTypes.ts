// src/features/services/refreshPowerScrub/refreshPowerScrubTypes.ts

import type { BaseServiceFormState } from "../common/serviceTypes";

export type RefreshAreaType = "kitchen" | "frontOfHouse" | "patio" | "dumpster";

export interface RefreshPowerScrubFormState extends BaseServiceFormState {
  areaType: RefreshAreaType;
  estimatedHours: number;
  workers: number;
}
