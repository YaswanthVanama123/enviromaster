// src/features/services/common/serviceTypes.ts

export type ServiceId =
  | "saniclean"
  | "saniscrub"
  | "rpmWindows"
  | "refreshPowerScrub"
  | "microfiberMopping"
  | "foamingDrain";

export type BillingFrequency =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "bimonthly"
  | "quarterly";

export interface BaseServiceFormState {
  frequency: BillingFrequency;
  tripChargeIncluded?: boolean;
  notes?: string;
}

// What each calculator returns (for summary or persistence)
export interface ServiceQuoteResult {
  serviceId: ServiceId;
  displayName: string;
  perVisitPrice: number;   // “= ____” in the card row
  annualPrice: number;     // normalized annual
  detailsBreakdown: string[];
}

// Optional registry meta
export interface ServiceMeta {
  id: ServiceId;
  label: string;
  description?: string;
}

// Optional prop for prefill
export interface ServiceInitialData<T> {
  initialData?: Partial<T>;
}
