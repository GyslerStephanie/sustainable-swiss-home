"use client";
/* MapView — real Zürich basemap (swisstopo WMTS, no API key) with price pins.
   MapLibre is loaded client-side only. The GL container (.map-gl) is a React
   *leaf* — React never renders children into it, so maplibre can own its DOM
   without fighting React (and SSR/client markup stays identical). */
import React from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Listing } from "@/app/lib/data";
import { fmt } from "@/app/lib/data";

interface MapViewProps {
  listings: Listing[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** click anywhere on the map → (lng, lat); enables "pick any building" mode */
  onPick?: (lng: number, lat: number) => void;
}

// Basemap: a reliable global fallback (Carto light) UNDER the official Swiss
// map (swisstopo grey). swisstopo is opaque and covers Carto when it loads;
// if its tiles ever fail, Carto still shows — so the map is never blank.
const BASE_STYLE = {
  version: 8 as const,
  sources: {
    carto: {
      type: "raster" as const,
      tiles: [
        "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap · © CARTO",
    },
    swisstopo: {
      type: "raster" as const,
      tiles: [
        "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-grau/default/current/3857/{z}/{x}/{y}.jpeg",
      ],
      tileSize: 256,
      attribution: "© swisstopo",
    },
  },
  layers: [
    { id: "carto", type: "raster" as const, source: "carto" },
    { id: "swisstopo", type: "raster" as const, source: "swisstopo" },
  ],
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export function MapView({ listings, selectedId, onSelect, onPick }: MapViewProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<any>(null);
  const libRef = React.useRef<any>(null);
  const markersRef = React.useRef<Record<string, { marker: any; el: HTMLDivElement }>>({});
  const [ready, setReady] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const onSelectRef = React.useRef(onSelect);
  onSelectRef.current = onSelect;
  const onPickRef = React.useRef(onPick);
  onPickRef.current = onPick;

  // 1. init map once (client-side only)
  React.useEffect(() => {
    let cancelled = false;
    let map: any;
    (async () => {
      try {
        const maplibregl = (await import("maplibre-gl")).default;
        if (cancelled || !containerRef.current) return;
        libRef.current = maplibregl;
        map = new maplibregl.Map({
          container: containerRef.current,
          style: BASE_STYLE as any,
          center: [8.541, 47.376], // Zürich
          zoom: 11.5,
          attributionControl: { compact: true },
        });
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
        map.on("error", () => {}); // swallow tile errors; keep the app alive
        // click-to-pick: identify whatever building was clicked (Discover only)
        map.on("click", (e: any) => {
          if (onPickRef.current) onPickRef.current(e.lngLat.lng, e.lngLat.lat);
        });
        if (onPickRef.current) map.getCanvas().style.cursor = "crosshair";
        mapRef.current = map;
        // Markers are DOM overlays projected from lng/lat — they don't need tiles
        // to be loaded, so flag ready as soon as the map style is parsed. Using
        // the style.load event (fires even when tiles fail) keeps pins reliable.
        if (map.isStyleLoaded()) {
          if (!cancelled) setReady(true);
        } else {
          map.once("styledata", () => {
            if (!cancelled) setReady(true);
          });
        }
      } catch {
        if (!cancelled) setFailed(true); // WebGL unavailable — degrade gracefully
      }
    })();
    return () => {
      cancelled = true;
      Object.values(markersRef.current).forEach(({ marker }) => marker.remove());
      markersRef.current = {};
      if (map) map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, []);

  // 2. sync markers whenever the listing set changes
  React.useEffect(() => {
    const map = mapRef.current;
    const maplibregl = libRef.current;
    if (!ready || !map || !maplibregl) return;

    Object.values(markersRef.current).forEach(({ marker }) => marker.remove());
    markersRef.current = {};

    for (const l of listings) {
      const el = document.createElement("div");
      el.className = "pin" + (l.id === selectedId ? " sel" : "");
      el.innerHTML = `<div class="dot"></div><div class="price">${fmt.CHFk(l.price)}</div>`;
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectRef.current(l.id);
      });
      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([l.coords.lng, l.coords.lat])
        .addTo(map);
      markersRef.current[l.id] = { marker, el };
    }

    // real building footprints (GWR/cadastre) — fill + outline overlay
    const fc = {
      type: "FeatureCollection",
      features: listings
        .filter((l) => l.footprint && l.footprint.length >= 3)
        .map((l) => ({
          type: "Feature" as const,
          properties: { id: l.id },
          geometry: { type: "Polygon" as const, coordinates: [l.footprint] },
        })),
    };
    const src = map.getSource("footprints");
    if (src) {
      src.setData(fc);
    } else {
      map.addSource("footprints", { type: "geojson", data: fc });
      map.addLayer({
        id: "fp-fill",
        type: "fill",
        source: "footprints",
        paint: { "fill-color": "#2f7d5b", "fill-opacity": 0.22 },
      });
      map.addLayer({
        id: "fp-line",
        type: "line",
        source: "footprints",
        paint: { "line-color": "#2f7d5b", "line-width": 2 },
      });
    }

    if (listings.length > 0) {
      const lons = listings.map((l) => l.coords.lng);
      const lats = listings.map((l) => l.coords.lat);
      map.fitBounds(
        [
          [Math.min(...lons), Math.min(...lats)],
          [Math.max(...lons), Math.max(...lats)],
        ],
        { padding: 70, maxZoom: 14, duration: 300 }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, listings]);

  // 3. reflect selection (highlight + ease to the pin)
  React.useEffect(() => {
    for (const [id, { el }] of Object.entries(markersRef.current)) {
      el.classList.toggle("sel", id === selectedId);
    }
    const sel = listings.find((l) => l.id === selectedId);
    if (sel && mapRef.current) {
      if (sel.footprint && sel.footprint.length >= 3) {
        // zoom tight to the real building outline
        const lons = sel.footprint.map((p) => p[0]);
        const lats = sel.footprint.map((p) => p[1]);
        mapRef.current.fitBounds(
          [
            [Math.min(...lons), Math.min(...lats)],
            [Math.max(...lons), Math.max(...lats)],
          ],
          { padding: 120, maxZoom: 19, duration: 600 }
        );
      } else {
        mapRef.current.easeTo({ center: [sel.coords.lng, sel.coords.lat], duration: 500 });
      }
    }
  }, [selectedId, listings]);

  return (
    <div className="map-pane">
      {/* childless leaf owned by maplibre */}
      <div ref={containerRef} className="map-gl" aria-label="Map of Zürich listings" />
      {failed && (
        <div className="map-fallback">
          Map unavailable in this browser — use the property list on the right.
        </div>
      )}
    </div>
  );
}
