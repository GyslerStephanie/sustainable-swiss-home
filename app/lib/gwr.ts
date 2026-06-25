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
const SOLAR_LAYER = "ch.bfe.solarenergie-eignung-daecher"; // sonnendach.ch roof solar suitability
const TIMEOUT_MS = 8000;

export interface SolarRoof {
  kwhYr: number; // annual PV electricity potential (kWh/yr)
  areaM2: number; // suitable roof area (m²)
  klasse: number; // best suitability class on the roof (1..5)
}

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
  footprint?: [number, number][]; // building outline (WGS84 [lng,lat] ring)
  solar?: SolarRoof;
}

/* LV95 (EPSG:2056) → WGS84, swisstopo's published approximate formulas.
   Accurate to ~1 m — ample for drawing a building outline. E≈2.6e6, N≈1.2e6. */
function lv95ToWgs84(E: number, N: number): [number, number] {
  const y = (E - 2600000) / 1000000;
  const x = (N - 1200000) / 1000000;
  const lon =
    2.6779094 + 4.728982 * y + 0.791484 * y * x + 0.1306 * y * x * x - 0.0436 * y * y * y;
  const lat =
    16.9023892 +
    3.238272 * x -
    0.270978 * y * y -
    0.002528 * x * x -
    0.0447 * y * y * x -
    0.014 * x * x * x;
  return [(lon * 100) / 36, (lat * 100) / 36]; // [lng, lat] in degrees
}

/* esri identify polygon geometry ({rings:[[[E,N],…]]}, LV95) → outer ring in WGS84. */
function ringToWgs84(geometry: any): [number, number][] | undefined {
  const ring = geometry?.rings?.[0];
  if (!Array.isArray(ring) || ring.length < 3) return undefined;
  return ring.map((p: number[]) => lv95ToWgs84(p[0], p[1]));
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

/** Identify the GWR building at an LV95 point. Returns the feature
    (attributes + polygon geometry) or null. returnGeometry=true so we
    can draw the real building footprint on the map. */
export async function identifyBuilding(x: number, y: number): Promise<any | null> {
  const pad = 50;
  const url =
    `${GEO}/all/MapServer/identify?geometryType=esriGeometryPoint` +
    `&geometry=${x},${y}&sr=2056&tolerance=10&returnGeometry=true` +
    `&layers=all:${GWR_LAYER}` +
    `&mapExtent=${x - pad},${y - pad},${x + pad},${y + pad}&imageDisplay=100,100,96`;
  const data = await getJson(url);
  return data?.results?.[0] ?? null;
}

/** Sum a building's rooftop solar potential from swisstopo's sonnendach
    layer (all roof partial-surfaces sharing the EGID). Returns null if the
    building has no modelled roof surfaces. */
export async function fetchSolar(egid: number): Promise<SolarRoof | null> {
  if (!egid) return null;
  const url =
    `${GEO}/all/MapServer/find?layer=${SOLAR_LAYER}` +
    `&searchField=gwr_egid&searchText=${egid}&contains=false&returnGeometry=false`;
  let data: any;
  try {
    data = await getJson(url);
  } catch {
    return null; // solar is a non-fatal enrichment — never block the building lookup
  }
  const results: any[] = data?.results ?? [];
  if (!results.length) return null;
  let kwhYr = 0,
    areaM2 = 0,
    klasse = 0;
  for (const r of results) {
    const a = r.attributes ?? {};
    kwhYr += Number(a.stromertrag) || 0; // Stromertrag (kWh/yr)
    areaM2 += Number(a.flaeche) || 0; // Fläche (m²)
    klasse = Math.max(klasse, Number(a.klasse) || 0); // Eignungsklasse 1..5
  }
  if (kwhYr <= 0) return null;
  return { kwhYr: Math.round(kwhYr), areaM2: Math.round(areaM2), klasse };
}

/* WGS84 → LV95, swisstopo's published approximate formulas (inverse of
   lv95ToWgs84). Lets us identify the GWR building under a clicked map point. */
function wgs84ToLv95(lat: number, lng: number): { x: number; y: number } {
  const phi = (lat * 3600 - 169028.66) / 10000; // latitude, in 10⁴″ units
  const lam = (lng * 3600 - 26782.5) / 10000; // longitude
  const E =
    2600072.37 +
    211455.93 * lam -
    10938.51 * lam * phi -
    0.36 * lam * phi * phi -
    44.54 * lam * lam * lam;
  const N =
    1200147.07 +
    308807.95 * phi +
    3745.25 * lam * lam +
    76.63 * phi * phi -
    194.56 * lam * lam * phi +
    119.79 * phi * phi * phi;
  return { x: E, y: N };
}

/* Normalize an identify feature (+ a coordinate + a display label) into a
   building record. Shared by the address and map-click lookups. */
async function normalize(
  feat: any,
  coords: { lat: number; lng: number },
  label: string
): Promise<GwrBuilding | null> {
  const attrs = feat?.attributes;
  if (!attrs) return null;

  const genw1 = Number(attrs.genw1);
  const src = ENERGY_SOURCE[genw1];
  const floors = Number(attrs.gastw) || 1;
  const footprintArea = Number(attrs.garea) || 0;
  // GWR gives footprint (GAREA) + floors; estimate heated area ≈ footprint × floors × 0.8
  const area = footprintArea ? Math.round(footprintArea * floors * 0.8) : 0;

  const clean = (label || "").replace(/<[^>]*>/g, "").trim();
  const zipMatch = clean.match(/\b(\d{4})\b/);
  const zip = attrs.dplz4 ? String(attrs.dplz4) : zipMatch?.[1] ?? "";
  const district = attrs.ggdename ?? attrs.dplzname ?? "";
  const egid = Number(attrs.egid) || 0;
  const solar = await fetchSolar(egid); // non-fatal; null if unavailable

  return {
    egid,
    address: clean || `Gebäude EGID ${egid}`,
    zip,
    district,
    year: Number(attrs.gbauj) || 0,
    area,
    heating: src?.label ?? "Unbekannt",
    carrier: src?.carrier ?? "gas",
    coords,
    footprint: ringToWgs84(feat?.geometry),
    solar: solar ?? undefined,
  };
}

/** Geocode an address → identify + solar → normalized building record. */
export async function fetchBuildingByAddress(address: string): Promise<GwrBuilding | null> {
  const geo = await geocode(address);
  if (!geo) return null;
  const feat = await identifyBuilding(geo.x, geo.y);
  return normalize(feat, { lat: geo.lat, lng: geo.lng }, geo.label);
}

/** Identify the GWR building under a clicked map point (WGS84). */
export async function fetchBuildingByCoords(lat: number, lng: number): Promise<GwrBuilding | null> {
  const { x, y } = wgs84ToLv95(lat, lng);
  const feat = await identifyBuilding(x, y);
  if (!feat) return null;
  const label = feat.label || feat.attributes?.label || "";
  return normalize(feat, { lat, lng }, label);
}
