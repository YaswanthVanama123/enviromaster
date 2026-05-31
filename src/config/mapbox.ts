

export const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

export const MAP_STYLES = {
  streets: 'mapbox://styles/mapbox/streets-v12',
  outdoors: 'mapbox://styles/mapbox/outdoors-v12',
  light: 'mapbox://styles/mapbox/light-v11',
  dark: 'mapbox://styles/mapbox/dark-v11',
  satellite: 'mapbox://styles/mapbox/satellite-v9',
  satelliteStreets: 'mapbox://styles/mapbox/satellite-streets-v12',
  navigationDay: 'mapbox://styles/mapbox/navigation-day-v1',
  navigationNight: 'mapbox://styles/mapbox/navigation-night-v1',
};

export const DEFAULT_MAP_CONFIG = {
  style: MAP_STYLES.streets,
  
  initialViewState: {
    longitude: -98.5795,
    latitude: 39.8283,
    zoom: 4,
  },
  
  attributionControl: true,
  logoPosition: 'bottom-left' as const,
};

export const MARKER_COLORS = {
  customer: '#3b82f6', 
  anchor: '#16a34a',   
  selected: '#dc2626', 
  default: '#6b7280',  
};

export const isMapboxConfigured = (): boolean => {
  return MAPBOX_ACCESS_TOKEN.length > 0 && MAPBOX_ACCESS_TOKEN.startsWith('pk.');
};
