// src/features/services/greaseTrap/greaseTrapTypes.ts

import type { BaseServiceFormState } from "../common/serviceTypes";

export interface GreaseTrapFormState extends BaseServiceFormState {
  numberOfTraps: number;
  sizeOfTraps: number;
}
