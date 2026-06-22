# Sustainable Swiss Home

A playful, enterprise-grade tool for reimagining, renovating and financing **sustainable
Minergie homes in Zürich**. Pick a property, redesign it on an interactive floor plan, and
watch the cost, energy and carbon impact recalculate live — then turn the vision into a
buildable dossier and connect with banks, architects, builders and energy advisors.

This is a production implementation (Next.js + React + TypeScript) of the design prototype
exported from Claude Design (the original HTML/CSS/JS prototype lives in `project/`).

## Stack

- **Next.js 15** (App Router)
- **React 19** + **TypeScript**
- Plain global CSS (`app/globals.css`) — ported verbatim from the prototype, using an
  `oklch` color system, a blueprint-grid backdrop, Hanken Grotesk + Space Mono type, and a
  light/playful/architectural-drafting aesthetic.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm start        # serve the production build
```

## Architecture

The whole experience is a single client-rendered flow (state + localStorage persistence)
mounted at `/`.

```
app/
  layout.tsx            Root layout, metadata, global CSS
  page.tsx              Renders <AppRoot/>
  globals.css           All styles (ported from the prototype)
  lib/
    data.ts             Typed data model + the calculation engine
  components/
    AppRoot.tsx         Routing, lifted plan state, localStorage persistence
    Discover.tsx        Zipcode search · schematic Zürich map · listing cards
    Reimagine.tsx       The core 3-pane workspace (catalog · canvas · impact ledger)
    FloorPlan.tsx       Interactive SVG floor plan (selectable rooms, live systems)
    Summary.tsx         Generated renovation dossier + connect directory
    primitives.tsx      Shared UI (animated numbers, GEAK badges, brand, step nav)
```

### The three screens

1. **Discover** — search Zürich by PLZ, a schematic map with priced pins, and 5 plausible
   mock listings (each with area, year, price, heating type and current GEAK rating).
2. **Reimagine** *(the heart)* — toggle whole-home upgrades (heat pump, triple glazing,
   façade/roof insulation, solar PV, MVHR) and swap per-room floor finishes on an editable
   SVG plan. A **live Impact Ledger** recomputes on every change: GEAK rating, energy use,
   CO₂, renovation cost, Swiss subsidies, value uplift and the headline net monthly impact.
   A Before/After toggle shows the transformation.
3. **Dossier** — the plan becomes a structured document: cost breakdown with subsidies,
   financing assumptions, a phased roadmap tailored to the selections, and a Connect
   directory of banks, architects, builders and energy advisors. Exportable via print.

### Calculation engine

`app/lib/data.ts` holds the data model and `computePlan()` — GEAK thresholds, per-m² costs,
subsidy caps and Minergie tiers. **All figures are indicative mock data** calibrated to feel
right for the prototype; real cost/subsidy data needs sourcing before any production use.
