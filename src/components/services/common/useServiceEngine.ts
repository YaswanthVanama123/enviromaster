// src/features/services/common/useServiceEngine.ts
import { useSanicleanCalc } from "../saniclean/useSanicleanCalc";
import { useSaniscrubCalc } from "../saniscrub/useSaniscrubCalc";
import { useRpmWindowsCalc } from "../rpmWindows/useRpmWindowsCalc";
import { useRefreshPowerScrubCalc } from "../refreshPowerScrub/useRefreshPowerScrubCalc";
import { useMicrofiberMoppingCalc } from "../microfiberMopping/useMicrofiberMoppingCalc";
import { useFoamingDrainCalc } from "../foamingDrain/useFoamingDrainCalc";
import type { ServiceId, ServiceQuoteResult } from "./serviceTypes";

export function useServiceEngine(serviceId?: ServiceId): {
  quote: ServiceQuoteResult | null;
  saniclean: ReturnType<typeof useSanicleanCalc>;
  saniscrub: ReturnType<typeof useSaniscrubCalc>;
  rpmWindows: ReturnType<typeof useRpmWindowsCalc>;
  refreshPowerScrub: ReturnType<typeof useRefreshPowerScrubCalc>;
  microfiberMopping: ReturnType<typeof useMicrofiberMoppingCalc>;
  foamingDrain: ReturnType<typeof useFoamingDrainCalc>;
} {
  const saniclean = useSanicleanCalc();
  const saniscrub = useSaniscrubCalc();
  const rpmWindows = useRpmWindowsCalc();
  const refreshPowerScrub = useRefreshPowerScrubCalc();
  const microfiberMopping = useMicrofiberMoppingCalc();
  const foamingDrain = useFoamingDrainCalc();

  let quote: ServiceQuoteResult | null = null;
  switch (serviceId) {
    case "saniclean":
      quote = saniclean.quote; break;
    case "saniscrub":
      quote = saniscrub.quote; break;
    case "rpmWindows":
      quote = rpmWindows.quote; break;
    case "refreshPowerScrub":
      quote = refreshPowerScrub.quote; break;
    case "microfiberMopping":
      quote = microfiberMopping.quote; break;
    case "foamingDrain":
      quote = foamingDrain.quote; break;
    default:
      quote = null;
  }

  return {
    quote,
    saniclean,
    saniscrub,
    rpmWindows,
    refreshPowerScrub,
    microfiberMopping,
    foamingDrain,
  };
}
