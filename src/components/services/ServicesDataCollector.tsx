// src/components/services/ServicesDataCollector.tsx
import { useImperativeHandle, forwardRef } from "react";
import { useServicesContextOptional } from "./ServicesContext";

export interface ServicesDataHandle {
  getData: () => {
    saniclean: any | null;
    foamingDrain: any | null;
    saniscrub: any | null;
    microfiberMopping: any | null;
    rpmWindows: any | null;
    refreshPowerScrub: any | null;
    sanipod: any | null;
    carpetclean: any | null;
    janitorial: any | null;
    stripwax: any | null;
  };
}

// This component doesn't render anything, it just collects data from context
const ServicesDataCollector = forwardRef<ServicesDataHandle>((props, ref) => {
  const servicesContext = useServicesContextOptional();

  // Expose getData method - reads from context
  useImperativeHandle(ref, () => ({
    getData: () => {
      if (!servicesContext) {
        // Fallback if context not available
        return {
          saniclean: null,
          foamingDrain: null,
          saniscrub: null,
          microfiberMopping: null,
          rpmWindows: null,
          refreshPowerScrub: null,
          sanipod: null,
          carpetclean: null,
          janitorial: null,
          stripwax: null,
        };
      }

      // Read from context - return null if service data is not present
      const state = servicesContext.servicesState;
      return {
        saniclean: state.saniclean?.formData || null,
        foamingDrain: state.foamingDrain || null,
        saniscrub: state.saniscrub || null,
        microfiberMopping: state.microfiberMopping || null,
        rpmWindows: state.rpmWindows || null,
        refreshPowerScrub: state.refreshPowerScrub || null,
        sanipod: state.sanipod || null,
        carpetclean: state.carpetclean || null,
        janitorial: state.janitorial || null,
        stripwax: state.stripwax || null,
      };
    }
  }), [servicesContext]);

  return null; // This component doesn't render anything
});

ServicesDataCollector.displayName = "ServicesDataCollector";
export default ServicesDataCollector;
