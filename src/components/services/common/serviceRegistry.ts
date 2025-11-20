// src/features/services/common/serviceRegistry.ts
import type { ServiceId, ServiceMeta } from "./serviceTypes";

export const SERVICE_META: Record<ServiceId, ServiceMeta> = {
  saniclean:          { id: "saniclean", label: "SaniClean" },
  saniscrub:          { id: "saniscrub", label: "SaniScrub" },
  rpmWindows:         { id: "rpmWindows", label: "RPM Window" },
  refreshPowerScrub:  { id: "refreshPowerScrub", label: "Refresh Power Scrub" },
  microfiberMopping:  { id: "microfiberMopping", label: "Micromax Floor" },
  foamingDrain:       { id: "foamingDrain", label: "Foaming Drain" },
  sanipod:            { id: "sanipod", label: "SaniPod" },
};

export const SERVICE_ORDER: ServiceId[] = [
  "saniclean",
  "sanipod",
  "foamingDrain",
  "saniscrub",
  "microfiberMopping",
  "rpmWindows",
  "refreshPowerScrub",
];
