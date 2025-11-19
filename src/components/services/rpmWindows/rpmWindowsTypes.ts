import type { BaseServiceFormState } from "../common/serviceTypes";

export interface RpmWindowsFormState extends BaseServiceFormState {
  small: number;
  smallRate: number;
  medium: number;
  mediumRate: number;
  large: number;
  largeRate: number;
  tripCharge: number;
  installMultiplier: number; // 3x first time etc.
}
