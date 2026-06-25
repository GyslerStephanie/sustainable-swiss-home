"use client";
/* Summary — the generated renovation dossier + connect directory */
import React from "react";
import { fmt, DIRECTORY, type Listing, type PlanState, type ComputedPlan } from "@/app/lib/data";
import { ASSUMPTIONS } from "@/app/lib/engine";
import { Brand, Steps, GeakBadge } from "./primitives";

interface SummaryProps {
  listing: Listing;
  state: PlanState;
  computed: ComputedPlan;
  onBack: () => void;
  onPrint: () => void;
}

export function Summary({ listing, state, computed, onBack, onPrint }: SummaryProps) {
  // build a phased roadmap from the selections
  const sys = state.systems;
  const steps: { t: string; d: string; who: string }[] = [];
  steps.push({
    t: "GEAK Plus energy audit",
    d: "Formalize the current rating and lock in the renovation roadmap — partly subsidized.",
    who: "Energy advisor",
  });
  const envelope = ["facade", "roof", "windows"].filter((id) => sys.includes(id));
  if (envelope.length)
    steps.push({
      t: "Building envelope",
      d: "Insulation and glazing first — they shrink the heating demand everything else is sized to.",
      who: "Architect · Façade contractor",
    });
  if (sys.includes("heatpump") || sys.includes("mvhr"))
    steps.push({
      t: "Heating & ventilation",
      d: "Swap the fossil boiler for a heat pump" + (sys.includes("mvhr") ? " and add comfort ventilation." : "."),
      who: "HVAC installer (certified)",
    });
  if (sys.includes("pv"))
    steps.push({ t: "Solar PV", d: "Rooftop generation, registered with Pronovo for one-time remuneration.", who: "PV installer" });
  if (computed.finishLines.length)
    steps.push({
      t: "Interior finishes",
      d: "Flooring and surfaces — the visible payoff once the systems are in.",
      who: "Interior · General contractor",
    });
  steps.push({
    t: "Financing & subsidies",
    d: "Fold the value-adding works into the mortgage and submit subsidy applications before works begin.",
    who: "Bank · Mortgage advisor",
  });

  // A real, sendable brief — prefilled email a homeowner can fire off to any pro.
  const measures = computed.costLines.map((c) => `· ${c.name}`).join("\n") || "· (none selected yet)";
  const shareBody =
    `Renovation brief — ${listing.address}, ${listing.zip} ${listing.district}\n\n` +
    `Building: ${listing.type}, ${listing.area} m², Baujahr ${listing.year}\n` +
    `Energy rating: ${computed.baseGrade} → ${computed.newGrade} (${computed.energyUse} kWh/m²·yr)\n` +
    `CO₂ reduction: ${computed.co2Reduction.toFixed(1)} t/yr\n\n` +
    `Planned measures:\n${measures}\n\n` +
    `Indicative cost: ${fmt.CHF(computed.renoCost)} · subsidies ${fmt.CHF(computed.subsidyTotal)} · ` +
    `net to finance ${fmt.CHF(computed.financed)}\n\n` +
    `Generated with Sustainable Dwellings. Figures are indicative — I'd like a quote.`;
  const shareHref = `mailto:?subject=${encodeURIComponent("Renovation brief — " + listing.address)}&body=${encodeURIComponent(shareBody)}`;

  const colorMap: Record<string, [string, string]> = {
    acc: ["var(--acc-soft)", "var(--acc-2)"],
    coral: ["var(--coral-soft)", "var(--coral)"],
    green: ["var(--green-soft)", "var(--green-2)"],
    purple: ["var(--purple-soft)", "var(--purple)"],
  };

  return (
    <div className="summary">
      <div className="topbar">
        <button className="btn ghost sm" onClick={onBack}>
          ← Back to plan
        </button>
        <Brand />
        <div style={{ width: 1, height: 26, background: "var(--line)" }}></div>
        <Steps current="summary" />
        <div className="spacer"></div>
        <button className="btn" onClick={onPrint}>
          ⤓ Export PDF
        </button>
        <button
          className="btn primary"
          onClick={() => {
            document.querySelector<HTMLElement>(".connect-grid")?.scrollIntoView?.({ behavior: "smooth" });
          }}
        >
          Connect with pros ↓
        </button>
      </div>

      <div className="summary-scroll">
        <div className="summary-doc">
          <div className="dossier-head">
            <div>
              <div className="eyebrow">Renovation dossier</div>
              <h1>{listing.address}</h1>
              <div className="addr-sub">
                {listing.zip} {listing.district} · {listing.type} · {listing.area} m² · Baujahr {listing.year} · {fmt.CHF(listing.price)}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <GeakBadge grade={computed.baseGrade} size={34} />
              <span style={{ color: "var(--faint)" }}>→</span>
              <GeakBadge grade={computed.newGrade} size={44} />
            </div>
          </div>

          {/* KPIs */}
          <div className="dossier-kpis">
            <div className="kpi">
              <div className="kl">Energy rating</div>
              <div className="kv acc">
                {computed.baseGrade}→{computed.newGrade}
              </div>
              <div className="kd">{computed.energyUse} kWh/m²·yr</div>
            </div>
            <div className="kpi">
              <div className="kl">CO₂ saved</div>
              <div className="kv green">−{computed.co2Reduction.toFixed(1)}t</div>
              <div className="kd">per year</div>
            </div>
            <div className="kpi">
              <div className="kl">Net to finance</div>
              <div className="kv">{fmt.CHFk(computed.financed)}</div>
              <div className="kd">after {fmt.CHFk(computed.subsidyTotal)} subsidies</div>
            </div>
            <div className="kpi">
              <div className="kl">Net monthly</div>
              <div className="kv acc">
                {computed.netMonthly >= 0 ? "+" : "−"}
                {Math.abs(computed.netMonthly)}
              </div>
              <div className="kd">CHF / month</div>
            </div>
          </div>

          {/* Rooftop solar potential — real data from swisstopo sonnendach */}
          {listing.solar && (
            <div className="solar-note">
              ☀ <b>Rooftop solar potential:</b> ~{listing.solar.kwhYr.toLocaleString("de-CH")} kWh/yr across ~
              {listing.solar.areaM2} m² of suitable roof
              {listing.solar.klasse ? ` (sonnendach suitability ${listing.solar.klasse}/5)` : ""}. That is the official
              ceiling for on-site PV at this address — swisstopo solar cadastre.
            </div>
          )}

          {/* Cost breakdown */}
          <div className="doc-sec">
            <h2>Cost breakdown</h2>
            <table className="dtable">
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="r">Cost</th>
                  <th className="r">Subsidy</th>
                  <th className="r">Net</th>
                </tr>
              </thead>
              <tbody>
                {computed.costLines.length === 0 && computed.finishLines.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ color: "var(--faint)", textAlign: "center", padding: "20px" }}>
                      No upgrades selected yet — go back and add some.
                    </td>
                  </tr>
                )}
                {computed.costLines.map((c, i) => (
                  <tr key={i}>
                    <td>{c.name}</td>
                    <td className="r">{fmt.CHF(c.cost)}</td>
                    <td className="r pos">{c.subsidy ? "−" + fmt.CHF(c.subsidy) : "—"}</td>
                    <td className="r">{fmt.CHF(c.cost - c.subsidy)}</td>
                  </tr>
                ))}
                {computed.finishLines.map((f, i) => (
                  <tr key={"f" + i}>
                    <td>
                      Finish · {f.room} <span style={{ color: "var(--faint)" }}>({f.finish})</span>
                    </td>
                    <td className="r">{fmt.CHF(f.cost)}</td>
                    <td className="r">—</td>
                    <td className="r">{fmt.CHF(f.cost)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total</td>
                  <td className="r">{fmt.CHF(computed.renoCost)}</td>
                  <td className="r pos">−{fmt.CHF(computed.subsidyTotal)}</td>
                  <td className="r">{fmt.CHF(computed.financed)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Subsidies */}
          {computed.subsidyLines.length > 0 && (
            <div className="doc-sec">
              <h2>Subsidies &amp; grants</h2>
              <table className="dtable">
                <thead>
                  <tr>
                    <th>Programme</th>
                    <th>Applies to</th>
                    <th className="r">Amount</th>
                    <th>Apply</th>
                  </tr>
                </thead>
                <tbody>
                  {computed.subsidyLines.map((s, i) => (
                    <tr key={i}>
                      <td>
                        <b>{s.name}</b>
                        <div style={{ color: "var(--faint)", fontSize: 11.5 }}>{s.scope}</div>
                        {s.apply && (
                          <span className={"apply-tag" + (/AFTER/i.test(s.apply) ? " after" : "")}>{s.apply}</span>
                        )}
                      </td>
                      <td style={{ color: "var(--muted)" }}>{s.upgrade}</td>
                      <td className="r pos">{fmt.CHF(s.amount)}</td>
                      <td>
                        {s.url ? (
                          <a className="apply-link" href={s.url} target="_blank" rel="noopener noreferrer">
                            Open portal ↗
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2}>Total support</td>
                    <td className="r pos">−{fmt.CHF(computed.subsidyTotal)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
              <p style={{ fontSize: 12, color: "var(--faint)", fontFamily: "var(--mono)", marginTop: 10 }}>
                Indicative. Exact amounts and eligibility change yearly and by canton — confirm on each portal.
                Most grants must be filed <b>before</b> works begin (PV is registered after commissioning).
              </p>
            </div>
          )}

          {/* Financing */}
          <div className="doc-sec">
            <h2>Financing assumptions</h2>
            <table className="dtable">
              <tbody>
                <tr>
                  <td>Purchase price</td>
                  <td className="r">{fmt.CHF(listing.price)}</td>
                </tr>
                <tr>
                  <td>Net renovation (after subsidies)</td>
                  <td className="r">{fmt.CHF(computed.financed)}</td>
                </tr>
                <tr>
                  <td>Interest rate on financed amount</td>
                  <td className="r">~2.0%</td>
                </tr>
                <tr>
                  <td>Est. energy savings</td>
                  <td className="r pos">~{fmt.CHF(computed.monthlyEnergySaving)}/mo</td>
                </tr>
                <tr>
                  <td>
                    <b>Net monthly impact of renovation</b>
                  </td>
                  <td className="r">
                    <b>
                      {computed.netMonthly >= 0 ? "+" : "−"}
                      {fmt.CHF(Math.abs(computed.netMonthly))}/mo
                    </b>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Roadmap */}
          <div className="doc-sec">
            <h2>Phased roadmap</h2>
            <div className="roadmap">
              {steps.map((s, i) => (
                <div className="rm-step" key={i}>
                  <div className="rn">{i + 1}</div>
                  <div>
                    <h4>{s.t}</h4>
                    <p>{s.d}</p>
                    <div className="who">→ {s.who}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Connect */}
          <div className="doc-sec">
            <h2>Connect — apply, and take it to the people who build</h2>
            <div className="connect-grid">
              {DIRECTORY.map((c) => (
                <div className="connect-card" key={c.key}>
                  <div className="cc-top">
                    <div className="cc-ic" style={{ background: colorMap[c.color][0], color: colorMap[c.color][1] }}>
                      {c.ic}
                    </div>
                    <div>
                      <h4>{c.title}</h4>
                    </div>
                  </div>
                  <p>{c.desc}</p>
                  {c.links.map((l, j) => (
                    <a className="partner" key={j} href={l.href} target="_blank" rel="noopener noreferrer">
                      <span className="pn">{l.label} ↗</span>
                      <span className="pm">{l.sub}</span>
                    </a>
                  ))}
                </div>
              ))}
            </div>
            <a className="btn primary" href={shareHref} style={{ marginTop: 16, justifyContent: "center" }}>
              ✉ Email this brief to a pro
            </a>
            <p style={{ fontSize: 11.5, color: "var(--faint)", fontFamily: "var(--mono)", marginTop: 8 }}>
              Opens your mail app with the building, target rating, measures and indicative costs prefilled. Links are
              official / authoritative directories — not paid placements.
            </p>
          </div>

          {/* Methodology */}
          <div className="doc-sec">
            <h2>Methodology &amp; sources</h2>
            <ul className="method-list">
              {ASSUMPTIONS.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
