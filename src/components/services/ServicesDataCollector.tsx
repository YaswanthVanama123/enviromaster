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
    greaseTrap: any | null;
    electrostaticSpray: any | null;
    customServices: any[];
  };
}

// This component doesn't render anything, it just collects data from context
const ServicesDataCollector = forwardRef<ServicesDataHandle>((props, ref) => {
  const servicesContext = useServicesContextOptional();

  // Expose getData method - reads from context
  useImperativeHandle(ref, () => ({
    getData: () => {
      if (!servicesContext) {
        console.warn('⚠️ [ServicesDataCollector] ServicesContext not available, returning empty data');
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
          greaseTrap: null,
          electrostaticSpray: null,
          customServices: [],
        };
      }

      // Read from context - return null if service data is not present
      const state = servicesContext.servicesState;

      // ✅ DEBUG: Log active services to verify all data is collected regardless of tab
      const activeServices = Object.entries(state).filter(([key, data]) =>
        data && typeof data === 'object' && data.isActive
      ).map(([key]) => key);

      console.log('📊 [ServicesDataCollector] Collecting data for all services from context:', {
        allServicesInState: Object.keys(state),
        activeServices,
        stateSnapshot: Object.fromEntries(
          Object.entries(state).map(([key, data]) => [
            key,
            data && typeof data === 'object' && data.isActive ? 'ACTIVE' : 'INACTIVE'
          ])
        )
      });

      // Get custom services data (includes customServices array and visibleServices list)
      const customServicesData = state.customServices;

      const result = {
        saniclean: state.saniclean || null,
        foamingDrain: state.foamingDrain || null,
        saniscrub: state.saniscrub || null,
        microfiberMopping: state.microfiberMopping || null,
        rpmWindows: state.rpmWindows || null,
        refreshPowerScrub: state.refreshPowerScrub || null,
        sanipod: state.sanipod || null,
        carpetclean: state.carpetclean || null,
        janitorial: state.pureJanitorial || null,
        stripwax: state.stripwax || null,
        greaseTrap: state.greaseTrap || null,
        electrostaticSpray: state.electrostaticSpray || null,
        customServices: customServicesData?.customServices || [],
      };

      console.log('✅ [ServicesDataCollector] Final collected data:', {
        services: Object.entries(result).filter(([key, data]) =>
          data && key !== 'customServices'
        ).map(([key]) => key),
        customServicesCount: result.customServices.length
      });

      return result;
    }
  }), [servicesContext]);

  return null; // This component doesn't render anything
});

ServicesDataCollector.displayName = "ServicesDataCollector";
export default ServicesDataCollector;
