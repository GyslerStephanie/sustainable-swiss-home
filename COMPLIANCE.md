# Sustainable Swiss Home — Compliance & Legal Plan

> **Not legal advice.** This is an engineering-led map of the obligations that
> apply to a Swiss property-renovation + financing platform, so the team and a
> qualified Swiss lawyer can act efficiently. Confirm specifics with counsel and
> current FDPIC / FINMA / canton ZH guidance before launch.

Last reviewed: 2026-06 · Scope: buyer-flow MVP (Zürich), hosted on Vercel.

---

## 0. Risk overview (start here)

| Area | Risk if ignored | Severity | Status in MVP |
|---|---|---|---|
| Listings data licensing | Copyright / ToS / unfair-competition (UWG) claims | **High** | Avoided — using a curated seed set, not scraped portals |
| Data protection (nFADP/GDPR) | FDPIC enforcement, fines, reputational | **High** | Not yet — no privacy policy / ROPA / consent flow |
| "GEAK" trademark & deception | Cease-and-desist, consumer-deception (UWG) | **Med-High** | Mitigated — labelled indicative, not a certificate |
| Financing = advice/offer | KKG / FinSA / UWG exposure | **Med** | Mitigated — labelled "illustrative, not an offer" |
| Cross-border data transfer (US hosting) | Unlawful transfer under nFADP Art. 16 | **Med** | Not yet — needs DPF/SCC basis + disclosure |
| Map / GWR data terms | Fair-use breach, throttling | **Low-Med** | Attributed; confirm fair-use at scale |
| "Minergie" trademark | Trademark misuse | **Low** | Mitigated — shown as target, no logo |

**Top 5 pre-launch must-dos:** privacy policy + ToS · transfer mechanism for US
hosting · keep "GEAK"/"Minergie" framing indicative · keep financing
non-advisory until a licensed partner · license listings before showing real ones.

---

## 1. Data protection — nFADP (revDSG) + GDPR

**What applies.** The revised Federal Act on Data Protection (**nFADP / revDSG**),
in force **1 Sept 2023**, governs processing personal data of people in
Switzerland. **GDPR** also applies if we offer services to EU residents
(Art. 3(2) GDPR) — likely eventually, so build dual-compliant (they align well).

**Obligations & actions**
- [ ] **Privacy policy** (Art. 19 nFADP info duty): controller identity, purposes,
      recipients, **countries** of any transfer. Public, at point of collection.
- [ ] **Records of processing (ROPA)** (Art. 12). SME exemption is narrow; a
      platform handling property + (later) financial data should keep one.
- [ ] **Legal basis / consent** for each purpose; explicit consent for any
      sensitive data or profiling.
- [ ] **Data security** (Art. 8) — TLS (have it), access control, encryption at
      rest once we add a DB; **breach notification** to FDPIC "as soon as
      possible" when high risk (Art. 24).
- [ ] **Privacy by design & default** (Art. 7) — collect the minimum; the
      address-lookup (GWR) should not persist addresses without need.
- [ ] **DPIA** (Art. 22) — likely required once we profile users financially or
      at scale (renovation + income/financing = potential high risk).
- [ ] **Data-subject rights** (Art. 25): access, rectification, deletion,
      portability — build self-serve endpoints when accounts land.
- [ ] **Automated decisions** (Art. 21): if financing output ever becomes an
      automated decision with significant effect, inform + allow human review.
- [ ] Appoint a **data protection advisor** (Art. 10, optional but recommended);
      **CH representative** (Art. 14) only if the controlling entity is abroad.

**Cookies/analytics.** CH law (FMG Art. 45c) is opt-out + inform; under GDPR,
non-essential cookies need consent. Add a cookie notice; if using Vercel/other
analytics, disclose and prefer privacy-friendly/anonymised analytics.

---

## 2. Cross-border data transfer (we host on Vercel / US)

**What applies.** nFADP Art. 16–17: transfer abroad only to countries with
adequate protection **or** with safeguards. The US is **not** generally adequate.

**Actions**
- [ ] Rely on the **Swiss–US Data Privacy Framework** (Swiss adequacy effective
      **Sept 2024**) *only if* the US processor is **DPF-certified** — verify
      Vercel's status; otherwise use **Standard Contractual Clauses** + a
      transfer impact assessment.
- [ ] Prefer **EU/Frankfurt or CH region** for any store of personal data
      (Vercel Postgres/Neon/Supabase all offer EU regions).
- [ ] List sub-processors (hosting, DB, auth, email) in the privacy policy.

---

## 3. Geodata & building data licensing

**swisstopo basemap (WMTS).** swisstopo geodata is **Open Government Data
(free, incl. commercial) since 1 March 2021**, requiring **source attribution**
("© swisstopo" — already rendered on the map).
- [ ] Review WMTS **fair-use / terms of use**; at production volume, **cache
      tiles** or use a paid tile host (e.g. MapTiler) to avoid throttling.
- MapLibre GL JS is BSD-3 licensed — fine.

**GWR / RegBL via GeoAdmin API.** Federal building register is **OGD**, free incl.
commercial, with source acknowledgment.
- [ ] Honour GeoAdmin **API fair-use / rate limits** (no SLA). For scale, use the
      BFS GWR bulk download / official webservice (madd.bfs.admin.ch) and cache.
- [ ] Building attributes (year, heating) are not personal data, but an
      **address tied to a person** can be — don't retain lookups unnecessarily.

**KBOB / ecobau LCA factors** (our emission factors): published reference data,
usable with attribution — keep the `SOURCE:`/`VERIFY:` tags in `engine.ts`.

---

## 4. Property listings (the buyer core)

**What applies.** Homegate / ImmoScout24 / Newhome listings are **copyright** +
**ToS**-protected; scraping typically breaches contract and risks **UWG (unfair
competition, Art. 5)** and copyright claims. Photos/descriptions need rights.

**Actions**
- [ ] **License a feed / partnership** or use a licensed aggregator before
      showing real, current listings. (MVP deliberately uses a curated seed set
      via the `ListingProvider` seam — swap in the licensed source with no UI
      change.)
- [ ] Secure rights to any listing **images/text** displayed.
- [ ] Property **prices/valuations** from a licensed provider (PriceHubble / IAZI
      / RealAdvisor) if shown as estimates.

---

## 5. Energy certificate — "GEAK®"

**What applies.** **GEAK** is a **trademark** of the cantons (EnDK); a valid GEAK
is issued **only by a certified GEAK expert**. Calling our estimate a "GEAK", or
using the logo, risks trademark + **consumer-deception (UWG)** claims.

**Actions**
- [x] Label the in-app rating as an **indicative energy class, not a GEAK**
      (done — `engine.ts` `ASSUMPTIONS` + dossier "Methodology" note).
- [ ] Do **not** use the GEAK name as a product claim or the GEAK logo.
- [ ] To offer real certificates, **partner with certified GEAK experts** /
      the GEAK association (also a good conversion + revenue path).

---

## 6. Subsidies information (Gebäudeprogramm / HFM 2015 / Pronovo)

- Subsidy **facts** are free to use. Present amounts as **indicative**, since
  they change yearly and by canton (already disclaimed in the dossier).
- [ ] If integrating **energiefranken.ch** or a programme API, check its terms.
- [ ] Never present an estimate as a **guaranteed grant**; link to the official
      application. Eligibility/approval rests with the programme.

---

## 7. Financing — FINMA, KKG, FinSA, insurance

**Mortgages.** Mortgage lending by non-banks is largely outside FINMA licensing,
and the **Consumer Credit Act (KKG)** *excludes* real-estate-secured loans
(Art. 7 KKG) — so mortgage **information** is low-risk.

**Watch-outs**
- [ ] **Consumer renovation loans** (unsecured) → **KKG applies**: credit
      intermediaries need authorisation, creditworthiness checks, max rates,
      withdrawal right. Avoid brokering these without a licensed partner.
- [ ] **FinSA/FIDLEG** targets financial *instruments* (securities) — mortgages
      aren't, so FinSA largely N/A unless we offer investment products.
- [ ] **Insurance** cross-sell (e.g. building insurance) → **VAG** broker
      registration with FINMA.
- [x] Keep financing figures **"illustrative, not personalized advice or an
      offer"** (done — Reimagine + Summary copy, methodology note).
- [ ] For real advice/origination, **partner with a licensed mortgage broker /
      bank** (key4/UBS, MoneyPark, etc.) and let them own the regulated step.

---

## 8. Marketing, contracts & consumer protection

- [ ] **Terms of Service** + **Privacy Policy** + **Imprint/Impressum**.
- [ ] **UWG**: all figures (energy, CO₂, cost, savings) must be substantiated and
      not misleading — our sourced engine + disclaimers support this.
- [ ] **Price indication (PBV)** for any paid service/subscription; distance-
      selling transparency.
- [ ] **Accessibility**: BehiG mandates apply to public bodies, not private
      firms — but WCAG-aligned UI is good practice (we set `aria-label`s, etc.).

---

## 9. Trademarks to handle carefully

- **GEAK** — see §5 (indicative only, no logo).
- **Minergie** — registered standard (Verein Minergie). Describing a target is
  descriptive use; do **not** claim certification or use the logo. App already
  shows "Minergie (in Reichweite)" as a *target* — keep that framing.

---

## 10. Pre-launch compliance checklist (condensed)

1. [ ] Privacy policy, ToS, Impressum published.
2. [ ] Lawful transfer basis for US hosting (DPF-verified processor or SCCs); or move personal data to an EU/CH region.
3. [ ] ROPA started; DPIA scoped for the profiling/financing features.
4. [ ] Cookie/analytics notice (+ consent if GDPR in scope).
5. [ ] Listings licensed before any real (non-seed) listings go live.
6. [ ] swisstopo + GeoAdmin fair-use reviewed; caching plan for scale.
7. [ ] "GEAK"/"Minergie" used as indicative targets only; no logos.
8. [ ] Financing kept non-advisory until a licensed partner is in place.
9. [ ] Data-subject-rights process ready before accounts launch.
10. [ ] Swiss data-protection + financial-services counsel sign-off.

---

## 11. How the codebase already supports this

- `app/lib/engine.ts` — every factor `SOURCE:`/`VERIFY:` tagged; `ASSUMPTIONS`
  surfaced in the dossier (substantiation for UWG; GEAK caveat).
- `app/lib/providers.ts` — `ListingProvider` seam lets a **licensed** feed
  replace seed data with no UI change.
- Map renders **© swisstopo** attribution.
- Financing/energy copy framed as **indicative, not an offer/advice**.
- No third-party listings scraped; no GEAK/Minergie logos used.
