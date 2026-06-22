/* ============================================================
   Sustainable Swiss Home — data model + calculation engine
   Plain JS. Exposes window.SSH = { listings, upgrades, finishes,
   subsidies, geak, computePlan, fmt }
   All figures are INDICATIVE mock data for the prototype.
   ============================================================ */
(function () {

  // ---------- formatting helpers ----------
  const fmtCHF = (n) => "CHF " + Math.round(n).toLocaleString("de-CH");
  const fmtCHFk = (n) => "CHF " + (Math.round(n / 1000)) + "k";
  const fmt = { CHF: fmtCHF, CHFk: fmtCHFk };

  // ---------- GEAK energy scale (kWh/m²·yr) ----------
  // Calibrated so ~142 reads E and ~58 reads B.
  const geak = {
    grades: ["A", "B", "C", "D", "E", "F", "G"],
    // upper bound (inclusive) for each grade
    bounds: { A: 30, B: 60, C: 90, D: 120, E: 150, F: 190, G: Infinity },
    of(use) {
      const g = this.grades;
      for (let i = 0; i < g.length; i++) {
        if (use <= this.bounds[g[i]]) return g[i];
      }
      return "G";
    },
    index(grade) { return this.grades.indexOf(grade); }
  };

  // ---------- mock Zürich listings ----------
  // baseEnergy = kWh/m²·yr ; baseCO2 = t/yr (operational)
  const listings = [
    {
      id: "seefeld",
      address: "Seefeldstrasse 142",
      zip: "8008", district: "Seefeld",
      type: "4.5-Zi. Wohnung", year: 1974, area: 112,
      price: 1485000, baseEnergy: 142, baseCO2: 5.1, heating: "Öl",
      blurb: "Charming but tired — original oil heating, single-glazed.",
      pin: { x: 41, y: 47 }
    },
    {
      id: "wiedikon",
      address: "Birmensdorferstrasse 89",
      zip: "8003", district: "Wiedikon",
      type: "3.5-Zi. Wohnung", year: 1962, area: 84,
      price: 985000, baseEnergy: 158, baseCO2: 4.6, heating: "Gas",
      blurb: "Compact city flat, gas boiler, great bones.",
      pin: { x: 28, y: 62 }
    },
    {
      id: "oerlikon",
      address: "Schaffhauserstrasse 318",
      zip: "8050", district: "Oerlikon", type: "5.5-Zi. Reihenhaus",
      year: 1988, area: 146, price: 1690000, baseEnergy: 121, baseCO2: 4.2,
      heating: "Öl",
      blurb: "Family townhouse with roof + garden potential.",
      pin: { x: 58, y: 22 }
    },
    {
      id: "altstetten",
      address: "Badenerstrasse 567",
      zip: "8048", district: "Altstetten", type: "4.5-Zi. Wohnung",
      year: 1979, area: 104, price: 1145000, baseEnergy: 134, baseCO2: 4.8,
      heating: "Öl",
      blurb: "South-facing, big balcony, dated interior.",
      pin: { x: 16, y: 39 }
    },
    {
      id: "enge",
      address: "Mythenquai 28",
      zip: "8002", district: "Enge", type: "3.5-Zi. Wohnung",
      year: 1969, area: 92, price: 1320000, baseEnergy: 148, baseCO2: 5.0,
      heating: "Gas",
      blurb: "Lakeside location, premium upside on renovation.",
      pin: { x: 37, y: 74 }
    }
  ];

  // ---------- upgrade catalog (whole-home systems) ----------
  // cost: { fixed, perM2 }  → total = fixed + perM2 * area
  // energy: kWh/m²·yr reduced ;  co2: t/yr reduced
  // subsidyRate: fraction of cost covered (capped) ; subsidyCap
  // value: { fixed, perM2 } property-value uplift
  // group: "envelope" | "systems" | "energy"
  const upgrades = [
    {
      id: "heatpump", group: "systems",
      name: "Air-source heat pump", short: "Wärmepumpe",
      desc: "Replaces the oil/gas boiler. The single biggest carbon win.",
      cost: { fixed: 34000, perM2: 40 },
      energy: 22, co2: 2.6,
      subsidyRate: 0.30, subsidyCap: 14000,
      value: { fixed: 45000, perM2: 120 },
      minergie: 2, place: "tech", marker: "WP"
    },
    {
      id: "windows", group: "envelope",
      name: "Triple-glazed windows", short: "Fenster 3-fach",
      desc: "Cuts heat loss and kills draughts throughout.",
      cost: { fixed: 6000, perM2: 320 },
      energy: 15, co2: 0.5,
      subsidyRate: 0.15, subsidyCap: 9000,
      value: { fixed: 12000, perM2: 180 },
      minergie: 1, place: "windows", marker: ""
    },
    {
      id: "facade", group: "envelope",
      name: "Façade insulation", short: "Fassadendämmung",
      desc: "The biggest envelope improvement — wraps the whole shell.",
      cost: { fixed: 18000, perM2: 420 },
      energy: 25, co2: 0.6,
      subsidyRate: 0.25, subsidyCap: 22000,
      value: { fixed: 20000, perM2: 220 },
      minergie: 2, place: "facade", marker: ""
    },
    {
      id: "roof", group: "envelope",
      name: "Roof / attic insulation", short: "Dachdämmung",
      desc: "Stops the heat escaping upward — fast payback.",
      cost: { fixed: 9000, perM2: 120 },
      energy: 11, co2: 0.4,
      subsidyRate: 0.25, subsidyCap: 8000,
      value: { fixed: 8000, perM2: 90 },
      minergie: 1, place: "roof", marker: ""
    },
    {
      id: "pv", group: "energy",
      name: "Rooftop solar PV", short: "Solar PV",
      desc: "On-site generation; can push toward net-zero with a battery.",
      cost: { fixed: 17000, perM2: 60 },
      energy: 8, co2: 1.4,
      subsidyRate: 0.20, subsidyCap: 9000,
      value: { fixed: 22000, perM2: 60 },
      minergie: 2, place: "roof", marker: "PV"
    },
    {
      id: "mvhr", group: "systems",
      name: "MVHR ventilation", short: "Komfortlüftung",
      desc: "Fresh, filtered air with heat recovery — a Minergie staple.",
      cost: { fixed: 12000, perM2: 80 },
      energy: 8, co2: 0.3,
      subsidyRate: 0.10, subsidyCap: 4000,
      value: { fixed: 9000, perM2: 70 },
      minergie: 2, place: "tech", marker: "LÜ"
    }
  ];

  // ---------- interior finishes (per room flooring) ----------
  const finishes = [
    { id: "keep", name: "Bestehend", note: "Existing floor, kept", swatch: "#cdd0cf", perM2: 0, embodied: 0, eco: false },
    { id: "oak", name: "Eiche-Parkett", note: "Engineered oak — warm, durable", swatch: "#c79a63", perM2: 185, embodied: 0.02, eco: false },
    { id: "cork", name: "Kork", note: "Soft, warm, low embodied carbon", swatch: "#b07a4e", perM2: 125, embodied: -0.03, eco: true },
    { id: "clay", name: "Lehmplatten", note: "Clay tiles — natural, breathable", swatch: "#bb6b50", perM2: 215, embodied: -0.01, eco: true },
    { id: "micro", name: "Mikrozement", note: "Seamless mineral surface", swatch: "#9aa39b", perM2: 240, embodied: 0.04, eco: false }
  ];
  const finishById = (id) => finishes.find(f => f.id === id) || finishes[0];

  // ---------- subsidy programmes (for labelling in the dossier) ----------
  const subsidies = [
    { id: "gebaeude", name: "Das Gebäudeprogramm", scope: "Federal + cantonal", covers: ["facade", "roof", "windows"] },
    { id: "kanton", name: "Kanton ZH — Heizungsersatz", scope: "Cantonal", covers: ["heatpump"] },
    { id: "pronovo", name: "Pronovo — EIV (PV)", scope: "Federal", covers: ["pv"] },
    { id: "comfort", name: "Komfortlüftungs-Förderung", scope: "Cantonal", covers: ["mvhr"] }
  ];

  // ---------- floor plan geometry (viewBox 0 0 600 470) ----------
  // habitable + finishable rooms get `finish:true`
  const rooms = [
    { id: "living",   name: "Wohn-/Essraum", area: 38, x: 16,  y: 16,  w: 330, h: 250, finish: true },
    { id: "kitchen",  name: "Küche",          area: 14, x: 346, y: 16,  w: 238, h: 120, finish: true },
    { id: "bath",     name: "Bad",            area: 8,  x: 346, y: 146, w: 118, h: 120, finish: true },
    { id: "tech",     name: "Technik",        area: 6,  x: 464, y: 146, w: 120, h: 120, finish: false },
    { id: "hall",     name: "Korridor",       area: 11, x: 16,  y: 266, w: 568, h: 56,  finish: true },
    { id: "bed1",     name: "Schlafen",       area: 18, x: 16,  y: 322, w: 278, h: 132, finish: true },
    { id: "bed2",     name: "Zimmer",         area: 15, x: 294, y: 322, w: 290, h: 132, finish: true }
  ];

  // ---------- the calculation engine ----------
  // state = { systems: [ids], finishes: { roomId: finishId } }
  function computePlan(listing, state) {
    const area = listing.area;
    const active = upgrades.filter(u => state.systems.includes(u.id));

    // costs
    let systemsCost = 0, subsidyTotal = 0, valueUplift = 0;
    let energyReduction = 0, co2Reduction = 0, minergiePts = 0;
    const subsidyLines = [];
    const costLines = [];

    active.forEach(u => {
      const c = u.cost.fixed + u.cost.perM2 * area;
      systemsCost += c;
      const sub = Math.min(c * u.subsidyRate, u.subsidyCap);
      subsidyTotal += sub;
      valueUplift += u.value.fixed + u.value.perM2 * area;
      energyReduction += u.energy;
      co2Reduction += u.co2;
      minergiePts += u.minergie;
      costLines.push({ id: u.id, name: u.name, cost: c, subsidy: sub, group: u.group });
      if (sub > 0) {
        const prog = subsidies.find(s => s.covers.includes(u.id));
        subsidyLines.push({ name: prog ? prog.name : "Förderung", scope: prog ? prog.scope : "", amount: sub, upgrade: u.name });
      }
    });

    // finishes
    let finishCost = 0, finishEmbodied = 0;
    const finishLines = [];
    rooms.forEach(r => {
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

    // energy + rating
    const energyUse = Math.max(15, Math.round(listing.baseEnergy - energyReduction));
    const baseGrade = geak.of(listing.baseEnergy);
    const newGrade = geak.of(energyUse);
    const gradeJump = geak.index(baseGrade) - geak.index(newGrade);

    // co2
    const co2 = Math.max(0.4, +(listing.baseCO2 - co2Reduction).toFixed(1));

    // minergie status
    let minergie = null;
    const hasMVHR = state.systems.includes("mvhr");
    const hasPV = state.systems.includes("pv");
    if (energyUse <= 35 && hasPV && hasMVHR) minergie = "Minergie-A";
    else if (energyUse <= 38 && hasMVHR) minergie = "Minergie-P";
    else if (energyUse <= 60 && hasMVHR) minergie = "Minergie";
    else if (minergiePts >= 4) minergie = "Minergie (in Reichweite)";

    // money
    const renoCost = systemsCost + finishCost;
    const financed = Math.max(0, renoCost - subsidyTotal);
    // blended monthly: ~2.0% interest + light amortization over the financed reno
    const monthlyFinance = financed * 0.0044;
    // energy savings: reduced kWh * area * effective CHF/kWh, monthly
    const kwhSaved = (listing.baseEnergy - energyUse) * area;
    const monthlyEnergySaving = (kwhSaved * 0.16) / 12;
    const netMonthly = Math.round(monthlyFinance - monthlyEnergySaving);

    return {
      area, baseGrade, newGrade, gradeJump,
      baseEnergy: listing.baseEnergy, energyUse, energyReduction,
      baseCO2: listing.baseCO2, co2, co2Reduction,
      systemsCost, finishCost, renoCost,
      subsidyTotal, subsidyLines, costLines, finishLines,
      valueUplift, financed, monthlyFinance: Math.round(monthlyFinance),
      monthlyEnergySaving: Math.round(monthlyEnergySaving), netMonthly,
      minergie, minergiePts, kwhSaved: Math.round(kwhSaved),
      hasUpgrades: active.length > 0 || finishLines.length > 0
    };
  }

  window.SSH = { listings, upgrades, finishes, finishById, subsidies, geak, rooms, computePlan, fmt };
})();
