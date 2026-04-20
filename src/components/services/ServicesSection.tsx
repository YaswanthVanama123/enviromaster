import React, { useState, useImperativeHandle, forwardRef, useMemo, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationTriangle, faSpinner } from "@fortawesome/free-solid-svg-icons";
import "./ServicesSection.css";
import { useServiceConfigs } from "../../backendservice/hooks";
import { ServicesReferenceSection } from "./ServicesReferenceSection";

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
import { ElectrostaticSprayForm } from "./electrostaticSpray/ElectrostaticSprayForm";
import { CustomService, type CustomServiceData } from "./CustomService";
import { useServicesContextOptional } from "./ServicesContext";
import { transformServiceData } from "./common/dataTransformers";


const SERVICE_COMPONENTS: Record<string, React.FC<any>> = {
  saniclean: SanicleanForm,
  foamingDrain: FoamingDrainForm,
  saniscrub: SaniscrubForm,
  microfiberMopping: MicrofiberMoppingForm,
  rpmWindows: RpmWindowsForm,
  refreshPowerScrub: RefreshPowerScrubForm,
  sanipod: SanipodForm,
  carpetclean: CarpetForm,
  carpetCleaning: CarpetForm,       

  pureJanitorial: JanitorialForm,   
  stripwax: StripWaxForm,
  stripWax: StripWaxForm,            
  greaseTrap: GreaseTrapForm,
  electrostaticSpray: ElectrostaticSprayForm,
};


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
    carpetCleaning?: any;  

    pureJanitorial?: any;  
    stripwax?: any;
    stripWax?: any;        
    greaseTrap?: any;
    electrostaticSpray?: any;
    customServices?: CustomServiceData[];  
  };
  activeTab?: string;
  onTabChange?: (tab: string | null) => void;
};


export interface ServicesSectionHandle {
  getCustomServicesData: () => {
    customServices: CustomServiceData[];
    visibleServices: string[];
  };
}

export const ServicesSection = forwardRef<ServicesSectionHandle, ServicesSectionProps>(({
  initialServices,
  activeTab,
  onTabChange,
}, ref) => {

  const { configs, loading } = useServiceConfigs();
  const servicesContext = useServicesContextOptional();


  const validTabs = ['reference', ...configs.map(c => c.serviceId)];
  const currentTab = activeTab && validTabs.includes(activeTab) ? activeTab : null;


  const [visibleServices, setVisibleServices] = useState<Set<string>>(() => {

    if (initialServices && typeof initialServices === 'object') {
      const activeServiceIds = Object.keys(initialServices).filter(
        (key) => initialServices[key as keyof typeof initialServices]?.isActive
      );
      if (activeServiceIds.length > 0) {
        console.log('📋 [ServicesSection] Edit mode detected, showing saved services:', activeServiceIds);


        const normalizedIds = activeServiceIds.map(id => {

          if (id === 'carpetclean') return 'carpetclean'; 
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

    return new Set(configs.filter(c => c.isActive).map(c => c.serviceId));
  });


  const [customServices, setCustomServices] = useState<CustomServiceData[]>(() => {
    if (initialServices?.customServices) {
      console.log('📋 [ServicesSection] Initializing custom services from saved data:', initialServices.customServices);

      const transformedCustomServices = transformServiceData("customServices", initialServices.customServices);
      console.log('📋 [ServicesSection] Transformed custom services:', transformedCustomServices);
      return transformedCustomServices || [];
    }
    return [];
  });


  const [showNewServiceDropdown, setShowNewServiceDropdown] = useState(false);
  const [showRemoveServiceDropdown, setShowRemoveServiceDropdown] = useState(false);


  const configsInitializedRef = useRef(false);


  React.useEffect(() => {
    if (configs.length > 0 && !configsInitializedRef.current) {
      configsInitializedRef.current = true;


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


  const visibleServicesArray = useMemo(() => Array.from(visibleServices), [visibleServices]);


  const lastSavedCustomServicesRef = useRef<string>("");


  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    if (servicesContext) {

      const currentValue = JSON.stringify({
        customServices,
        visibleServices: visibleServicesArray,
      });


      if (currentValue !== lastSavedCustomServicesRef.current) {
        lastSavedCustomServicesRef.current = currentValue;
        servicesContext.updateService("customServices" as any, {
          customServices,
          visibleServices: visibleServicesArray,
        });
      }
    }


  }, [customServices, visibleServicesArray]);


  useImperativeHandle(ref, () => ({
    getCustomServicesData: () => ({
      customServices,
      visibleServices: visibleServicesArray,
    }),
  }), [customServices, visibleServicesArray]);


  const handleAddService = (serviceId: string) => {
    console.log('Adding service:', serviceId);

    if (serviceId === "custom") {

      const newService: CustomServiceData = {
        id: `custom_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        name: "Lorem ipsum",
        fields: [],
      };
      setCustomServices((prev) => [...prev, newService]);
      console.log('Custom service added:', newService.id);
    } else {

      setVisibleServices((prev) => {
        const newSet = new Set([...prev, serviceId]);
        console.log('Updated visible services:', Array.from(newSet));
        return newSet;
      });
    }
    setShowNewServiceDropdown(false);
  };


  const handleRemoveService = (serviceId: string) => {

    const aliasMap: Record<string, string[]> = {
      'carpetCleaning': ['carpetclean'],
      'carpetclean': ['carpetCleaning'],
      'pureJanitorial': ['janitorial'],
      'janitorial': ['pureJanitorial'],
      'stripWax': ['stripwax'],
      'stripwax': ['stripWax'],
    };


    const aliases = aliasMap[serviceId] || [];
    const allIdsToRemove = [serviceId, ...aliases];


    setVisibleServices((prev) => {
      const next = new Set(prev);
      allIdsToRemove.forEach(id => {
        next.delete(id);
        console.log(`🗑️ [ServicesSection] Removing from visible services: ${id}`);
      });
      return next;
    });


    if (servicesContext) {
      allIdsToRemove.forEach(id => {
        console.log(`🗑️ [ServicesSection] Removing service data from context: ${id}`);
        servicesContext.updateService(id as any, null);
      });
    }
  };


  const handleUpdateCustomService = (service: CustomServiceData) => {
    setCustomServices((prev) =>
      prev.map((s) => (s.id === service.id ? service : s))
    );
  };


  const handleRemoveCustomService = (id: string) => {
    setCustomServices((prev) => prev.filter((s) => s.id !== id));
  };


  const availableServices = configs.filter((config) => {

    if (visibleServices.has(config.serviceId)) return false;


    if ((config.serviceId === 'carpetCleaning' || config.serviceId === 'carpetclean') &&
        (visibleServices.has('carpetCleaning') || visibleServices.has('carpetclean'))) {
      return false;
    }
    if ((config.serviceId === 'pureJanitorial' || config.serviceId === 'janitorial') &&
        (visibleServices.has('pureJanitorial') || visibleServices.has('janitorial'))) {
      return false;
    }
    if ((config.serviceId === 'stripWax' || config.serviceId === 'stripwax') &&
        (visibleServices.has('stripWax') || visibleServices.has('stripwax'))) {
      return false;
    }

    return true;
  });


  const activeVisibleServices = configs.filter((config) => {

    if (visibleServices.has(config.serviceId)) return true;


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


  const gridServices = activeVisibleServices.filter(
    (config) => config.serviceId !== "refreshPowerScrub"
  );
  const refreshPowerScrubVisible = activeVisibleServices.some(
    (c) => c.serviceId === "refreshPowerScrub"
  );


  const isServiceVisible = (serviceId: string) => {

    if (!currentTab) return true;

    return serviceId === currentTab;
  };


  console.log('Active Visible Services:', activeVisibleServices.map(c => ({ id: c.serviceId, label: c.label, isActive: c.isActive })));
  console.log('Grid Services:', gridServices.map(c => c.serviceId));
  console.log('Visible Services Set:', Array.from(visibleServices));


  const ServicesReferenceTable = useMemo(() => (
    <ServicesReferenceSection configs={configs} />
  ), [configs]);

  if (loading) {
    return (
      <section className="svc">
        <div className="svc-title">SERVICES</div>
        <div style={{ padding: "20px", textAlign: "center" }}>
          <FontAwesomeIcon icon={faSpinner} spin size="2x" style={{ color: "#3b82f6" }} />
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
              +
            </button>
            <button
              type="button"
              className="svc-btn"
              onClick={() => setShowRemoveServiceDropdown(!showRemoveServiceDropdown)}
              style={{ marginLeft: '8px' }}
            >
              −
            </button>
            {showNewServiceDropdown && (
              <div className="svc-chooser">
                <select
                  className="svc-chooser-select"
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddService(e.target.value);
                      e.target.value = ""; 
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
            {showRemoveServiceDropdown && (
              <div className="svc-chooser">
                <select
                  className="svc-chooser-select"
                  onChange={(e) => {
                    if (e.target.value) {
                      handleRemoveService(e.target.value);
                      e.target.value = ""; 
                      setShowRemoveServiceDropdown(false); 
                    }
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select service to remove...
                  </option>
                  {Array.from(visibleServices).map((serviceId) => {
                    const config = configs.find(c => c.serviceId === serviceId);
                    return (
                      <option key={serviceId} value={serviceId}>
                        {config?.label || serviceId}
                      </option>
                    );
                  })}
                </select>
                <button
                  type="button"
                  className="svc-mini svc-mini--neg"
                  onClick={() => setShowRemoveServiceDropdown(false)}
                  title="Close"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {}
      {onTabChange && activeVisibleServices.length > 0 && (
        <div className="svc-tabs">
          <button
            type="button"
            className={`svc-tab ${!currentTab ? 'svc-tab--active' : ''}`}
            onClick={() => onTabChange(null)}
          >
            All Services
          </button>
          {activeVisibleServices.map((config) => (
            <button
              key={config.serviceId}
              type="button"
              className={`svc-tab ${currentTab === config.serviceId ? 'svc-tab--active' : ''}`}
              onClick={() => onTabChange(config.serviceId)}
            >
              {config.label || config.serviceId}
            </button>
          ))}
          <button
            type="button"
            className={`svc-tab svc-tab--ref ${currentTab === 'reference' ? 'svc-tab--active' : ''}`}
            onClick={() => onTabChange('reference')}
          >
            Services Reference
          </button>
        </div>
      )}

      {}
      {currentTab === 'reference' && ServicesReferenceTable}

      <div className="svc-grid" style={{ display: currentTab === 'reference' ? 'none' : undefined }}>
        {}
        {gridServices.map((config) => {
          const ServiceComponent = SERVICE_COMPONENTS[config.serviceId];
          if (!ServiceComponent) {

            console.warn(`Service component not found for serviceId: "${config.serviceId}". Available services:`, Object.keys(SERVICE_COMPONENTS));
            return (
              <div
                key={config.serviceId}
                className="svc-card"
                style={{
                  padding: '20px',
                  background: '#fff3cd',
                  border: '1px solid #ffc107',
                  display: isServiceVisible(config.serviceId) ? 'block' : 'none'
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FontAwesomeIcon icon={faExclamationTriangle} style={{ color: '#ffc107' }} />
                  Service Not Available
                </div>
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
            <div
              key={config.serviceId}
              className="svc-card-wrapper"
              style={{ display: isServiceVisible(config.serviceId) ? 'block' : 'none' }}
            >
              <ServiceComponent
                initialData={(() => {


                  let rawData = initialServices?.[config.serviceId as keyof typeof initialServices];


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


                  const transformedData = transformServiceData(config.serviceId, rawData);
                  return transformedData;
                })()}
                onRemove={() => handleRemoveService(config.serviceId)}
              />
            </div>
          );
        })}

        {}
        {customServices.map((service) => (
          <div
            key={service.id}
            style={{ display: !currentTab ? 'block' : 'none' }}
          >
            <CustomService
              service={service}
              onUpdate={handleUpdateCustomService}
              onRemove={() => handleRemoveCustomService(service.id)}
            />
          </div>
        ))}
      </div>

      {}
      {refreshPowerScrubVisible && (
        <div style={{ display: (isServiceVisible('refreshPowerScrub') && currentTab !== 'reference') ? 'block' : 'none' }}>
          <RefreshPowerScrubForm
          initialData={(() => {

            const rawData = initialServices?.refreshPowerScrub;
            if (!rawData) return undefined;


            const transformedData = transformServiceData("refreshPowerScrub", rawData);
            return transformedData;
          })()}
          onRemove={() => handleRemoveService("refreshPowerScrub")}
        />
        </div>
      )}
    </section>
  );
});

ServicesSection.displayName = "ServicesSection";
export default ServicesSection;
