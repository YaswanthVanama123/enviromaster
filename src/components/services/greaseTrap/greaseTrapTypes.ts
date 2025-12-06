// src/features/services/greaseTrap/greaseTrapTypes.ts

import type { BaseServiceFormState } from "../common/serviceTypes";

export interface GreaseTrapFormState extends BaseServiceFormState {
  numberOfTraps: number;
  sizeOfTraps: number;
  pricePerTrap?: number;
  contractMonths?: number;

  // Editable pricing rates
  perTrapRate: number;      // Rate per trap
  perGallonRate: number;    // Rate per gallon
}
