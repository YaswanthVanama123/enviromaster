/**
 * MapView Component
 * Reusable Mapbox map component for the web app
 */

import { useRef, useCallback } from 'react';
import Map, { Marker, NavigationControl, GeolocateControl, ScaleControl } from 'react-map-gl';
import type { MapRef, MarkerDragEvent, ViewStateChangeEvent } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAPBOX_ACCESS_TOKEN, DEFAULT_MAP_CONFIG, MARKER_COLORS, isMapboxConfigured } from '../../config/mapbox';

export interface MapMarker {
  id: string;
  longitude: number;
  latitude: number;
  color?: string;
  label?: string;
  draggable?: boolean;
}

interface MapViewProps {
  markers?: MapMarker[];
  onMarkerClick?: (marker: MapMarker) => void;
  onMarkerDrag?: (markerId: string, longitude: number, latitude: number) => void;
  onMapClick?: (longitude: number, latitude: number) => void;
  style?: React.CSSProperties;
  className?: string;
  showControls?: boolean;
  initialViewState?: {
    longitude: number;
    latitude: number;
    zoom: number;
  };
}

export function MapView({
  markers = [],
  onMarkerClick,
  onMarkerDrag,
  onMapClick,
  style,
  className,
  showControls = true,
  initialViewState = DEFAULT_MAP_CONFIG.initialViewState,
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);

  const handleMarkerDragEnd = useCallback(
    (markerId: string) => (event: MarkerDragEvent) => {
      if (onMarkerDrag) {
        onMarkerDrag(markerId, event.lngLat.lng, event.lngLat.lat);
      }
    },
    [onMarkerDrag]
  );

  const handleMapClick = useCallback(
    (event: mapboxgl.MapLayerMouseEvent) => {
      if (onMapClick) {
        onMapClick(event.lngLat.lng, event.lngLat.lat);
      }
    },
    [onMapClick]
  );

  // Show error if Mapbox is not configured
  if (!isMapboxConfigured()) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: 300,
          backgroundColor: '#f3f4f6',
          borderRadius: 8,
          border: '2px dashed #d1d5db',
          padding: 20,
          ...style,
        }}
        className={className}
      >
        <div style={{ textAlign: 'center' }}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9ca3af"
            strokeWidth="2"
            style={{ margin: '0 auto 12px' }}
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <h3 style={{ margin: '0 0 8px', color: '#374151', fontSize: 16 }}>
            Mapbox Not Configured
          </h3>
          <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>
            Add your Mapbox access token to <code>.env</code>
            <br />
            <code style={{ fontSize: 12 }}>VITE_MAPBOX_ACCESS_TOKEN=pk.xxx</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
      initialViewState={initialViewState}
      style={{ width: '100%', height: '100%', minHeight: 300, ...style }}
      mapStyle={DEFAULT_MAP_CONFIG.style}
      onClick={handleMapClick}
      attributionControl={DEFAULT_MAP_CONFIG.attributionControl}
      logoPosition={DEFAULT_MAP_CONFIG.logoPosition}
    >
      {/* Map Controls */}
      {showControls && (
        <>
          <NavigationControl position="top-right" />
          <GeolocateControl position="top-right" />
          <ScaleControl position="bottom-right" />
        </>
      )}

      {/* Markers */}
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          longitude={marker.longitude}
          latitude={marker.latitude}
          draggable={marker.draggable}
          onDragEnd={marker.draggable ? handleMarkerDragEnd(marker.id) : undefined}
          onClick={() => onMarkerClick?.(marker)}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
            }}
          >
            <svg
              width="32"
              height="40"
              viewBox="0 0 32 40"
              fill="none"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
            >
              <path
                d="M16 0C7.163 0 0 7.163 0 16c0 8.837 16 24 16 24s16-15.163 16-24C32 7.163 24.837 0 16 0z"
                fill={marker.color || MARKER_COLORS.default}
              />
              <circle cx="16" cy="14" r="6" fill="white" />
            </svg>
            {marker.label && (
              <span
                style={{
                  marginTop: 4,
                  padding: '2px 6px',
                  backgroundColor: 'white',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#374151',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  whiteSpace: 'nowrap',
                }}
              >
                {marker.label}
              </span>
            )}
          </div>
        </Marker>
      ))}
    </Map>
  );
}

export default MapView;
