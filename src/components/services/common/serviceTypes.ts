// src/features/services/common/serviceTypes.ts

export type ServiceId =
  | "saniclean"
  | "saniscrub"
  | "rpmWindows"
  | "refreshPowerScrub"
  | "microfiberMopping"
  | "foamingDrain"
  | "greaseTrap";

export type BillingFrequency =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "bimonthly"
  | "quarterly";

export interface BaseServiceFormState {
  serviceId: ServiceId;
  frequency: BillingFrequency;
  tripChargeIncluded?: boolean;
  notes?: string;
}

export interface ServiceQuoteResult {
  serviceId: ServiceId;
  displayName: string;
  perVisitPrice: number;
  annualPrice: number;
  detailsBreakdown: string[];
}

export interface ServiceMeta {
  id: ServiceId;
  label: string;
  description: string;
}
