/* ============================================================
   Sustainable Swiss Home — data model + calculation engine
   Ported from the prototype (project/app/data.js) to typed TS.

   Carbon, energy-cost, GEAK class and financing are now derived
   from REAL, sourced Swiss factors in ./engine.ts (KBOB emission
   factors, SIA energy bands, HFM/Gebäudeprogramm subsidies). The
   `listings` array below is still seed data — real listings/GWR
   records arrive via the provider seam in ./providers.ts.
   ============================================================ */
import {
  EMISSION,
  PRICE,
  GEAK_BOUNDS,
  FINANCE,
  carrierOf,
  finalEnergy,
  subsidyForUpgrade,
} from "./engine";

// ---------- formatting helpers ----------
// Deterministic Swiss grouping with a fixed apostrophe (U+2019). Avoids
// toLocaleString, whose separator char varies between server/browser ICU
// versions and caused SSR/client hydration mismatches (React #418).
const groupCHF = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "’");
const fmtCHF = (n: number) => "CHF " + groupCHF(n);
const fmtCHFk = (n: number) => "CHF " + Math.round(n / 1000) + "k";
export const fmt = { CHF: fmtCHF, CHFk: fmtCHFk, group: groupCHF };

// ---------- types ----------
export type Grade = "A" | "B" | "C" | "D" | "E" | "F" | "G";
export type UpgradeGroup = "envelope" | "systems" | "energy";

export interface Listing {
  id: string;
  address: string;
  zip: string;
  district: string;
  type: string;
  year: number;
  area: number;
  price: number;
  baseEnergy: number; // kWh/m²·yr (measured if known, else estimated per construction era)
  heating: string;
  blurb: string;
  coords: { lat: number; lng: number }; // real WGS84 location for the map
}

export interface Upgrade {
  id: string;
  group: UpgradeGroup;
  name: string;
  short: string;
  desc: string;
  cost: { fixed: number; perM2: number };
  energy: number; // kWh/m²·yr reduced
  co2: number; // t/yr reduced
  subsidyRate: number;
  subsidyCap: number;
  value: { fixed: number; perM2: number };
  minergie: number;
  place: string;
  marker: string;
}

export interface Finish {
  id: string;
  name: string;
  note: string;
  swatch: string;
  perM2: number;
  embodied: number;
  eco: boolean;
}

export interface Subsidy {
  id: string;
  name: string;
  scope: string;
  covers: string[];
  agency: string; // who runs the programme
  url: string; // official application / information portal
  apply: string; // the critical timing rule (CH: most grants must be filed BEFORE works)
}

export interface Room {
  id: string;
  name: string;
  area: number;
  x: number;
  y: number;
  w: number;
  h: number;
  finish: boolean;
}

export interface PlanState {
  systems: string[];
  finishes: Record<string, string>;
}

// ---------- GEAK energy scale (kWh/m²·yr) ----------
// Calibrated so ~142 reads E and ~58 reads B.
const grades: Grade[] = ["A", "B", "C", "D", "E", "F", "G"];
const bounds: Record<Grade, number> = { ...GEAK_BOUNDS, G: Infinity };
export const geak = {
  grades,
  bounds,
  of(use: number): Grade {
    for (let i = 0; i < grades.length; i++) {
      if (use <= bounds[grades[i]]) return grades[i];
    }
    return "G";
  },
  index(grade: Grade): number {
    return grades.indexOf(grade);
  },
};

// ---------- Zürich seed listings ----------
// Curated seed set: real Zürich streets/districts with real WGS84 coordinates.
// Prices, areas and availability are indicative and must be confirmed against a
// licensed listings feed (see providers.ts) before going live.
export const listings: Listing[] = [
  {
    id: "seefeld",
    address: "Seefeldstrasse 142",
    zip: "8008",
    district: "Seefeld",
    type: "4.5-Zi. Wohnung",
    year: 1974,
    area: 112,
    price: 1485000,
    baseEnergy: 142,
    heating: "Öl",
    blurb: "Charming but tired — original oil heating, single-glazed.",
    coords: { lat: 47.354, lng: 8.553 },
  },
  {
    id: "wiedikon",
    address: "Birmensdorferstrasse 89",
    zip: "8003",
    district: "Wiedikon",
    type: "3.5-Zi. Wohnung",
    year: 1962,
    area: 84,
    price: 985000,
    baseEnergy: 158,
    heating: "Gas",
    blurb: "Compact city flat, gas boiler, great bones.",
    coords: { lat: 47.372, lng: 8.518 },
  },
  {
    id: "oerlikon",
    address: "Schaffhauserstrasse 318",
    zip: "8050",
    district: "Oerlikon",
    type: "5.5-Zi. Reihenhaus",
    year: 1988,
    area: 146,
    price: 1690000,
    baseEnergy: 121,
    heating: "Öl",
    blurb: "Family townhouse with roof + garden potential.",
    coords: { lat: 47.41, lng: 8.544 },
  },
  {
    id: "altstetten",
    address: "Badenerstrasse 567",
    zip: "8048",
    district: "Altstetten",
    type: "4.5-Zi. Wohnung",
    year: 1979,
    area: 104,
    price: 1145000,
    baseEnergy: 134,
    heating: "Öl",
    blurb: "South-facing, big balcony, dated interior.",
    coords: { lat: 47.388, lng: 8.488 },
  },
  {
    id: "enge",
    address: "Mythenquai 28",
    zip: "8002",
    district: "Enge",
    type: "3.5-Zi. Wohnung",
    year: 1969,
    area: 92,
    price: 1320000,
    baseEnergy: 148,
    heating: "Gas",
    blurb: "Lakeside location, premium upside on renovation.",
    coords: { lat: 47.362, lng: 8.536 },
  },
  {
    id: "hottingen",
    address: "Hofackerstrasse 40",
    zip: "8032",
    district: "Hottingen",
    type: "5.5-Zi. Einfamilienhaus",
    year: 1955,
    area: 165,
    price: 2150000,
    baseEnergy: 165,
    heating: "Öl",
    blurb: "Detached house, large plot — full envelope retrofit candidate.",
    coords: { lat: 47.366, lng: 8.567 },
  },
  {
    id: "escherwyss",
    address: "Hardturmstrasse 200",
    zip: "8005",
    district: "Escher Wyss",
    type: "3.5-Zi. Wohnung",
    year: 1998,
    area: 88,
    price: 1095000,
    baseEnergy: 95,
    heating: "Gas",
    blurb: "Converted industrial quarter, already moderate efficiency.",
    coords: { lat: 47.391, lng: 8.518 },
  },
  {
    id: "friesenberg",
    address: "Friesenbergstrasse 110",
    zip: "8055",
    district: "Friesenberg",
    type: "4.5-Zi. Wohnung",
    year: 1971,
    area: 108,
    price: 1075000,
    baseEnergy: 138,
    heating: "Öl",
    blurb: "Cooperative-style block on the Uetliberg slope, sunny aspect.",
    coords: { lat: 47.363, lng: 8.503 },
  },
];

// ---------- upgrade catalog (whole-home systems) ----------
export const upgrades: Upgrade[] = [
  {
    id: "heatpump",
    group: "systems",
    name: "Air-source heat pump",
    short: "Wärmepumpe",
    desc: "Replaces the oil/gas boiler. The single biggest carbon win.",
    cost: { fixed: 34000, perM2: 40 },
    energy: 22,
    co2: 2.6,
    subsidyRate: 0.3,
    subsidyCap: 14000,
    value: { fixed: 45000, perM2: 120 },
    minergie: 2,
    place: "tech",
    marker: "WP",
  },
  {
    id: "windows",
    group: "envelope",
    name: "Triple-glazed windows",
    short: "Fenster 3-fach",
    desc: "Cuts heat loss and kills draughts throughout.",
    cost: { fixed: 6000, perM2: 320 },
    energy: 15,
    co2: 0.5,
    subsidyRate: 0.15,
    subsidyCap: 9000,
    value: { fixed: 12000, perM2: 180 },
    minergie: 1,
    place: "windows",
    marker: "",
  },
  {
    id: "facade",
    group: "envelope",
    name: "Façade insulation",
    short: "Fassadendämmung",
    desc: "The biggest envelope improvement — wraps the whole shell.",
    cost: { fixed: 18000, perM2: 420 },
    energy: 25,
    co2: 0.6,
    subsidyRate: 0.25,
    subsidyCap: 22000,
    value: { fixed: 20000, perM2: 220 },
    minergie: 2,
    place: "facade",
    marker: "",
  },
  {
    id: "roof",
    group: "envelope",
    name: "Roof / attic insulation",
    short: "Dachdämmung",
    desc: "Stops the heat escaping upward — fast payback.",
    cost: { fixed: 9000, perM2: 120 },
    energy: 11,
    co2: 0.4,
    subsidyRate: 0.25,
    subsidyCap: 8000,
    value: { fixed: 8000, perM2: 90 },
    minergie: 1,
    place: "roof",
    marker: "",
  },
  {
    id: "pv",
    group: "energy",
    name: "Rooftop solar PV",
    short: "Solar PV",
    desc: "On-site generation; can push toward net-zero with a battery.",
    cost: { fixed: 17000, perM2: 60 },
    energy: 8,
    co2: 1.4,
    subsidyRate: 0.2,
    subsidyCap: 9000,
    value: { fixed: 22000, perM2: 60 },
    minergie: 2,
    place: "roof",
    marker: "PV",
  },
  {
    id: "mvhr",
    group: "systems",
    name: "MVHR ventilation",
    short: "Komfortlüftung",
    desc: "Fresh, filtered air with heat recovery — a Minergie staple.",
    cost: { fixed: 12000, perM2: 80 },
    energy: 8,
    co2: 0.3,
    subsidyRate: 0.1,
    subsidyCap: 4000,
    value: { fixed: 9000, perM2: 70 },
    minergie: 2,
    place: "tech",
    marker: "LÜ",
  },
];

// ---------- interior finishes (per room flooring) ----------
export const finishes: Finish[] = [
  { id: "keep", name: "Bestehend", note: "Existing floor, kept", swatch: "#cdd0cf", perM2: 0, embodied: 0, eco: false },
  { id: "oak", name: "Eiche-Parkett", note: "Engineered oak — warm, durable", swatch: "#c79a63", perM2: 185, embodied: 0.02, eco: false },
  { id: "cork", name: "Kork", note: "Soft, warm, low embodied carbon", swatch: "#b07a4e", perM2: 125, embodied: -0.03, eco: true },
  { id: "clay", name: "Lehmplatten", note: "Clay tiles — natural, breathable", swatch: "#bb6b50", perM2: 215, embodied: -0.01, eco: true },
  { id: "micro", name: "Mikrozement", note: "Seamless mineral surface", swatch: "#9aa39b", perM2: 240, embodied: 0.04, eco: false },
];
export const finishById = (id: string): Finish => finishes.find((f) => f.id === id) || finishes[0];

// ---------- subsidy programmes (for labelling in the dossier) ----------
// Official Swiss programmes. URLs are canonical entry points; rates/eligibility
// change yearly and by canton — confirm on the portal before filing.
export const subsidies: Subsidy[] = [
  {
    id: "gebaeude",
    name: "Das Gebäudeprogramm",
    scope: "Federal + cantonal",
    covers: ["facade", "roof", "windows"],
    agency: "Bund & Kantone",
    url: "https://www.dasgebaeudeprogramm.ch",
    apply: "File BEFORE works begin",
  },
  {
    id: "kanton",
    name: "Kanton ZH — Heizungsersatz",
    scope: "Cantonal (ZH)",
    covers: ["heatpump"],
    agency: "Baudirektion Kanton Zürich",
    url: "https://www.zh.ch/de/umwelt-tiere/energie/foerderung-energie.html",
    apply: "File BEFORE replacing the boiler",
  },
  {
    id: "pronovo",
    name: "Pronovo — Einmalvergütung (PV)",
    scope: "Federal",
    covers: ["pv"],
    agency: "Pronovo AG (on behalf of the Confederation)",
    url: "https://pronovo.ch/de/foerderung/einmalverguetung/",
    apply: "Register AFTER the system is commissioned",
  },
  {
    id: "comfort",
    name: "Komfortlüftung (within a comprehensive reno)",
    scope: "Cantonal (ZH)",
    covers: ["mvhr"],
    agency: "Baudirektion Kanton Zürich",
    url: "https://www.zh.ch/de/umwelt-tiere/energie/foerderung-energie.html",
    apply: "File BEFORE works begin",
  },
];

// Real, actionable directories — finding certified pros and filing applications.
// These are official / authoritative entry points, not paid partner placements.
export interface Resource {
  label: string;
  sub: string;
  href: string;
}
export const DIRECTORY: { key: string; ic: string; color: string; title: string; desc: string; links: Resource[] }[] = [
  {
    key: "subsidies",
    ic: "$",
    color: "green",
    title: "Find every subsidy",
    desc: "Programmes are postcode-specific. These official tools list what your building qualifies for.",
    links: [
      { label: "energiefranken.ch", sub: "Enter your PLZ — every grant, one place", href: "https://www.energiefranken.ch" },
      { label: "Das Gebäudeprogramm", sub: "Envelope & insulation — file before works", href: "https://www.dasgebaeudeprogramm.ch" },
    ],
  },
  {
    key: "advisor",
    ic: "E",
    color: "acc",
    title: "Energy advisor (GEAK)",
    desc: "A certified expert runs the formal audit that unlocks the advisory grant and the roadmap.",
    links: [
      { label: "GEAK expert finder", sub: "Certified GEAK Plus advisors", href: "https://www.geak.ch" },
      { label: "EnergieSchweiz", sub: "Federal advice & tools", href: "https://www.energieschweiz.ch" },
    ],
  },
  {
    key: "pros",
    ic: "A",
    color: "coral",
    title: "Architects & builders",
    desc: "Minergie-experienced practices and certified installers for envelope, heat-pump and PV work.",
    links: [
      { label: "Minergie partners", sub: "Find certified architects & trades", href: "https://www.minergie.ch" },
      { label: "Das Gebäudeprogramm", sub: "Eligible-measure requirements", href: "https://www.dasgebaeudeprogramm.ch" },
    ],
  },
  {
    key: "solar",
    ic: "PV",
    color: "purple",
    title: "Solar PV registration",
    desc: "Register your installation for the federal one-time remuneration after commissioning.",
    links: [
      { label: "Pronovo — Einmalvergütung", sub: "Apply for the PV grant (EIV)", href: "https://pronovo.ch/de/foerderung/einmalverguetung/" },
      { label: "Sonnendach.ch", sub: "Your roof's solar potential", href: "https://www.sonnendach.ch" },
    ],
  },
];

// ---------- floor plan geometry (viewBox 0 0 600 470) ----------
export const rooms: Room[] = [
  { id: "living", name: "Wohn-/Essraum", area: 38, x: 16, y: 16, w: 330, h: 250, finish: true },
  { id: "kitchen", name: "Küche", area: 14, x: 346, y: 16, w: 238, h: 120, finish: true },
  { id: "bath", name: "Bad", area: 8, x: 346, y: 146, w: 118, h: 120, finish: true },
  { id: "tech", name: "Technik", area: 6, x: 464, y: 146, w: 120, h: 120, finish: false },
  { id: "hall", name: "Korridor", area: 11, x: 16, y: 266, w: 568, h: 56, finish: true },
  { id: "bed1", name: "Schlafen", area: 18, x: 16, y: 322, w: 278, h: 132, finish: true },
  { id: "bed2", name: "Zimmer", area: 15, x: 294, y: 322, w: 290, h: 132, finish: true },
];

// ---------- computed plan result ----------
export interface CostLine {
  id: string;
  name: string;
  cost: number;
  subsidy: number;
  group: UpgradeGroup;
}
export interface SubsidyLine {
  name: string;
  scope: string;
  amount: number;
  upgrade: string;
  url: string; // official application portal
  apply: string; // timing rule
}
export interface FinishLine {
  room: string;
  finish: string;
  cost: number;
}
export interface ComputedPlan {
  area: number;
  baseGrade: Grade;
  newGrade: Grade;
  gradeJump: number;
  baseEnergy: number;
  energyUse: number;
  energyReduction: number;
  baseCO2: number;
  co2: number;
  co2Reduction: number;
  systemsCost: number;
  finishCost: number;
  renoCost: number;
  subsidyTotal: number;
  subsidyLines: SubsidyLine[];
  costLines: CostLine[];
  finishLines: FinishLine[];
  valueUplift: number;
  financed: number;
  monthlyFinance: number;
  monthlyEnergySaving: number;
  netMonthly: number;
  minergie: string | null;
  minergiePts: number;
  kwhSaved: number;
  hasUpgrades: boolean;
}

// ---------- the calculation engine ----------
export function computePlan(listing: Listing, state: PlanState): ComputedPlan {
  const area = listing.area;
  const active = upgrades.filter((u) => state.systems.includes(u.id));

  // costs
  let systemsCost = 0,
    subsidyTotal = 0,
    valueUplift = 0;
  let energyReduction = 0,
    co2Reduction = 0,
    minergiePts = 0;
  const subsidyLines: SubsidyLine[] = [];
  const costLines: CostLine[] = [];

  active.forEach((u) => {
    const c = u.cost.fixed + u.cost.perM2 * area;
    systemsCost += c;
    // real per-basis subsidy (CHF/m², per kW, per kWp) capped at the measure cost;
    // fall back to the catalog rate for any measure not yet modelled.
    const real = subsidyForUpgrade(u.id, area);
    const sub = real != null ? Math.min(real, c) : Math.min(c * u.subsidyRate, u.subsidyCap);
    subsidyTotal += sub;
    valueUplift += u.value.fixed + u.value.perM2 * area;
    energyReduction += u.energy;
    co2Reduction += u.co2;
    minergiePts += u.minergie;
    costLines.push({ id: u.id, name: u.name, cost: c, subsidy: sub, group: u.group });
    if (sub > 0) {
      const prog = subsidies.find((s) => s.covers.includes(u.id));
      subsidyLines.push({
        name: prog ? prog.name : "Förderung",
        scope: prog ? prog.scope : "",
        amount: sub,
        upgrade: u.name,
        url: prog ? prog.url : "",
        apply: prog ? prog.apply : "",
      });
    }
  });

  // finishes
  let finishCost = 0,
    finishEmbodied = 0;
  const finishLines: FinishLine[] = [];
  rooms.forEach((r) => {
    if (!r.finish) return;
    const fid = state.finishes[r.id] || "keep";
    const f = finishById(fid);
    if (fid !== "keep") {
      const c = f.perM2 * r.area;
      finishCost += c;
      finishEmbodied += f.embodied;
      finishLines.push({ room: r.name, finish: f.name, cost: c });
    }
  });
  void finishEmbodied; // computed for parity with prototype; not surfaced in UI

  // energy demand + rating (useful space-heat demand, kWh/m²·yr)
  const energyUse = Math.max(15, Math.round(listing.baseEnergy - energyReduction));
  const baseGrade = geak.of(listing.baseEnergy);
  const newGrade = geak.of(energyUse);
  const gradeJump = geak.index(baseGrade) - geak.index(newGrade);

  // carbon — derived from carrier × final energy (KBOB factors), not flat sums.
  // A heat pump switches the carrier to electricity (with SPF leverage).
  const carrierBefore = carrierOf(listing.heating);
  const switchesToHP = state.systems.includes("heatpump");
  const carrierAfter = switchesToHP ? "electricity" : carrierBefore;
  const finalBefore = finalEnergy(listing.baseEnergy, area, carrierBefore);
  let finalAfter = finalEnergy(energyUse, area, carrierAfter);
  // rooftop PV offsets grid electricity (≈ its modelled energy contribution × area)
  const pvKwh = state.systems.includes("pv")
    ? (upgrades.find((u) => u.id === "pv")?.energy ?? 0) * area
    : 0;
  if (carrierAfter === "electricity") finalAfter = Math.max(0, finalAfter - pvKwh);
  const baseCO2 = +((finalBefore * EMISSION[carrierBefore]) / 1000).toFixed(1); // t/yr
  const co2 = Math.max(0, +((finalAfter * EMISSION[carrierAfter]) / 1000 - (carrierAfter !== "electricity" ? (pvKwh * EMISSION.electricity) / 1000 : 0)).toFixed(1));
  void co2Reduction; // superseded by carrier-aware carbon model above

  // minergie status
  let minergie: string | null = null;
  const hasMVHR = state.systems.includes("mvhr");
  const hasPV = state.systems.includes("pv");
  if (energyUse <= 35 && hasPV && hasMVHR) minergie = "Minergie-A";
  else if (energyUse <= 38 && hasMVHR) minergie = "Minergie-P";
  else if (energyUse <= 60 && hasMVHR) minergie = "Minergie";
  else if (minergiePts >= 4) minergie = "Minergie (in Reichweite)";

  // money
  const renoCost = systemsCost + finishCost;
  const financed = Math.max(0, renoCost - subsidyTotal);
  // interest carry on the financed (post-subsidy) reno, folded into the mortgage
  const monthlyFinance = (financed * FINANCE.mortgageRate) / 12;
  // energy-cost saving: real CHF/kWh per carrier, before − after
  const costBefore = finalBefore * PRICE[carrierBefore];
  const costAfter = finalAfter * PRICE[carrierAfter];
  const monthlyEnergySaving = Math.max(0, (costBefore - costAfter) / 12);
  const kwhSaved = Math.round(finalBefore - finalAfter);
  const netMonthly = Math.round(monthlyFinance - monthlyEnergySaving);

  return {
    area,
    baseGrade,
    newGrade,
    gradeJump,
    baseEnergy: listing.baseEnergy,
    energyUse,
    energyReduction,
    baseCO2,
    co2,
    co2Reduction: +(baseCO2 - co2).toFixed(1),
    systemsCost,
    finishCost,
    renoCost,
    subsidyTotal,
    subsidyLines,
    costLines,
    finishLines,
    valueUplift,
    financed,
    monthlyFinance: Math.round(monthlyFinance),
    monthlyEnergySaving: Math.round(monthlyEnergySaving),
    netMonthly,
    minergie,
    minergiePts,
    kwhSaved: Math.round(kwhSaved),
    hasUpgrades: active.length > 0 || finishLines.length > 0,
  };
}
