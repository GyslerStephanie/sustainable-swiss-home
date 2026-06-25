/* GET /api/building?address=Seefeldstrasse 142 8008 Zürich
   GET /api/building?lat=47.36&lng=8.55   (map-click: identify any building)
   Returns official GWR building facts mapped into our Listing shape.
   Server-side only — reaches the GeoAdmin API (egress available on Vercel). */
import { NextResponse } from "next/server";
import { fetchBuildingByAddress, fetchBuildingByCoords } from "@/app/lib/gwr";
import { buildingFromGwr } from "@/app/lib/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // always live; never cache a building lookup

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const address = params.get("address")?.trim();
  const lat = params.get("lat");
  const lng = params.get("lng");
  if (!address && !(lat && lng)) {
    return NextResponse.json({ error: "Provide ?address or ?lat&lng" }, { status: 400 });
  }
  try {
    const b =
      lat && lng
        ? await fetchBuildingByCoords(Number(lat), Number(lng))
        : await fetchBuildingByAddress(address!);
    if (!b) {
      return NextResponse.json({ error: "No building found there" }, { status: 404 });
    }
    // engine-consistent Listing (baseEnergy estimated from year when unmeasured)
    const listing = buildingFromGwr({
      egid: b.egid,
      address: b.address,
      zip: b.zip,
      district: b.district,
      year: b.year,
      area: b.area,
      heating: b.heating,
      coords: b.coords,
      footprint: b.footprint,
      solar: b.solar,
    });
    return NextResponse.json({ source: "gwr", egid: b.egid, listing });
  } catch (e) {
    return NextResponse.json(
      { error: "GWR lookup failed", detail: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    );
  }
}
