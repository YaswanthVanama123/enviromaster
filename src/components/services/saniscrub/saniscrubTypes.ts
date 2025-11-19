// src/features/services/saniscrub/saniscrubTypes.ts

import type { BaseServiceFormState } from "../common/serviceTypes";

export interface SaniscrubFormState extends BaseServiceFormState {
  restroomFixtures: number;
  nonBathroomSqFt: number;
}
