"use client";
/* Reimagine — the core workspace: upgrade catalog · floor-plan canvas · live ledger */
import React, { useState, useRef } from "react";
import { upgrades as UPGRADES, finishes as FINISHES, rooms as ROOMS, geak, fmt, type Listing, type PlanState, type ComputedPlan, type Upgrade, type DetectedRoom } from "@/app/lib/data";
import { Brand, GeakBadge, AnimatedCHF, AnimatedNum } from "./primitives";
import { FloorPlan } from "./FloorPlan";
import { PlanOverlay } from "./PlanOverlay";

interface ReimagineProps {
  listing: Listing;
  state: PlanState;
  computed: ComputedPlan;
  view: string;
  setView: (v: string) => void;
  onToggleSystem: (id: string) => void;
  onSetFinish: (roomId: string, fid: string) => void;
  onOpenSummary: () => void;
  onBack: () => void;
  planImg: string | null;
  planRooms: DetectedRoom[] | null;
  onPlanDetected: (img: string, rooms: DetectedRoom[]) => void;
  onClearPlan: () => void;
}

export function Reimagine({
  listing,
  state,
  computed,
  view,
  setView,
  onToggleSystem,
  onSetFinish,
  onOpenSummary,
  onBack,
  planImg,
  planRooms,
  onPlanDetected,
  onClearPlan,
}: ReimagineProps) {
  const [selRoom, setSelRoom] = useState<string | null>(null);
  const [vecStatus, setVecStatus] = useState<"idle" | "loading" | "error">("idle");
  const [vecErr, setVecErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const area = listing.area;

  const groups: { id: string; label: string }[] = [
    { id: "envelope", label: "Building envelope" },
    { id: "systems", label: "Heating & air" },
    { id: "energy", label: "Energy generation" },
  ];
  const costOf = (u: Upgrade) => u.cost.fixed + u.cost.perM2 * area;
  const subOf = (u: Upgrade) => Math.min(costOf(u) * u.subsidyRate, u.subsidyCap);

  const activeSystems = UPGRADES.filter((u) => state.systems.includes(u.id));
  const grades = geak.grades;
  const hasPlan = !!planRooms;

  // the currently-selected finish room, from the uploaded plan or the schematic
  const room: { id: string; name: string; area: number } | null = selRoom
    ? planRooms
      ? (() => {
          const i = Number(selRoom.replace("det-", ""));
          const r = planRooms[i];
          return r ? { id: selRoom, name: r.name, area: Math.round(r.area_m2) } : null;
        })()
      : ROOMS.find((r) => r.id === selRoom) ?? null
    : null;

  async function uploadPlan(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = ""; // allow re-uploading the same file
    if (!file) return;
    const ok = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
    if (!ok.includes(file.type)) {
      setVecStatus("error");
      setVecErr("Use a PNG, JPG, WEBP, or PDF");
      return;
    }
    setVecStatus("loading");
    setVecErr("");
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result));
        fr.onerror = () => reject(new Error("Could not read the file"));
        fr.readAsDataURL(file);
      });
      const base64 = dataUrl.split(",")[1] ?? "";
      const res = await fetch("/api/vectorize-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: base64, mediaType: file.type }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not read the floor plan");
      const rooms: DetectedRoom[] = json.rooms || [];
      if (!rooms.length) throw new Error("No rooms detected — try a clearer floor-plan image");
      onPlanDetected(file.type === "application/pdf" ? "" : dataUrl, rooms);
      setSelRoom(null);
      setVecStatus("idle");
    } catch (err) {
      setVecStatus("error");
      setVecErr(err instanceof Error ? err.message : "Upload failed");
    }
  }

  return (
    <div className="workspace">
      {/* TOP BAR */}
      <div className="topbar">
        <button className="btn ghost sm" onClick={onBack}>
          ← Discover
        </button>
        <Brand />
        <div style={{ width: 1, height: 26, background: "var(--line)" }}></div>
        <div className="ws-prop">
          <span className="addr">{listing.address}</span>
          <span className="sub">
            {listing.zip} {listing.district} · {listing.area} m² · Bj. {listing.year}
          </span>
        </div>
        <div className="ws-grade" style={{ marginLeft: 8 }}>
          <GeakBadge grade={computed.baseGrade} size={26} />
          <span className="arrow">→</span>
          <GeakBadge grade={computed.newGrade} size={30} />
        </div>
        <div className="spacer"></div>
        <div className="segmented">
          <button className={view === "before" ? "active" : ""} onClick={() => setView("before")}>
            Before
          </button>
          <button className={view === "after" ? "active" : ""} onClick={() => setView("after")}>
            After
          </button>
        </div>
        <button className="btn primary" onClick={onOpenSummary}>
          Plan summary →
        </button>
      </div>

      {/* BODY */}
      <div className="ws-body">
        {/* CATALOG */}
        <div className="catalog">
          <div className="catalog-head">
            <h3>Upgrade catalog</h3>
            <p>Toggle upgrades — the plan and ledger update live.</p>
          </div>
          <div className="catalog-scroll">
            {groups.map((g) => (
              <div key={g.id}>
                <div className="cat-group-label">{g.label}</div>
                {UPGRADES.filter((u) => u.group === g.id).map((u) => {
                  const on = state.systems.includes(u.id);
                  const sub = subOf(u);
                  return (
                    <div key={u.id} className={"up-card" + (on ? " on" : "")} onClick={() => onToggleSystem(u.id)}>
                      <div className="uc-top">
                        <div className="check"></div>
                        <div className="uc-title">
                          <div className="n">{u.name}</div>
                          <div className="de">{u.short}</div>
                        </div>
                      </div>
                      <div className="uc-desc">{u.desc}</div>
                      <div className="uc-stats">
                        <span className="stat cost">
                          <b>{fmt.CHFk(costOf(u))}</b>
                        </span>
                        <span className="stat energy">
                          −{u.energy} <span style={{ opacity: 0.7 }}>kWh/m²</span>
                        </span>
                        {sub > 0 && (
                          <span className="stat sub">
                            −{fmt.CHFk(sub)} <b>Förd.</b>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* CANVAS */}
        <div className="canvas-wrap blueprint-bg">
          <div className="canvas-head">
            <span className="ch-title">
              <b>{hasPlan ? "Your floor plan" : "Grundriss"}</b> · {listing.type}
            </span>
            <div className="spacer" style={{ flex: 1 }}></div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              style={{ display: "none" }}
              onChange={uploadPlan}
            />
            {hasPlan ? (
              <button className="btn ghost sm" onClick={onClearPlan}>
                ✕ Use schematic
              </button>
            ) : (
              <button
                className="btn sm"
                onClick={() => fileRef.current?.click()}
                disabled={vecStatus === "loading"}
              >
                {vecStatus === "loading" ? "Reading plan…" : "⤓ Upload floor plan"}
              </button>
            )}
            {activeSystems.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {activeSystems.map((u) => (
                  <span key={u.id} className="stat sub" style={{ fontSize: 10 }}>
                    {u.short}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="canvas-stage">
            {hasPlan ? (
              <PlanOverlay
                img={planImg ?? ""}
                rooms={planRooms!}
                state={state}
                view={view}
                selectedRoom={selRoom}
                onSelectRoom={(id) => setSelRoom(id === selRoom ? null : id)}
              />
            ) : (
              <FloorPlan
                listing={listing}
                state={state}
                view={view}
                selectedRoom={selRoom}
                onSelectRoom={(id) => setSelRoom(id === selRoom ? null : id)}
              />
            )}

            <div className="legend">
              {hasPlan ? (
                <>
                  <span className="li">
                    <span className="sw" style={{ background: "var(--bg-2)", border: "1px solid var(--line-2)" }}></span> Detected room
                  </span>
                  <span className="li" style={{ color: "var(--faint)" }}>
                    Read from your plan by AI · click a room to set its finish
                  </span>
                </>
              ) : (
                <>
                  <span className="li">
                    <span className="sw" style={{ background: "var(--bg-2)", border: "1px solid var(--line-2)" }}></span> Room
                  </span>
                  <span className="li">
                    <span className="marker-key">WP</span> Heat pump
                  </span>
                  <span className="li">
                    <span className="marker-key" style={{ background: "var(--purple)" }}>
                      LÜ
                    </span>{" "}
                    Ventilation
                  </span>
                  <span className="li">
                    <span className="sw" style={{ background: "var(--green)" }}></span> Insulation
                  </span>
                  <span className="li" style={{ color: "var(--faint)" }}>
                    Click a room to change its finish · or upload your real plan
                  </span>
                </>
              )}
            </div>
            {vecStatus === "error" && (
              <div className="plan-err">{vecErr}</div>
            )}

            {/* finish picker */}
            {room && (
              <div className="finish-bar">
                <div className="fb-head">
                  <div className="t">
                    Finish · <b>{room.name}</b>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span className="area">{room.area} m²</span>
                    <button className="btn ghost sm" onClick={() => setSelRoom(null)}>
                      ✕
                    </button>
                  </div>
                </div>
                <div className="finish-opts">
                  {FINISHES.map((f) => {
                    const cur = (state.finishes[room.id] || "keep") === f.id;
                    return (
                      <div key={f.id} className={"finish-opt" + (cur ? " on" : "")} onClick={() => onSetFinish(room.id, f.id)}>
                        <div className="sw" style={{ background: f.swatch }}></div>
                        <div className="nm">{f.name}</div>
                        <div className="pm">{f.perM2 ? "CHF " + f.perM2 + "/m²" : "—"}</div>
                        {f.eco && <div className="eco">● LOW-CO₂</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* LEDGER */}
        <div className="ledger">
          <div className="ledger-scroll">
            <div className="ledger-head">
              <h3>Impact ledger</h3>
              <span className="live">
                <span className="blip"></span> live
              </span>
            </div>

            {/* GEAK */}
            <div className="geak-block">
              <div className="gb-top">
                <span className="lab">Energy rating · GEAK</span>
                <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: "var(--green-2)" }}>
                  {computed.baseGrade} → {computed.newGrade}
                </span>
              </div>
              <div className="geak-scale">
                {grades.map((g) => {
                  const isNow = g === computed.newGrade;
                  const isBase = g === computed.baseGrade;
                  return (
                    <div key={g} className={"s gb-" + g + (isNow || isBase ? " lit" : "") + (isNow ? " now" : "")}>
                      {isBase && !isNow && <span className="tag">heute</span>}
                      {isNow && <span className="tag">neu</span>}
                      {g}
                    </div>
                  );
                })}
              </div>
              <div className={"minergie-chip" + (computed.minergie ? "" : " none")}>
                <span className="star">{computed.minergie ? "◆" : "◇"}</span>
                {computed.minergie ? computed.minergie : "Minergie — add envelope + ventilation"}
              </div>
            </div>

            {/* energy + carbon */}
            <div className="metric">
              <span className="k">Energy use</span>
              <span className="v">
                <AnimatedNum value={computed.energyUse} /> <span style={{ fontWeight: 400, color: "var(--faint)" }}>kWh/m²</span>
              </span>
              <span className="d good">
                {computed.energyReduction > 0 ? "▼" + Math.round((computed.energyReduction / computed.baseEnergy) * 100) + "%" : "—"}
              </span>
            </div>
            <div className="metric">
              <span className="k">CO₂ emissions</span>
              <span className="v">
                <AnimatedNum value={computed.co2} digits={1} /> <span style={{ fontWeight: 400, color: "var(--faint)" }}>t/yr</span>
              </span>
              <span className="d good">
                {computed.co2Reduction > 0 ? "▼" + Math.round((computed.co2Reduction / computed.baseCO2) * 100) + "%" : "—"}
              </span>
            </div>

            {/* costs */}
            <div className="cost-block">
              <div className="cost-row">
                <span className="k">Systems &amp; envelope</span>
                <span className="v">
                  <AnimatedCHF value={computed.systemsCost} />
                </span>
              </div>
              <div className="cost-row">
                <span className="k">Interior finishes</span>
                <span className="v">
                  <AnimatedCHF value={computed.finishCost} />
                </span>
              </div>
              <div className="cost-row sub">
                <span className="k">− Subsidies &amp; grants</span>
                <span className="v">
                  −<AnimatedCHF value={computed.subsidyTotal} prefix="CHF " />
                </span>
              </div>
              <div className="cost-row total">
                <span className="k">Net to finance</span>
                <span className="v">
                  <AnimatedCHF value={computed.financed} />
                </span>
              </div>
              <div className="cost-row">
                <span className="k">Est. value uplift</span>
                <span className="v" style={{ color: "var(--green-2)" }}>
                  +<AnimatedCHF value={computed.valueUplift} prefix="CHF " />
                </span>
              </div>
            </div>

            {/* net monthly */}
            <div className="net-hero">
              <span className="k">Net monthly impact</span>
              <span className="v">
                {computed.netMonthly >= 0 ? "+" : "−"}
                <AnimatedNum value={Math.abs(computed.netMonthly)} /> <small>/mo</small>
              </span>
            </div>
            <p className="assump">
              ~2% interest on the post-subsidy amount, net of energy savings (~CHF {computed.monthlyEnergySaving}/mo from
              real per-carrier prices). Subsidies modelled on Gebäudeprogramm / HFM 2015 (Kanton ZH) &amp; Pronovo —
              indicative, not an offer.
            </p>
          </div>

          <div className="ledger-foot">
            <button className="btn primary" onClick={onOpenSummary}>
              Build the dossier →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
