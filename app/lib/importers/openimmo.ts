/* ============================================================
   OpenImmo importer — maps an OpenImmo XML feed into our Listing shape.
   ------------------------------------------------------------
   OpenImmo is the common DACH listing-exchange XML (IDX is the Swiss SVIT
   sibling — add an idx.ts alongside this once a real IDX sample is in hand;
   IDX 3 is a positional CSV-like layout that varies per exporter).

   This is a best-effort mapping against the standard OpenImmo element names.
   Real agency exports vary — adjust the field paths once a sample arrives.
   Pure + dependency-light so it unit-tests offline.
   ============================================================ */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { XMLParser } from "fast-xml-parser";
import type { Listing } from "../data";
import { typicalDemand, carrierOf } from "../engine";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

const asArray = <T>(x: T | T[] | undefined): T[] => (x == null ? [] : Array.isArray(x) ? x : [x]);
const num = (v: any): number => {
  const n = Number(typeof v === "object" && v != null ? v["#text"] ?? v : v);
  return Number.isFinite(n) ? n : 0;
};
const str = (v: any): string => (v == null ? "" : String(typeof v === "object" ? v["#text"] ?? "" : v)).trim();

/** True for objektart marked as a flat/apartment (vs. house). */
function describeType(objektart: any, zimmer: number): string {
  const z = zimmer ? `${zimmer}-Zi. ` : "";
  if (objektart?.wohnung) return `${z}Wohnung`;
  if (objektart?.haus) return `${z}Haus`;
  return z ? `${z}Objekt` : "Objekt";
}

/** Parse an OpenImmo XML string into Listings. Skips non-sale objects. */
export function parseOpenImmo(xml: string): Listing[] {
  let doc: any;
  try {
    doc = parser.parse(xml);
  } catch {
    return [];
  }
  const anbieter = asArray(doc?.openimmo?.anbieter);
  const out: Listing[] = [];

  for (const a of anbieter) {
    for (const im of asArray<any>(a?.immobilie)) {
      // only for-sale (KAUF); skip rentals
      const vk = im?.objektkategorie?.vermarktungsart;
      const isSale = vk?.["@_KAUF"] === "true" || vk?.["@_KAUF"] === true || vk?.KAUF === "true";
      if (vk && !isSale) continue;

      const geo = im?.geo ?? {};
      const preise = im?.preise ?? {};
      const flaechen = im?.flaechen ?? {};
      const zustand = im?.zustand_angaben ?? {};
      const freitexte = im?.freitexte ?? {};
      const verw = im?.verwaltung_techn ?? {};

      const zimmer = num(flaechen?.anzahl_zimmer);
      const area = Math.round(num(flaechen?.wohnflaeche) || num(flaechen?.nutzflaeche));
      const year = num(zustand?.baujahr);
      const price = Math.round(num(preise?.kaufpreis));

      const street = str(geo?.strasse);
      const houseNo = str(geo?.hausnummer);
      const address = [street, houseNo].filter(Boolean).join(" ") || "Objekt";
      const zip = str(geo?.plz);
      const district = str(geo?.regionaler_zusatz) || str(geo?.ort);

      // coords: OpenImmo <geokoordinaten breitengrad= laengengrad=>
      const gk = geo?.geokoordinaten ?? {};
      const lat = num(gk?.["@_breitengrad"]);
      const lng = num(gk?.["@_laengengrad"]);

      // energy: prefer a measured value from the energy pass, else estimate by era
      const epass = zustand?.energiepass ?? {};
      const measured = num(epass?.endenergiebedarf) || num(epass?.energieverbrauchkennwert);
      const baseEnergy = measured > 0 ? Math.round(measured) : typicalDemand(year || 1970);
      const heating = str(epass?.energietraeger) || str(zustand?.heizungsart) || "Unbekannt";

      const id = str(verw?.objektnr_extern) || `feed-${out.length + 1}`;

      // photos (first image) — for the card later; not on the Listing type yet
      const firstImg = str(asArray<any>(im?.anhaenge?.anhang)[0]?.daten?.pfad);
      void firstImg; // available for a future image field

      out.push({
        id: `feed-${id}`,
        address,
        zip,
        district,
        type: describeType(im?.objektkategorie?.objektart, zimmer),
        year: year || 0,
        area: area || 0,
        price: price || 0,
        baseEnergy,
        heating,
        blurb: str(freitexte?.objekttitel) || str(freitexte?.dreizeiler) || "",
        coords: { lat: lat || 47.376, lng: lng || 8.541 }, // fall back to Zürich centre
      });
      // carrierOf is engine-validated; referenced so heating labels stay engine-mappable
      void carrierOf(heating);
    }
  }
  return out;
}
