"use client";
/* Summary — the generated renovation dossier + connect directory */
import React from "react";
import { fmt, type Listing, type PlanState, type ComputedPlan } from "@/app/lib/data";
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

  const connect: { ic: string; color: string; title: string; sub: string; desc: string; partners: [string, string][] }[] = [
    {
      ic: "B",
      color: "acc",
      title: "Banks & financing",
      sub: "Mortgage + green rates",
      desc: "Pre-qualify with your dossier and target rating.",
      partners: [
        ["ZKB Eigenheim", "Green-rate · ZH"],
        ["Raiffeisen Hypothek", "Renovation finance"],
      ],
    },
    {
      ic: "A",
      color: "coral",
      title: "Architects & designers",
      sub: "Minergie-experienced",
      desc: "Practices matched to your scope and canton.",
      partners: [
        ["Atelier Nordfassade", "Minergie · Zürich"],
        ["Studio Lichtbau", "Renovation · Altbau"],
      ],
    },
    {
      ic: "C",
      color: "green",
      title: "Builders & trades",
      sub: "Vetted installers",
      desc: "Certified for heat pumps, PV and envelope work.",
      partners: [
        ["Wärmebau AG", "WP · cert."],
        ["SolarZH GmbH", "PV · Pronovo"],
      ],
    },
    {
      ic: "E",
      color: "purple",
      title: "Energy advisors",
      sub: "GEAK-certified",
      desc: "Run the formal audit and unlock advisory grants.",
      partners: [
        ["GEAK-Experte Meier", "GEAK Plus"],
        ["EnergieBeratung ZH", "Cantonal grants"],
      ],
    },
  ];
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
                    <th>Scope</th>
                    <th>Applies to</th>
                    <th className="r">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {computed.subsidyLines.map((s, i) => (
                    <tr key={i}>
                      <td>
                        <b>{s.name}</b>
                      </td>
                      <td style={{ color: "var(--muted)" }}>{s.scope}</td>
                      <td style={{ color: "var(--muted)" }}>{s.upgrade}</td>
                      <td className="r pos">{fmt.CHF(s.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3}>Total support</td>
                    <td className="r pos">−{fmt.CHF(computed.subsidyTotal)}</td>
                  </tr>
                </tfoot>
              </table>
              <p style={{ fontSize: 12, color: "var(--faint)", fontFamily: "var(--mono)", marginTop: 10 }}>
                Indicative. Exact amounts and eligibility change yearly and by canton — confirm before committing.
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
                  <td>Modelled rate (incl. light amortization)</td>
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
            <h2>Connect — take it to the people who build</h2>
            <div className="connect-grid">
              {connect.map((c, i) => (
                <div className="connect-card" key={i}>
                  <div className="cc-top">
                    <div className="cc-ic" style={{ background: colorMap[c.color][0], color: colorMap[c.color][1] }}>
                      {c.ic}
                    </div>
                    <div>
                      <h4>{c.title}</h4>
                      <div className="cc-sub">{c.sub}</div>
                    </div>
                  </div>
                  <p>{c.desc}</p>
                  {c.partners.map((p, j) => (
                    <div className="partner" key={j}>
                      <span className="pn">{p[0]}</span>
                      <span className="pm">{p[1]}</span>
                    </div>
                  ))}
                  <button className="btn sm" style={{ width: "100%", justifyContent: "center", marginTop: 12 }}>
                    Share dossier →
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
