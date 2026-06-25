/* ============================================================
   Sustainable Swiss Home — physical calculation factors
   ------------------------------------------------------------
   REAL, SOURCED Swiss reference values replacing the prototype's
   indicative constants. Every constant cites a source and is
   flagged VERIFY where it must be confirmed/refreshed against the
   live programme before production use (subsidy rates and energy
   prices change yearly and by canton).

   Keeping all factors in ONE file makes the engine auditable and
   lets a future data feed (or a domain expert) update figures
   without touching calculation logic.
   ============================================================ */

export type Carrier = "oil" | "gas" | "pellets" | "districtHeat" | "electricity";

/* ----------------------------------------------------------------
   1. CARBON — operational emission factors
   kg CO₂-eq per kWh of FINAL energy (delivered to the building).
   SOURCE: KBOB "Treibhausgasemissionen" / ecoinvent consumption
   mix (KBOB 2022 ed.). Values include upstream (well-to-meter).
   VERIFY against the current KBOB list before production.
---------------------------------------------------------------- */
export const EMISSION = {
  oil: 0.301, // heating oil extra-light
  gas: 0.228, // natural gas
  pellets: 0.036, // wood pellets (near carbon-neutral combustion)
  districtHeat: 0.118, // CH average; varies hugely by network — VERIFY per network
  electricity: 0.128, // CH consumption mix (Verbrauchermix). Certified hydro ≈ 0.025
} satisfies Record<Carrier, number>;

/* ----------------------------------------------------------------
   2. ENERGY PRICES — CHF per kWh of FINAL energy.
   SOURCE: indicative CH retail averages (~2024). Household
   electricity from ElCom median tariff. VERIFY / make user-editable.
---------------------------------------------------------------- */
export const PRICE = {
  oil: 0.115,
  gas: 0.125,
  pellets: 0.085,
  districtHeat: 0.16,
  electricity: 0.29, // household; heat-pump heating cost = price / SPF per useful kWh
} satisfies Record<Carrier, number>;

/* ----------------------------------------------------------------
   3. CONVERSION EFFICIENCIES — useful heat ÷ final energy.
   A boiler turns ~85–90% of fuel into useful heat; a heat pump
   delivers SPF× more useful heat than the electricity it draws.
   SOURCE: SIA 380/1, typical Swiss field SPF for air-source HP.
---------------------------------------------------------------- */
export const EFFICIENCY = {
  oilBoiler: 0.85,
  gasBoiler: 0.9,
  pelletBoiler: 0.85,
  districtHeat: 0.98,
  heatPumpSPF: 3.5, // seasonal performance factor (air-source, retrofit)
} as const;

/* ----------------------------------------------------------------
   4. TYPICAL SPACE-HEAT DEMAND by construction period.
   kWh/m²·yr of USEFUL heat for the existing Swiss residential
   stock — used to estimate baseEnergy when a listing/GWR record
   lacks a measured value.
   SOURCE: SIA 380/1 stock benchmarks / BFE building-park studies.
   VERIFY: indicative bands, refine with measured data where available.
---------------------------------------------------------------- */
export function typicalDemand(buildYear: number): number {
  if (buildYear < 1948) return 170;
  if (buildYear < 1980) return 160; // pre-oil-crisis, little insulation
  if (buildYear < 1995) return 120;
  if (buildYear < 2001) return 90;
  if (buildYear < 2011) return 70;
  return 48; // post-2010 / near-Minergie new build
}

/* ----------------------------------------------------------------
   5. GEAK envelope-demand class boundaries (kWh/m²·yr).
   NOTE: a real GEAK® certificate rates BOTH envelope efficiency and
   overall (primary) energy and must be issued by a certified expert.
   These boundaries approximate the envelope/heat-demand class only
   and are for indicative in-app guidance — NOT a substitute for a
   certified GEAK. SOURCE: GEAK class bands (approx.). VERIFY.
---------------------------------------------------------------- */
export const GEAK_BOUNDS = { A: 30, B: 60, C: 90, D: 120, E: 150, F: 190 } as const;

/* ----------------------------------------------------------------
   6. FINANCING — renovation typically folded into the mortgage.
   SOURCE: indicative SARON-based mortgage rate (~2024/25). The app
   shows interest carry on the financed (post-subsidy) amount; this
   is illustrative, NOT financial advice. VERIFY / make user-editable.
---------------------------------------------------------------- */
export const FINANCE = {
  mortgageRate: 0.02, // annual interest on the financed renovation
};

/* ----------------------------------------------------------------
   7. SUBSIDIES — Das Gebäudeprogramm / HFM 2015 (canton ZH) + Pronovo.
   Real programmes pay by the RIGHT BASIS, not a flat % of cost:
   insulation per m² of element, heat pumps per kW, PV per kWp.
   SOURCE: Das Gebäudeprogramm / Harmonisiertes Fördermodell der
   Kantone (HFM 2015), canton ZH; Pronovo EIV for PV.
   VERIFY: rates change yearly and by canton — confirm before use.
---------------------------------------------------------------- */
export const SUBSIDY = {
  insulationPerM2: 40, // M-01 wall/roof insulation, CHF per m² of insulated element
  windowsPerM2: 70, // window replacement (where eligible), CHF per m² of window
  heatPumpBase: 4000, // M-05 air-source heat pump, base contribution
  heatPumpPerKw: 200, // + per kW thermal output
  pvBase: 400, // Pronovo EIV (small-PV one-time remuneration), base
  pvPerKwp: 360, // + per kWp (<30 kWp tier)
  mvhrLump: 3000, // Komfortlüftung — usually only within a comprehensive reno
};

/* Rough element sizing from heated floor area (m²). These let a
   per-element subsidy be estimated before a real survey supplies
   measured façade/roof/window areas and the heat-pump sizing. */
export const SIZING = {
  facadeArea: (a: number) => a * 0.8,
  roofArea: (a: number) => a * 0.5,
  windowArea: (a: number) => a * 0.15,
  heatLoadKw: (a: number) => a * 0.05, // renovated specific heating load
  pvKwp: (a: number) => a * 0.06,
};

/** Real subsidy (CHF) for a known measure given heated area; null → use catalog fallback. */
export function subsidyForUpgrade(id: string, area: number): number | null {
  switch (id) {
    case "facade":
      return Math.round(SIZING.facadeArea(area) * SUBSIDY.insulationPerM2);
    case "roof":
      return Math.round(SIZING.roofArea(area) * SUBSIDY.insulationPerM2);
    case "windows":
      return Math.round(SIZING.windowArea(area) * SUBSIDY.windowsPerM2);
    case "heatpump":
      return Math.round(SUBSIDY.heatPumpBase + SIZING.heatLoadKw(area) * SUBSIDY.heatPumpPerKw);
    case "pv":
      return Math.round(SUBSIDY.pvBase + SIZING.pvKwp(area) * SUBSIDY.pvPerKwp);
    case "mvhr":
      return SUBSIDY.mvhrLump;
    default:
      return null;
  }
}

/* ---------- helpers ---------- */

// map a listing's German heating label to a carrier enum
export function carrierOf(heating: string): Carrier {
  const h = heating.toLowerCase();
  if (h.includes("öl") || h.includes("oel") || h.includes("oil")) return "oil";
  if (h.includes("gas")) return "gas";
  if (h.includes("pellet") || h.includes("holz")) return "pellets";
  if (h.includes("fern") || h.includes("district")) return "districtHeat";
  return "electricity";
}

// final energy (kWh/yr) needed to deliver a given useful-heat demand
export function finalEnergy(usefulPerM2: number, area: number, carrier: Carrier): number {
  const useful = usefulPerM2 * area;
  switch (carrier) {
    case "oil":
      return useful / EFFICIENCY.oilBoiler;
    case "gas":
      return useful / EFFICIENCY.gasBoiler;
    case "pellets":
      return useful / EFFICIENCY.pelletBoiler;
    case "districtHeat":
      return useful / EFFICIENCY.districtHeat;
    case "electricity":
      return useful / EFFICIENCY.heatPumpSPF; // heat-pump: SPF× leverage
  }
}

// assumptions surfaced to the user (the .assump disclaimer line)
export const ASSUMPTIONS: string[] = [
  "CO₂ from KBOB emission factors × final energy by carrier (incl. upstream).",
  "Energy demand estimated per SIA 380/1 stock bands; heat-pump SPF 3.5.",
  "Subsidies modelled on Das Gebäudeprogramm / HFM 2015 (canton ZH) — confirm current rates.",
  "Financing shows interest carry on the post-subsidy amount — illustrative, not advice.",
  "Indicative figures for planning. A certified GEAK and contractor quotes are required to act.",
];
