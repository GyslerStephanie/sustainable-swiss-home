/* ============================================================
   Shareable plan links — fully stateless, no backend.
   ------------------------------------------------------------
   The renovation plan is encoded into the URL itself (a base64url
   payload in the hash), so a link is self-contained: no database,
   no storage, no env vars to provision. Anyone with the link opens
   the exact dossier — across devices, with no account.

   Seed listings travel as just their id; a GWR-looked-up building
   travels as a compact copy (footprint dropped — it can be large and
   the dossier doesn't need it; the map simply won't outline a shared
   external building). If links ever get unwieldy, swap this for a
   KV-backed short id without touching the callers.
   ============================================================ */
import type { Listing, PlanState } from "./data";
import { listings as seedListings } from "./data";

interface SharePayload {
  v: 1;
  id?: string; // seed listing id
  ext?: Listing; // external (GWR) listing, footprint stripped
  sys: string[]; // plan.systems
  fin: Record<string, string>; // plan.finishes
}

// UTF-8-safe base64url (addresses contain ä/ö/ü) — works in the browser.
function b64urlEncode(s: string): string {
  const b = btoa(unescape(encodeURIComponent(s)));
  return b.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s: string): string {
  const b = s.replace(/-/g, "+").replace(/_/g, "/");
  return decodeURIComponent(escape(atob(b)));
}

/** Encode a listing + plan into a compact URL-safe token. */
export function encodeShare(listing: Listing, plan: PlanState): string {
  const isSeed = seedListings.some((l) => l.id === listing.id);
  const payload: SharePayload = isSeed
    ? { v: 1, id: listing.id, sys: plan.systems, fin: plan.finishes }
    : { v: 1, ext: { ...listing, footprint: undefined }, sys: plan.systems, fin: plan.finishes };
  return b64urlEncode(JSON.stringify(payload));
}

export interface DecodedShare {
  id?: string;
  ext?: Listing;
  plan: PlanState;
}

/** Decode a share token back into a listing reference + plan. Null if invalid. */
export function decodeShare(token: string): DecodedShare | null {
  try {
    const p = JSON.parse(b64urlDecode(token)) as SharePayload;
    if (!p || p.v !== 1 || (!p.id && !p.ext)) return null;
    return {
      id: p.id,
      ext: p.ext,
      plan: { systems: Array.isArray(p.sys) ? p.sys : [], finishes: p.fin || {} },
    };
  } catch {
    return null;
  }
}
