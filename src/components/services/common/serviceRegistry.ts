// src/features/services/common/serviceRegistry.ts

import type { ServiceId, ServiceMeta } from "./serviceTypes";

export const SERVICE_META: Record<ServiceId, ServiceMeta> = {
  saniclean: {
    id: "saniclean",
    label: "SaniClean",
    description: "Core restroom sanitization fixtures + trip charge.",
  },
  saniscrub: {
    id: "saniscrub",
    label: "SaniScrub",
    description: "Deep scrub service for restroom floors & grout.",
  },
  rpmWindows: {
    id: "rpmWindows",
    label: "RPM Window Program",
    description: "Restore · Protect · Maintain – window cleaning program.",
  },
  refreshPowerScrub: {
    id: "refreshPowerScrub",
    label: "Refresh Power Scrub",
    description: "High-end powerwashing for kitchen / FOH / patios.",
  },
  microfiberMopping: {
    id: "microfiberMopping",
    label: "Microfiber Mopping",
    description: "Add-on or standalone microfiber mopping program.",
  },
  foamingDrain: {
    id: "foamingDrain",
    label: "Foaming Drain / Drain Line",
    description: "Drain line enzyme & foaming drain treatment service.",
  },
};

export const SERVICE_ORDER: ServiceId[] = [
  "saniclean",
  "saniscrub",
  "rpmWindows",
  "refreshPowerScrub",
  "microfiberMopping",
  "foamingDrain",
];
