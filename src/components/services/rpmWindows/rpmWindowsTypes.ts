// src/features/services/rpmWindows/rpmWindowsTypes.ts

import type { BaseServiceFormState } from "../common/serviceTypes";

export interface RpmWindowsFormState extends BaseServiceFormState {
  smallWindows: number;
  mediumWindows: number;
  largeWindows: number;
  firstTimeInstall: boolean;
}
