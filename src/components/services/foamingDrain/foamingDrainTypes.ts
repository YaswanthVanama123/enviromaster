// src/features/services/foamingDrain/foamingDrainTypes.ts

import type { BaseServiceFormState } from "../common/serviceTypes";

export interface FoamingDrainFormState extends BaseServiceFormState {
  numberOfDrains: number;
  includeGreaseTrap: boolean;
  includeGreenDrain: boolean;
}
