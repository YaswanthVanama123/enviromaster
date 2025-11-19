// src/features/services/common/useServiceEngine.ts

import { useSanicleanCalc } from "../saniclean/useSanicleanCalc";
import { useSaniscrubCalc } from "../saniscrub/useSaniscrubCalc";
import { useRpmWindowsCalc } from "../rpmWindows/useRpmWindowsCalc";
import { useRefreshPowerScrubCalc } from "../refreshPowerScrub/useRefreshPowerScrubCalc";
import { useMicrofiberMoppingCalc } from "../microfiberMopping/useMicrofiberMoppingCalc";
import { useFoamingDrainCalc } from "../foamingDrain/useFoamingDrainCalc";
import type { ServiceId, ServiceQuoteResult } from "./serviceTypes";
import {
  DEFAULT_SANICLEAN_FORM,
  DEFAULT_SANISCRUB_FORM,
  DEFAULT_RPM_WINDOWS_FORM,
  DEFAULT_REFRESH_POWER_SCRUB_FORM,
  DEFAULT_MICROFIBER_MOPPING_FORM,
  DEFAULT_FOAMING_DRAIN_FORM,
} from "./defaultStates";

export function useServiceEngine(serviceId: ServiceId): {
  quote: ServiceQuoteResult | null;
  // expose raw hooks when needed:
  saniclean: ReturnType<typeof useSanicleanCalc>;
  saniscrub: ReturnType<typeof useSaniscrubCalc>;
  rpmWindows: ReturnType<typeof useRpmWindowsCalc>;
  refreshPowerScrub: ReturnType<typeof useRefreshPowerScrubCalc>;
  microfiberMopping: ReturnType<typeof useMicrofiberMoppingCalc>;
  foamingDrain: ReturnType<typeof useFoamingDrainCalc>;
} {
  const saniclean = useSanicleanCalc(DEFAULT_SANICLEAN_FORM);
  const saniscrub = useSaniscrubCalc(DEFAULT_SANISCRUB_FORM);
  const rpmWindows = useRpmWindowsCalc(DEFAULT_RPM_WINDOWS_FORM);
  const refreshPowerScrub = useRefreshPowerScrubCalc(
    DEFAULT_REFRESH_POWER_SCRUB_FORM
  );
  const microfiberMopping = useMicrofiberMoppingCalc(
    DEFAULT_MICROFIBER_MOPPING_FORM
  );
  const foamingDrain = useFoamingDrainCalc(DEFAULT_FOAMING_DRAIN_FORM);

  let quote: ServiceQuoteResult | null = null;

  switch (serviceId) {
    case "saniclean":
      quote = saniclean.quote;
      break;
    case "saniscrub":
      quote = saniscrub.quote;
      break;
    case "rpmWindows":
      quote = rpmWindows.quote;
      break;
    case "refreshPowerScrub":
      quote = refreshPowerScrub.quote;
      break;
    case "microfiberMopping":
      quote = microfiberMopping.quote;
      break;
    case "foamingDrain":
      quote = foamingDrain.quote;
      break;
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
