/* GET /api/listings?zip=80&maxPrice=2000000
   Returns listings from the active provider — seed data today, or a live
   IDX/OpenImmo feed once LISTINGS_FEED_URL is configured. The Discover UI can
   switch to fetching this endpoint when a real feed is in place. */
import { NextResponse } from "next/server";
import { activeProvider } from "@/app/lib/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const zip = p.get("zip") ?? undefined;
  const district = p.get("district") ?? undefined;
  const maxPrice = p.get("maxPrice") ? Number(p.get("maxPrice")) : undefined;
  try {
    const listings = await activeProvider.list({ zip, district, maxPrice });
    return NextResponse.json({ source: activeProvider.id, count: listings.length, listings });
  } catch (e) {
    return NextResponse.json(
      { error: "Listings unavailable", detail: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    );
  }
}
