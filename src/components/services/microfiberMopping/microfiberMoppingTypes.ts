// src/features/services/microfiberMopping/microfiberMoppingTypes.ts

import type { BaseServiceFormState } from "../common/serviceTypes";

export interface MicrofiberMoppingFormState extends BaseServiceFormState {
  bathroomSqFt: number;
  nonBathroomSqFt: number;
  standalone: boolean;
}
