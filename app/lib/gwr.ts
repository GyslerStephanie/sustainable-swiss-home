/* ============================================================
   Sustainable Swiss Home — GWR (RegBL) client
   ------------------------------------------------------------
   Pulls OFFICIAL Swiss building facts from the federal Register of
   Buildings and Dwellings (Gebäude- und Wohnungsregister) via the
   free, no-key GeoAdmin API (api3.geo.admin.ch):

     1. SearchServer  → geocode an address (WGS84 + LV95 + label)
     2. MapServer/identify on layer ch.bfs.gebaeude_wohnungs_register
        → building attributes (EGID, Baujahr, Energieträger, …)

   Runs SERVER-SIDE only (see app/api/building/route.ts) — Vercel has
   the egress these endpoints need.

   VERIFY: the GENW1 energy-source code map below must be confirmed
   against the official GWR Merkmalskatalog (codes can be extended).
   ============================================================ */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Carrier } from "./engine";

const GEO = "https://api3.geo.admin.ch/rest/services";
const GWR_LAYER = "ch.bfs.gebaeude_wohnungs_register";
const TIMEOUT_MS = 8000;

export interface GwrBuilding {
  egid: number;
  address: string;
  zip: string;
  district: string;
  year: number; // GBAUJ (Baujahr); 0 if unknown
  area: number; // estimated heated floor area (m²)
  heating: string; // German label, e.g. "Öl", "Gas", "Wärmepumpe"
  carrier: Carrier;
  coords: { lat: number; lng: number };
}

/* GWR GENW1 — Energie-/Wärmequelle der Heizung → (label, engine carrier).
   VERIFY against the current GWR Merkmalskatalog. Heat-pump sources
   (air/ground/water) map to the electricity carrier with HP leverage. */
const ENERGY_SOURCE: Record<number, { label: string; carrier: Carrier }> = {
  7501: { label: "Wärmepumpe (Luft)", carrier: "electricity" },
  7510: { label: "Wärmepumpe (Erdwärme)", carrier: "electricity" },
  7511: { label: "Wärmepumpe (Wasser)", carrier: "electricity" },
  7512: { label: "Gas", carrier: "gas" },
  7513: { label: "Öl", carrier: "oil" },
  7520: { label: "Holz", carrier: "pellets" },
  7530: { label: "Fernwärme", carrier: "districtHeat" },
  7540: { label: "Elektrisch", carrier: "electricity" },
};

async function getJson(url: string): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`GeoAdmin ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

/** Geocode an address → WGS84 + LV95 coords. Returns null if not found. */
export async function geocode(
  address: string
): Promise<{ lat: number; lng: number; x: number; y: number; label: string } | null> {
  const url =
    `${GEO}/api/SearchServer?type=locations&origins=address&limit=1&sr=2056` +
    `&searchText=${encodeURIComponent(address)}`;
  const data = await getJson(url);
  const hit = data?.results?.[0]?.attrs;
  if (!hit) return null;
  return { lat: hit.lat, lng: hit.lon, x: hit.x, y: hit.y, label: hit.label };
}

/** Identify the GWR building at an LV95 point. Returns raw attributes or null. */
export async function identifyBuilding(x: number, y: number): Promise<any | null> {
  const pad = 50;
  const url =
    `${GEO}/all/MapServer/identify?geometryType=esriGeometryPoint` +
    `&geometry=${x},${y}&sr=2056&tolerance=10&returnGeometry=false` +
    `&layers=all:${GWR_LAYER}` +
    `&mapExtent=${x - pad},${y - pad},${x + pad},${y + pad}&imageDisplay=100,100,96`;
  const data = await getJson(url);
  return data?.results?.[0]?.attributes ?? null;
}

/** Combine geocode + identify into a normalized building record. */
export async function fetchBuildingByAddress(address: string): Promise<GwrBuilding | null> {
  const geo = await geocode(address);
  if (!geo) return null;
  const attrs = await identifyBuilding(geo.x, geo.y);
  if (!attrs) return null;

  const genw1 = Number(attrs.genw1);
  const src = ENERGY_SOURCE[genw1];
  const floors = Number(attrs.gastw) || 1;
  const footprint = Number(attrs.garea) || 0;
  // GWR gives footprint (GAREA) + floors; estimate heated area ≈ footprint × floors × 0.8
  const area = footprint ? Math.round(footprint * floors * 0.8) : 0;

  // strip a trailing "<zip> <town>" off the geocoder label to recover town/zip
  const zipMatch = geo.label.match(/\b(\d{4})\b/);
  const zip = attrs.dplz4 ? String(attrs.dplz4) : zipMatch?.[1] ?? "";
  const district = attrs.ggdename ?? attrs.dplzname ?? "";

  return {
    egid: Number(attrs.egid) || 0,
    address: geo.label.replace(/<[^>]*>/g, ""), // geocoder may return <b>…</b>
    zip,
    district,
    year: Number(attrs.gbauj) || 0,
    area,
    heating: src?.label ?? "Unbekannt",
    carrier: src?.carrier ?? "gas",
    coords: { lat: geo.lat, lng: geo.lng },
  };
}
