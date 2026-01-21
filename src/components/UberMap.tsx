
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { LatLng, AppState } from '../types';

interface UberMapProps {
  pickup?: LatLng;
  destination?: LatLng;
  driverLoc?: LatLng;
  appState: AppState;
  onMapMove?: (coords: LatLng) => void;
  center?: LatLng;
}

const UberMap: React.FC<UberMapProps> = ({ pickup, destination, driverLoc, appState, onMapMove, center }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersLayer = useRef<L.LayerGroup | null>(null);
  const routeLayer = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (mapRef.current && !mapInstance.current) {
      mapInstance.current = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([12.9716, 77.5946], 13);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(mapInstance.current);

      markersLayer.current = L.layerGroup().addTo(mapInstance.current);

      mapInstance.current.on('move', () => {
        if (onMapMove && mapInstance.current) {
          const c = mapInstance.current.getCenter();
          onMapMove({ lat: c.lat, lng: c.lng });
        }
      });
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [onMapMove]);

  useEffect(() => {
    if (center && mapInstance.current && typeof center.lat === 'number') {
      mapInstance.current.setView([center.lat, center.lng], 16, { animate: true });
    }
  }, [center]);

  useEffect(() => {
    if (!mapInstance.current || !markersLayer.current) return;

    markersLayer.current.clearLayers();
    if (routeLayer.current) {
      routeLayer.current.remove();
      routeLayer.current = null;
    }

    const bounds = L.latLngBounds([]);

    if (pickup && typeof pickup.lat === 'number') {
      const pickupIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="width: 14px; height: 14px; background: #000; border: 3px solid #fff; border-radius: 50%; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });
      L.marker([pickup.lat, pickup.lng], { icon: pickupIcon }).addTo(markersLayer.current);
      bounds.extend([pickup.lat, pickup.lng]);
    }

    if (destination && typeof destination.lat === 'number') {
      const destIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="width: 12px; height: 12px; background: #000; border: 2px solid #fff; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
      });
      L.marker([destination.lat, destination.lng], { icon: destIcon }).addTo(markersLayer.current);
      bounds.extend([destination.lat, destination.lng]);
    }

    if (driverLoc && typeof driverLoc.lat === 'number' && [AppState.TRIP_ACTIVE, AppState.SEARCHING_DRIVER, AppState.ARRIVED].includes(appState)) {
      const driverIcon = L.divIcon({
        className: 'pulse-marker',
        html: `<div style="width: 32px; height: 32px; background: #000; border: 2px solid #fff; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #facc15; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
                 <svg style="width: 20px; height: 20px" fill="currentColor" viewBox="0 0 20 20"><path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" /><path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 011 1v1h2V4H3z" /></svg>
               </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });
      L.marker([driverLoc.lat, driverLoc.lng], { icon: driverIcon }).addTo(markersLayer.current);
    }

    // Fix: Using OSRM API to get actual road geometry instead of a straight line
    if (pickup && destination && typeof pickup.lat === 'number' && typeof destination.lat === 'number') {
      const fetchRoute = async () => {
        try {
          const response = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`
          );
          const data = await response.json();
          if (data.routes && data.routes.length > 0) {
            const coordinates = data.routes[0].geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);

            if (routeLayer.current) routeLayer.current.remove();

            routeLayer.current = L.polyline(coordinates, {
              color: '#000',
              weight: 5,
              opacity: 1,
              lineJoin: 'round'
            }).addTo(mapInstance.current);

            if (!center && mapInstance.current) {
              mapInstance.current.fitBounds(routeLayer.current.getBounds(), { padding: [80, 200] });
            }
          }
        } catch (error) {
          console.error("Routing error:", error);
          // Fallback to straight line if OSRM fails
          const path = [[pickup.lat, pickup.lng], [destination.lat, destination.lng]] as [number, number][];
          if (mapInstance.current) {
            routeLayer.current = L.polyline(path, {
              color: '#000',
              weight: 4,
              opacity: 0.9,
              lineJoin: 'round'
            }).addTo(mapInstance.current);
          }
        }
      };

      fetchRoute();
    } else if (pickup && typeof pickup.lat === 'number' && !center) {
      mapInstance.current.setView([pickup.lat, pickup.lng], 15);
    }
  }, [pickup, destination, driverLoc, appState, center]);

  return (
    <div
      ref={mapRef}
      id="map"
      className="w-full h-full absolute inset-0 z-0 bg-slate-100"
    />
  );
};

export default UberMap;
