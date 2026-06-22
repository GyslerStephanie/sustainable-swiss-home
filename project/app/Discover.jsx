/* Discover — zipcode search, schematic Zürich map with pins, listing cards */
function Discover({ zip, onZip, selectedId, onSelect, onProceed }) {
  const all = window.SSH.listings;
  const fmt = window.SSH.fmt;
  const matches = all.filter(l => l.zip.startsWith(zip.trim()));
  const sel = all.find(l => l.id === selectedId);

  return (
    <div className="discover">
      <div className="topbar">
        <Brand />
        <div style={{ width: 1, height: 26, background: "var(--line)" }}></div>
        <Steps current="discover" />
        <div className="spacer"></div>
        <span className="mono" style={{ fontSize: 11, color: "var(--faint)" }}>
          Prototype · mock Zürich data
        </span>
      </div>

      <div className="discover-body">
        {/* MAP */}
        <div className="map-pane blueprint-bg">
          <div className="map-canvas blueprint-bg"></div>
          <div className="water"></div>
          {/* a couple of schematic roads */}
          <div className="road" style={{ left: "8%", top: 0, width: 4, height: "70%", transform: "rotate(6deg)" }}></div>
          <div className="road" style={{ left: 0, top: "34%", width: "64%", height: 4, transform: "rotate(-4deg)" }}></div>
          <div className="road" style={{ left: "30%", top: 0, width: 4, height: "100%", transform: "rotate(-10deg)" }}></div>
          <div className="road" style={{ left: "10%", top: "55%", width: "80%", height: 4, transform: "rotate(3deg)" }}></div>

          <div className="map-overlay-label">Zürich · {matches.length} {matches.length === 1 ? "property" : "properties"}</div>

          {matches.map(l => (
            <div key={l.id}
              className={"pin" + (l.id === selectedId ? " sel" : "")}
              style={{ left: l.pin.x + "%", top: l.pin.y + "%" }}
              onClick={() => onSelect(l.id)}>
              <div className="dot"></div>
              <div className="price">{fmt.CHFk(l.price)}</div>
            </div>
          ))}
        </div>

        {/* LISTINGS */}
        <div className="listings-pane">
          <div className="listings-head">
            <h2>Find a place to reimagine</h2>
            <p>Pick a property below — you'll redesign it next.</p>
            <div className="zip-field">
              <span className="lbl">PLZ</span>
              <input value={zip} maxLength={4} inputMode="numeric"
                onChange={e => onZip(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="80…" />
              <span className="mono" style={{ fontSize: 11, color: "var(--faint)", paddingRight: 10 }}>
                {matches.length} ↓
              </span>
            </div>
          </div>

          <div className="listings-scroll">
            {matches.length === 0 && (
              <div style={{ textAlign: "center", color: "var(--faint)", padding: "30px 10px", fontSize: 13 }}>
                No properties for “{zip}”. Try <b>80</b>, <b>8008</b>, or <b>8003</b>.
              </div>
            )}
            {matches.map(l => (
              <div key={l.id}
                className={"listing-card" + (l.id === selectedId ? " sel" : "")}
                onClick={() => onSelect(l.id)}>
                <div className="lc-top">
                  <h3>{l.address}</h3>
                  <span className="lc-price">{fmt.CHF(l.price)}</span>
                </div>
                <div className="lc-meta">{l.zip} {l.district} · {l.type} · {l.area} m² · Bj. {l.year}</div>
                <p className="lc-blurb">{l.blurb}</p>
                <div className="lc-foot">
                  <GeakChip grade={window.SSH.geak.of(l.baseEnergy)} label={"heute · " + l.heating} />
                </div>
              </div>
            ))}
          </div>

          <div className="discover-cta">
            <div className="hint">
              {sel ? <span><b style={{ color: "var(--text)" }}>{sel.address}</b> selected</span>
                   : "Select a property to continue"}
            </div>
            <button className="btn primary" disabled={!sel}
              style={{ opacity: sel ? 1 : 0.45, pointerEvents: sel ? "auto" : "none" }}
              onClick={onProceed}>
              Reimagine this →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
window.Discover = Discover;
