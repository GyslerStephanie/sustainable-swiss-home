/* ============================================================
   Sustainable Swiss Home — data provider seam
   ------------------------------------------------------------
   The UI and engine depend on this interface, NOT on any concrete
   data source. Today the app is served by `mockProvider` (the seed
   listings). To go live with real data, implement a provider below
   and switch `activeProvider` — no UI or engine changes needed.

   Roadmap of real providers (CH):
   - GWR/RegBL  → official building facts (year, area, heating,
     energy carrier) by EGID. Free. Fetch server-side on Vercel.
     https://www.housing-stat.ch / madd.bfs.admin.ch
   - Portal feed → for-sale listings (Homegate / ImmoScout24 /
     Newhome). No open API → requires a commercial partnership or a
     licensed aggregator. THIS is the one hard dependency for the
     buyer flow; everything else is buildable now.
   - Valuation   → PriceHubble / IAZI / RealAdvisor for price
     estimates where a listing price is absent.
   ============================================================ */
import { listings as seedListings, type Listing, type SolarPotential } from "./data";
import { typicalDemand } from "./engine";

export interface ListingQuery {
  zip?: string;
  district?: string;
  maxPrice?: number;
}

export interface ListingProvider {
  readonly id: string;
  /** human label shown in the UI / for diagnostics */
  readonly label: string;
  list(query?: ListingQuery): Promise<Listing[]>;
  get(id: string): Promise<Listing | null>;
}

/* ---------- 1. mock provider (current behaviour) ---------- */
export const mockProvider: ListingProvider = {
  id: "mock",
  label: "Seed data (Zürich demo)",
  async list(query) {
    let out = seedListings;
    if (query?.zip) out = out.filter((l) => l.zip === query.zip);
    if (query?.district) out = out.filter((l) => l.district === query.district);
    if (query?.maxPrice != null) out = out.filter((l) => l.price <= query.maxPrice!);
    return out;
  },
  async get(id) {
    return seedListings.find((l) => l.id === id) ?? null;
  },
};

/* ---------- 2. GWR enrichment (to implement) ----------
   Given a building's EGID, fetch official attributes and derive a
   baseEnergy/baseCO2 estimate when no measured value exists. The
   derivation already uses the real engine factors, so a partial
   GWR record yields engine-consistent numbers.
*/
export function buildingFromGwr(record: {
  egid: number;
  address: string;
  zip: string;
  district: string;
  year: number;
  area: number;
  heating: string; // GWR genh1 code mapped to a label upstream
  coords: { lat: number; lng: number }; // from GWR GKODE/GKODN (LV95 → WGS84)
  footprint?: [number, number][]; // building outline (WGS84 ring)
  solar?: SolarPotential; // sonnendach rooftop solar potential
  floors?: number; // above-ground floors (GWR GASTW)
  price?: number;
  measuredEnergy?: number; // kWh/m²·yr if known
}): Listing {
  const baseEnergy = record.measuredEnergy ?? typicalDemand(record.year);
  return {
    id: `egid-${record.egid}`,
    address: record.address,
    zip: record.zip,
    district: record.district,
    type: "—",
    year: record.year,
    area: record.area,
    price: record.price ?? 0,
    baseEnergy,
    heating: record.heating,
    blurb: "",
    coords: record.coords, // GWR supplies GKODE/GKODN → WGS84
    footprint: record.footprint,
    solar: record.solar,
    floors: record.floors,
  };
}

/* ---------- 3. feed provider (IDX / OpenImmo) ----------
   Pulls a real listings feed from LISTINGS_FEED_URL (an agency export or a
   CASAGATEWAY/aggregator endpoint) and maps it via the importer. Activate by
   setting LISTINGS_FEED_URL in the environment — no code change needed.
   (For push-style delivery, add an /api/import route that accepts the XML and
   stores it; this pull variant is the simplest to start with.)
*/
export const feedProvider: ListingProvider = {
  id: "feed",
  label: "Live IDX/OpenImmo feed",
  async list(query) {
    const url = process.env.LISTINGS_FEED_URL;
    if (!url) return [];
    const { parseOpenImmo } = await import("./importers/openimmo");
    const xml = await fetch(url, { cache: "no-store" }).then((r) => r.text());
    let out = parseOpenImmo(xml);
    if (query?.zip) out = out.filter((l) => l.zip.startsWith(query.zip!));
    if (query?.district) out = out.filter((l) => l.district === query.district);
    if (query?.maxPrice != null) out = out.filter((l) => l.price <= query.maxPrice!);
    return out;
  },
  async get(id) {
    return (await this.list()).find((l) => l.id === id) ?? null;
  },
};

/* ---------- active provider ----------
   Uses the live feed when LISTINGS_FEED_URL is configured, else the seed data.
*/
export const activeProvider: ListingProvider = process.env.LISTINGS_FEED_URL ? feedProvider : mockProvider;
