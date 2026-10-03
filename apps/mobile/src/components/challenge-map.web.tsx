import { useEffect, useRef, useState } from 'react';

import { Brand } from '@/constants/theme';
import type { Coordinates } from '@/hooks/use-location';
import { categoryColor } from '@/lib/format';
import type { ChallengeSummary } from '@/lib/types';

export const BALTIC_REGION = { latitude: 57.0, longitude: 24.6, latitudeDelta: 6.5, longitudeDelta: 7.5 };

export interface MapFocus {
  lat: number;
  lng: number;
  key: number;
}

export interface ChallengeMapProps {
  challenges: ChallengeSummary[];
  userCoords: Coordinates | null;
  selectedId: string | null;
  onSelect: (challenge: ChallengeSummary | null) => void;
  focus?: MapFocus | null;
  /** Draw a dashed line from the user to this point (GPS challenge mode). */
  routeTo?: { lat: number; lng: number } | null;
  dark?: boolean;
}

// Minimal typing for the parts of Leaflet we use (loaded from a CDN at runtime).
type Leaflet = any;
declare global {
  interface Window {
    L?: Leaflet;
  }
}

const LEAFLET = 'https://unpkg.com/leaflet@1.9.4/dist';
let leafletPromise: Promise<Leaflet> | null = null;

function loadLeaflet(): Promise<Leaflet> {
  if (window.L) return Promise.resolve(window.L);
  leafletPromise ??= new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = `${LEAFLET}/leaflet.css`;
    document.head.appendChild(css);
    const script = document.createElement('script');
    script.src = `${LEAFLET}/leaflet.js`;
    script.onload = () => resolve(window.L);
    script.onerror = () => {
      leafletPromise = null;
      reject(new Error('Map failed to load'));
    };
    document.head.appendChild(script);
  });
  return leafletPromise;
}

function pinHtml(challenge: ChallengeSummary, selected: boolean) {
  const done = challenge.userStatus === 'completed';
  const color = done ? Brand.success : categoryColor(challenge.categoryId);
  const size = selected ? 44 : 34;
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid ${
    selected ? Brand.amber : '#fff'
  };box-shadow:0 2px 6px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font-size:${
    selected ? 19 : 15
  }px;color:#fff;font-weight:800;transition:all .15s ease">${done ? '✓' : challenge.icon}</div>`;
}

export function ChallengeMap({ challenges, userCoords, selectedId, onSelect, focus, routeTo, dark = false }: ChallengeMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet>(null);
  const layers = useRef<{ markers?: Leaflet; user?: Leaflet; route?: Leaflet }>({});
  const centeredOnUser = useRef(false);
  const fittedRoute = useRef<string | null>(null);
  const onSelectRef = useRef(onSelect);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !container.current || map.current) return;
        const instance = L.map(container.current, { zoomControl: false, attributionControl: true }).setView(
          [BALTIC_REGION.latitude, BALTIC_REGION.longitude],
          6,
        );
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
          // A CSS filter turns the standard tiles into a night map for GPS mode.
          className: dark ? 'bc-dark-tiles' : 'bc-tiles',
        }).addTo(instance);
        if (dark && !document.getElementById('bc-dark-tiles')) {
          const style = document.createElement('style');
          style.id = 'bc-dark-tiles';
          style.textContent = '.bc-dark-tiles{filter:invert(1) hue-rotate(180deg) brightness(0.85) contrast(0.9) saturate(0.6)}';
          document.head.appendChild(style);
        }
        instance.on('click', () => onSelectRef.current(null));
        layers.current.markers = L.layerGroup().addTo(instance);
        map.current = instance;
        setReady(true);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, [dark]);

  useEffect(() => {
    const L = window.L;
    const group = layers.current.markers;
    if (!ready || !L || !group) return;
    group.clearLayers();
    for (const challenge of challenges) {
      if (!challenge.place) continue;
      const selected = challenge.id === selectedId;
      const size = selected ? 44 : 34;
      const marker = L.marker([challenge.place.lat, challenge.place.lng], {
        icon: L.divIcon({ html: pinHtml(challenge, selected), className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2] }),
        zIndexOffset: selected ? 1000 : 0,
        title: challenge.title,
      });
      marker.on('click', (event: Leaflet) => {
        L.DomEvent.stopPropagation(event);
        onSelectRef.current(challenge);
      });
      group.addLayer(marker);
    }
  }, [ready, challenges, selectedId]);

  useEffect(() => {
    const L = window.L;
    if (!ready || !L || !userCoords) return;
    const latLng = [userCoords.lat, userCoords.lng];
    if (layers.current.user) layers.current.user.setLatLng(latLng);
    else
      layers.current.user = L.circleMarker(latLng, {
        radius: 8,
        color: '#FFFFFF',
        weight: 3,
        fillColor: Brand.sky,
        fillOpacity: 1,
      }).addTo(map.current);
    if (!centeredOnUser.current && !routeTo) {
      centeredOnUser.current = true;
      map.current.flyTo(latLng, 10, { duration: 0.8 });
    }
  }, [ready, userCoords, routeTo]);

  useEffect(() => {
    const L = window.L;
    if (!ready || !L) return;
    layers.current.route?.remove();
    layers.current.route = undefined;
    if (!routeTo) return;
    const points = userCoords ? [[userCoords.lat, userCoords.lng], [routeTo.lat, routeTo.lng]] : [[routeTo.lat, routeTo.lng]];
    if (points.length === 2) {
      layers.current.route = L.polyline(points, { color: '#FFFFFF', weight: 4, dashArray: '2 10', lineCap: 'round' }).addTo(map.current);
    }
    // Frame the route once per target (and again when the first GPS fix arrives), not on every GPS tick.
    const key = `${routeTo.lat},${routeTo.lng},${points.length}`;
    if (fittedRoute.current === key) return;
    fittedRoute.current = key;
    if (points.length === 2) map.current.fitBounds(points, { paddingTopLeft: [60, 160], paddingBottomRight: [60, 300], maxZoom: 16 });
    else {
      map.current.setView(points[0], 14, { animate: false });
      // Lift the target above the bottom sheet.
      map.current.panBy([0, 170], { animate: false });
    }
  }, [ready, routeTo, userCoords]);

  useEffect(() => {
    if (!ready || !focus) return;
    map.current.flyTo([focus.lat, focus.lng], 12, { duration: 0.6 });
  }, [ready, focus]);

  if (failed) {
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7A72' }}>
        Map could not be loaded. Check your connection.
      </div>
    );
  }
  // isolation keeps Leaflet's high z-index panes below the app's floating controls.
  return <div ref={container} style={{ position: 'absolute', inset: 0, isolation: 'isolate', zIndex: 0, background: dark ? '#1b2420' : '#E8EEEA' }} />;
}
