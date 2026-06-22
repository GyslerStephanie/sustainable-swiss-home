/* Reimagine — the core workspace: upgrade catalog · floor-plan canvas · live ledger */
function Reimagine({ listing, state, computed, view, setView, onToggleSystem, onSetFinish, onOpenSummary, onBack }) {
  const { useState } = React;
  const SSH = window.SSH;
  const fmt = SSH.fmt;
  const [selRoom, setSelRoom] = useState(null);
  const area = listing.area;

  const groups = [
    { id: "envelope", label: "Building envelope" },
    { id: "systems", label: "Heating & air" },
    { id: "energy", label: "Energy generation" }
  ];
  const costOf = (u) => u.cost.fixed + u.cost.perM2 * area;
  const subOf = (u) => Math.min(costOf(u) * u.subsidyRate, u.subsidyCap);

  const activeSystems = SSH.upgrades.filter(u => state.systems.includes(u.id));
  const room = selRoom ? SSH.rooms.find(r => r.id === selRoom) : null;
  const grades = SSH.geak.grades;

  return (
    <div className="workspace">
      {/* TOP BAR */}
      <div className="topbar">
        <button className="btn ghost sm" onClick={onBack}>← Discover</button>
        <Brand />
        <div style={{ width: 1, height: 26, background: "var(--line)" }}></div>
        <div className="ws-prop">
          <span className="addr">{listing.address}</span>
          <span className="sub">{listing.zip} {listing.district} · {listing.area} m² · Bj. {listing.year}</span>
        </div>
        <div className="ws-grade" style={{ marginLeft: 8 }}>
          <GeakBadge grade={computed.baseGrade} size={26} />
          <span className="arrow">→</span>
          <GeakBadge grade={computed.newGrade} size={30} />
        </div>
        <div className="spacer"></div>
        <div className="segmented">
          <button className={view === "before" ? "active" : ""} onClick={() => setView("before")}>Before</button>
          <button className={view === "after" ? "active" : ""} onClick={() => setView("after")}>After</button>
        </div>
        <button className="btn primary" onClick={onOpenSummary}>Plan summary →</button>
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
            {groups.map(g => (
              <div key={g.id}>
                <div className="cat-group-label">{g.label}</div>
                {SSH.upgrades.filter(u => u.group === g.id).map(u => {
                  const on = state.systems.includes(u.id);
                  const sub = subOf(u);
                  return (
                    <div key={u.id} className={"up-card" + (on ? " on" : "")}
                      onClick={() => onToggleSystem(u.id)}>
                      <div className="uc-top">
                        <div className="check"></div>
                        <div className="uc-title">
                          <div className="n">{u.name}</div>
                          <div className="de">{u.short}</div>
                        </div>
                      </div>
                      <div className="uc-desc">{u.desc}</div>
                      <div className="uc-stats">
                        <span className="stat cost"><b>{fmt.CHFk(costOf(u))}</b></span>
                        <span className="stat energy">−{u.energy} <span style={{opacity:.7}}>kWh/m²</span></span>
                        {sub > 0 && <span className="stat sub">−{fmt.CHFk(sub)} <b>Förd.</b></span>}
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
            <span className="ch-title"><b>Grundriss</b> · {listing.type}</span>
            <div className="spacer" style={{ flex: 1 }}></div>
            {activeSystems.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {activeSystems.map(u => (
                  <span key={u.id} className="stat sub" style={{ fontSize: 10 }}>{u.short}</span>
                ))}
              </div>
            )}
          </div>

          <div className="canvas-stage">
            <FloorPlan listing={listing} state={state} view={view}
              selectedRoom={selRoom} onSelectRoom={(id) => setSelRoom(id === selRoom ? null : id)} />

            <div className="legend">
              <span className="li"><span className="sw" style={{ background: "var(--bg-2)", border: "1px solid var(--line-2)" }}></span> Room</span>
              <span className="li"><span className="marker-key">WP</span> Heat pump</span>
              <span className="li"><span className="marker-key" style={{ background: "var(--purple)" }}>LÜ</span> Ventilation</span>
              <span className="li"><span className="sw" style={{ background: "var(--green)" }}></span> Insulation</span>
              <span className="li" style={{ color: "var(--faint)" }}>Click a room to change its finish</span>
            </div>

            {/* finish picker */}
            {room && (
              <div className="finish-bar">
                <div className="fb-head">
                  <div className="t">Finish · <b>{room.name}</b></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span className="area">{room.area} m²</span>
                    <button className="btn ghost sm" onClick={() => setSelRoom(null)}>✕</button>
                  </div>
                </div>
                <div className="finish-opts">
                  {SSH.finishes.map(f => {
                    const cur = (state.finishes[room.id] || "keep") === f.id;
                    return (
                      <div key={f.id} className={"finish-opt" + (cur ? " on" : "")}
                        onClick={() => onSetFinish(room.id, f.id)}>
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
              <span className="live"><span className="blip"></span> live</span>
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
                {grades.map(g => {
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
              <span className="v"><AnimatedNum value={computed.energyUse} /> <span style={{ fontWeight: 400, color: "var(--faint)" }}>kWh/m²</span></span>
              <span className="d good">{computed.energyReduction > 0 ? "▼" + Math.round((computed.energyReduction/computed.baseEnergy)*100) + "%" : "—"}</span>
            </div>
            <div className="metric">
              <span className="k">CO₂ emissions</span>
              <span className="v"><AnimatedNum value={computed.co2} digits={1} /> <span style={{ fontWeight: 400, color: "var(--faint)" }}>t/yr</span></span>
              <span className="d good">{computed.co2Reduction > 0 ? "▼" + Math.round((computed.co2Reduction/computed.baseCO2)*100) + "%" : "—"}</span>
            </div>

            {/* costs */}
            <div className="cost-block">
              <div className="cost-row">
                <span className="k">Systems &amp; envelope</span>
                <span className="v"><AnimatedCHF value={computed.systemsCost} /></span>
              </div>
              <div className="cost-row">
                <span className="k">Interior finishes</span>
                <span className="v"><AnimatedCHF value={computed.finishCost} /></span>
              </div>
              <div className="cost-row sub">
                <span className="k">− Subsidies &amp; grants</span>
                <span className="v">−<AnimatedCHF value={computed.subsidyTotal} prefix="CHF " /></span>
              </div>
              <div className="cost-row total">
                <span className="k">Net to finance</span>
                <span className="v"><AnimatedCHF value={computed.financed} /></span>
              </div>
              <div className="cost-row">
                <span className="k">Est. value uplift</span>
                <span className="v" style={{ color: "var(--green-2)" }}>+<AnimatedCHF value={computed.valueUplift} prefix="CHF " /></span>
              </div>
            </div>

            {/* net monthly */}
            <div className="net-hero">
              <span className="k">Net monthly impact</span>
              <span className="v">{computed.netMonthly >= 0 ? "+" : "−"}<AnimatedNum value={Math.abs(computed.netMonthly)} /> <small>/mo</small></span>
            </div>
            <p className="assump">
              Financed at ~2% incl. light amortization, net of energy savings (~CHF {computed.monthlyEnergySaving}/mo).
              Subsidies indicative (Gebäudeprogramm, Kanton ZH, Pronovo). Figures for orientation, not an offer.
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
window.Reimagine = Reimagine;
