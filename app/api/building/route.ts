/* GET /api/building?address=Seefeldstrasse 142 8008 Zürich
   Returns official GWR building facts mapped into our Listing shape.
   Server-side only — reaches the GeoAdmin API (egress available on Vercel). */
import { NextResponse } from "next/server";
import { fetchBuildingByAddress } from "@/app/lib/gwr";
import { buildingFromGwr } from "@/app/lib/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // always live; never cache a building lookup

export async function GET(req: Request) {
  const address = new URL(req.url).searchParams.get("address")?.trim();
  if (!address) {
    return NextResponse.json({ error: "Missing ?address" }, { status: 400 });
  }
  try {
    const b = await fetchBuildingByAddress(address);
    if (!b) {
      return NextResponse.json({ error: "No building found for that address" }, { status: 404 });
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
