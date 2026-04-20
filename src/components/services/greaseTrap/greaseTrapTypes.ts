

import type { BaseServiceFormState } from "../common/serviceTypes";

export interface GreaseTrapFormState extends BaseServiceFormState {
  numberOfTraps: number;
  sizeOfTraps: number;
  pricePerTrap?: number;
  contractMonths?: number;


  perTrapRate: number;      
  perGallonRate: number;    
}
