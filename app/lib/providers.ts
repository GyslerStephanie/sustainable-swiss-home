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
import { listings as seedListings, type Listing } from "./data";
import { typicalDemand, carrierOf, finalEnergy, EMISSION } from "./engine";

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
  price?: number;
  measuredEnergy?: number; // kWh/m²·yr if known
}): Listing {
  const baseEnergy = record.measuredEnergy ?? typicalDemand(record.year);
  const carrier = carrierOf(record.heating);
  const baseCO2 = +((finalEnergy(baseEnergy, record.area, carrier) * EMISSION[carrier]) / 1000).toFixed(1);
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
    baseCO2,
    heating: record.heating,
    blurb: "",
    pin: { x: 50, y: 50 }, // replaced by real lat/lng on the map layer
  };
}

/* ---------- active provider ----------
   Swap to a real provider here (or select via env) once implemented.
*/
export const activeProvider: ListingProvider = mockProvider;
