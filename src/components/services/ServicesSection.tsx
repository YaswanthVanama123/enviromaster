import React, { useState, useImperativeHandle, forwardRef, useMemo, useRef } from "react";
import "./ServicesSection.css";
import { useServiceConfigs } from "../../backendservice/hooks";

import { SanicleanForm } from "../services/saniclean/SanicleanForm";
import { FoamingDrainForm }  from "../services/foamingDrain/FoamingDrainForm";
import { SaniscrubForm } from "../services/saniscrub/SaniscrubForm";
import { MicrofiberMoppingForm } from "../services/microfiberMopping/MicrofiberMoppingForm";
import { RpmWindowsForm } from "../services/rpmWindows/RpmWindowsForm";
import { RefreshPowerScrubForm } from "../services/refreshPowerScrub/RefreshPowerScrubForm";
import { SanipodForm } from "./sanipod/SanipodForm";
import { CarpetForm } from "./carpetCleaning/CarpetForm";
import { JanitorialForm } from "./purejanitorial/JanitorialForm";
import { StripWaxForm } from "./stripWax/StripWaxForm";
import { GreaseTrapForm } from "./greaseTrap/GreaseTrapForm";
import { CustomService, type CustomServiceData } from "./CustomService";
import { useServicesContextOptional } from "./ServicesContext";
import { transformServiceData } from "./common/dataTransformers";

// Map service IDs to their corresponding form components
const SERVICE_COMPONENTS: Record<string, React.FC<any>> = {
  saniclean: SanicleanForm,
  foamingDrain: FoamingDrainForm,
  saniscrub: SaniscrubForm,
  microfiberMopping: MicrofiberMoppingForm,
  rpmWindows: RpmWindowsForm,
  refreshPowerScrub: RefreshPowerScrubForm,
  sanipod: SanipodForm,
  carpetclean: CarpetForm,
  carpetCleaning: CarpetForm,       // Alias for backend compatibility
  janitorial: JanitorialForm,
  pureJanitorial: JanitorialForm,   // Alias for backend compatibility
  stripwax: StripWaxForm,
  stripWax: StripWaxForm,            // Alias for backend compatibility
  greaseTrap: GreaseTrapForm,
};

// Optional prop if you prefill from backend
type ServicesSectionProps = {
  initialServices?: {
    saniclean?: any;
    foamingDrain?: any;
    saniscrub?: any;
    microfiberMopping?: any;
    rpmWindows?: any;
    refreshPowerScrub?: any;
    sanipod?: any;
    carpetclean?: any;
    carpetCleaning?: any;  // Alias for backend compatibility
    janitorial?: any;
    pureJanitorial?: any;  // Alias for backend compatibility
    stripwax?: any;
    stripWax?: any;        // Alias for backend compatibility
    greaseTrap?: any;
  };
};

// Export handle to get custom services data
export interface ServicesSectionHandle {
  getCustomServicesData: () => {
    customServices: CustomServiceData[];
    visibleServices: string[];
  };
}

export const ServicesSection = forwardRef<ServicesSectionHandle, ServicesSectionProps>(({
  initialServices,
}, ref) => {
  // Fetch service configs to determine which services are active
  const { configs, loading } = useServiceConfigs();
  const servicesContext = useServicesContextOptional();

  // State for which services are currently visible
  const [visibleServices, setVisibleServices] = useState<Set<string>>(() => {
    // If we have initial services (edit mode), show those services
    if (initialServices && typeof initialServices === 'object') {
      const activeServiceIds = Object.keys(initialServices).filter(
        (key) => initialServices[key as keyof typeof initialServices]?.isActive
      );
      if (activeServiceIds.length > 0) {
        console.log('📋 [ServicesSection] Edit mode detected, showing saved services:', activeServiceIds);

        // Normalize service IDs to handle aliases
        const normalizedIds = activeServiceIds.map(id => {
          // Map common aliases to their canonical form
          if (id === 'carpetclean') return 'carpetclean'; // Keep as-is, config will match via alias check
          if (id === 'carpetCleaning') return 'carpetclean';
          if (id === 'janitorial') return 'janitorial';
          if (id === 'pureJanitorial') return 'janitorial';
          if (id === 'stripwax') return 'stripwax';
          if (id === 'stripWax') return 'stripwax';
          return id;
        });

        return new Set(normalizedIds);
      }
    }
    // Otherwise, show all active services from configs
    return new Set(configs.filter(c => c.isActive).map(c => c.serviceId));
  });

  // State for custom services
  const [customServices, setCustomServices] = useState<CustomServiceData[]>([]);

  // State for "New Service" dropdown
  const [showNewServiceDropdown, setShowNewServiceDropdown] = useState(false);

  // Use ref to track if configs have been initialized to prevent infinite loop
  const configsInitializedRef = useRef(false);

  // Update visible services when configs load (only once, and only if not in edit mode)
  React.useEffect(() => {
    if (configs.length > 0 && !configsInitializedRef.current) {
      configsInitializedRef.current = true;

      // Only update visible services if we're NOT in edit mode
      const hasInitialServices = initialServices && typeof initialServices === 'object' &&
        Object.keys(initialServices).some((key) => initialServices[key as keyof typeof initialServices]?.isActive);

      if (!hasInitialServices) {
        console.log('📋 [ServicesSection] New form mode, showing active services from config');
        setVisibleServices(new Set(configs.filter(c => c.isActive).map(c => c.serviceId)));
      } else {
        console.log('📋 [ServicesSection] Edit mode, keeping visible services from saved data');
      }
    }
  }, [configs, initialServices]);

  // Memoize the array conversion to prevent infinite loops
  const visibleServicesArray = useMemo(() => Array.from(visibleServices), [visibleServices]);

  // Use ref to track last saved value to prevent unnecessary updates
  const lastSavedCustomServicesRef = useRef<string>("");

  // Save custom services to context whenever they change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    if (servicesContext) {
      // Create a stable string representation to compare
      const currentValue = JSON.stringify({
        customServices,
        visibleServices: visibleServicesArray,
      });

      // Only update if data actually changed
      if (currentValue !== lastSavedCustomServicesRef.current) {
        lastSavedCustomServicesRef.current = currentValue;
        servicesContext.updateService("customServices" as any, {
          customServices,
          visibleServices: visibleServicesArray,
        });
      }
    }
    // NOTE: servicesContext omitted from deps to prevent infinite loop
    // updateService is a stable callback (useCallback with empty deps)
  }, [customServices, visibleServicesArray]);

  // Expose method to get custom services data
  useImperativeHandle(ref, () => ({
    getCustomServicesData: () => ({
      customServices,
      visibleServices: visibleServicesArray,
    }),
  }), [customServices, visibleServicesArray]);

  // Handler to add a service back
  const handleAddService = (serviceId: string) => {
    console.log('Adding service:', serviceId);

    if (serviceId === "custom") {
      // Add a new custom service
      const newService: CustomServiceData = {
        id: `custom_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        name: "Lorem ipsum",
        fields: [],
      };
      setCustomServices((prev) => [...prev, newService]);
      console.log('Custom service added:', newService.id);
    } else {
      // Add an existing service
      setVisibleServices((prev) => {
        const newSet = new Set([...prev, serviceId]);
        console.log('Updated visible services:', Array.from(newSet));
        return newSet;
      });
    }
    setShowNewServiceDropdown(false);
  };

  // Handler to remove a service
  const handleRemoveService = (serviceId: string) => {
    setVisibleServices((prev) => {
      const next = new Set(prev);
      next.delete(serviceId);
      return next;
    });
  };

  // Handler to update a custom service
  const handleUpdateCustomService = (service: CustomServiceData) => {
    setCustomServices((prev) =>
      prev.map((s) => (s.id === service.id ? service : s))
    );
  };

  // Handler to remove a custom service
  const handleRemoveCustomService = (id: string) => {
    setCustomServices((prev) => prev.filter((s) => s.id !== id));
  };

  // Get available services to add
  // Only show services that are NOT currently visible
  const availableServices = configs.filter(
    (config) => !visibleServices.has(config.serviceId)
  );

  // Filter visible services (show all services in visibleServices, active or inactive)
  const activeVisibleServices = configs.filter((config) => {
    // Check if the config's serviceId is in visibleServices
    if (visibleServices.has(config.serviceId)) return true;

    // Also check for aliases
    if ((config.serviceId === 'carpetCleaning' || config.serviceId === 'carpetclean') &&
        (visibleServices.has('carpetCleaning') || visibleServices.has('carpetclean'))) {
      return true;
    }
    if ((config.serviceId === 'pureJanitorial' || config.serviceId === 'janitorial') &&
        (visibleServices.has('pureJanitorial') || visibleServices.has('janitorial'))) {
      return true;
    }
    if ((config.serviceId === 'stripWax' || config.serviceId === 'stripwax') &&
        (visibleServices.has('stripWax') || visibleServices.has('stripwax'))) {
      return true;
    }

    return false;
  });

  // Separate RefreshPowerScrub from grid services
  const gridServices = activeVisibleServices.filter(
    (config) => config.serviceId !== "refreshPowerScrub"
  );
  const refreshPowerScrubVisible = activeVisibleServices.some(
    (c) => c.serviceId === "refreshPowerScrub"
  );

  // Debug logging
  console.log('Active Visible Services:', activeVisibleServices.map(c => ({ id: c.serviceId, label: c.label, isActive: c.isActive })));
  console.log('Grid Services:', gridServices.map(c => c.serviceId));
  console.log('Visible Services Set:', Array.from(visibleServices));

  if (loading) {
    return (
      <section className="svc">
        <div className="svc-title">SERVICES</div>
        <div style={{ padding: "20px", textAlign: "center" }}>
          Loading services...
        </div>
      </section>
    );
  }

  return (
    <section className="svc">
      <div className="svc-title svc-title--hasActions">
        SERVICES
        <div className="svc-actions">
          <div className="svc-chooser-wrap">
            <button
              type="button"
              className="svc-btn"
              onClick={() => setShowNewServiceDropdown(!showNewServiceDropdown)}
            >
              + New Service
            </button>
            {showNewServiceDropdown && (
              <div className="svc-chooser">
                <select
                  className="svc-chooser-select"
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddService(e.target.value);
                      e.target.value = ""; // Reset dropdown
                    }
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select service...
                  </option>
                  {availableServices.map((config) => (
                    <option key={config.serviceId} value={config.serviceId}>
                      {config.label || config.serviceId}
                    </option>
                  ))}
                  <option value="custom">Custom</option>
                </select>
                <button
                  type="button"
                  className="svc-mini svc-mini--neg"
                  onClick={() => setShowNewServiceDropdown(false)}
                  title="Close"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="svc-grid">
        {gridServices.map((config) => {
          const ServiceComponent = SERVICE_COMPONENTS[config.serviceId];
          if (!ServiceComponent) {
            // Service component not found - log warning and show placeholder
            console.warn(`Service component not found for serviceId: "${config.serviceId}". Available services:`, Object.keys(SERVICE_COMPONENTS));
            return (
              <div key={config.serviceId} className="svc-card" style={{ padding: '20px', background: '#fff3cd', border: '1px solid #ffc107' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>⚠️ Service Not Available</div>
                <div>Service ID: {config.serviceId}</div>
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                  This service ({config.label || config.serviceId}) is configured in the backend but doesn't have a corresponding form component.
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveService(config.serviceId)}
                  style={{ marginTop: '10px', padding: '5px 10px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Remove
                </button>
              </div>
            );
          }

          return (
            <div key={config.serviceId} className="svc-card-wrapper">
              <button
                type="button"
                className="svc-card-remove"
                onClick={() => handleRemoveService(config.serviceId)}
                title="Remove service"
              >
                −
              </button>
              <ServiceComponent
                initialData={(() => {
                  // Try to find initial data by checking both the serviceId and common aliases
                  let rawData = initialServices?.[config.serviceId as keyof typeof initialServices];

                  // If not found, try common aliases
                  if (!rawData) {
                    if (config.serviceId === 'carpetCleaning' || config.serviceId === 'carpetclean') {
                      rawData = initialServices?.carpetCleaning || initialServices?.carpetclean;
                    } else if (config.serviceId === 'pureJanitorial' || config.serviceId === 'janitorial') {
                      rawData = initialServices?.pureJanitorial || initialServices?.janitorial;
                    } else if (config.serviceId === 'stripWax' || config.serviceId === 'stripwax') {
                      rawData = initialServices?.stripWax || initialServices?.stripwax;
                    }
                  }

                  if (!rawData) return undefined;

                  // Transform structured data back to form state
                  const transformedData = transformServiceData(config.serviceId, rawData);
                  console.log(`🔄 [ServicesSection] Transformed ${config.serviceId} data:`, {
                    raw: rawData,
                    transformed: transformedData
                  });
                  return transformedData;
                })()}
              />
            </div>
          );
        })}

        {/* Render custom services */}
        {customServices.map((service) => (
          <CustomService
            key={service.id}
            service={service}
            onUpdate={handleUpdateCustomService}
            onRemove={() => handleRemoveCustomService(service.id)}
          />
        ))}
      </div>

      {/* RefreshPowerScrub is special - render outside grid for full width */}
      {refreshPowerScrubVisible && (
        <RefreshPowerScrubForm
          initialData={(() => {
            const rawData = initialServices?.refreshPowerScrub;
            if (!rawData) return undefined;

            // Transform structured data back to form state
            const transformedData = transformServiceData("refreshPowerScrub", rawData);
            console.log('🔄 [ServicesSection] Transformed refreshPowerScrub data:', {
              raw: rawData,
              transformed: transformedData
            });
            return transformedData;
          })()}
          onRemove={() => handleRemoveService("refreshPowerScrub")}
        />
      )}
    </section>
  );
});

ServicesSection.displayName = "ServicesSection";
export default ServicesSection;