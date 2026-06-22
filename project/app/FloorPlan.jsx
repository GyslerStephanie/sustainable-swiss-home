/* FloorPlan — interactive SVG plan. Rooms selectable; finishes + systems render live. */
function FloorPlan({ listing, state, view, selectedRoom, onSelectRoom }) {
  const rooms = window.SSH.rooms;
  const finishById = window.SSH.finishById;
  const after = view === "after";
  const sys = state.systems;
  const has = (id) => after && sys.includes(id);

  const OX = 16, OY = 16, OW = 568, OH = 438; // outer wall box (within viewBox)

  return (
    <svg className="plan-svg" viewBox="0 -40 600 514" xmlns="http://www.w3.org/2000/svg">
      {/* roof annotation band */}
      <g>
        <rect x={OX} y={-30} width={OW} height={18} rx={5}
          fill={has("roof") ? "var(--green-soft)" : "var(--bg-4)"}
          stroke={has("roof") ? "var(--green)" : "var(--line-2)"} strokeWidth="1.5" />
        <text x={OX + 10} y={-17} className="rarea"
          style={{ fontSize: 10, fill: has("roof") ? "var(--green-2)" : "var(--faint)" }}>
          DACH {has("roof") ? "· gedämmt" : ""}
        </text>
        {has("pv") && [0,1,2,3,4,5].map(i => (
          <rect key={i} x={OX + OW - 130 + i*21} y={-28} width={17} height={13} rx={2}
            fill="var(--acc)" opacity={0.85} />
        ))}
        {has("pv") && (
          <text x={OX + OW - 138} y={-17} textAnchor="end" className="rarea"
            style={{ fontSize: 10, fill: "var(--acc-2)" }}>PV ☀</text>
        )}
      </g>

      {/* façade insulation wrap */}
      {has("facade") && (
        <rect x={OX - 7} y={OY - 7} width={OW + 14} height={OH + 14} rx={6}
          fill="none" stroke="var(--green)" strokeWidth="5" strokeDasharray="2 5"
          opacity="0.85" />
      )}

      {/* outer wall */}
      <rect className="wall-outer" x={OX} y={OY} width={OW} height={OH} rx={3} />

      {/* rooms */}
      {rooms.map(r => {
        const fid = state.finishes[r.id] || "keep";
        const f = finishById(fid);
        const isSel = selectedRoom === r.id;
        let fill = "var(--bg-2)";
        if (after && r.finish && fid !== "keep") fill = f.swatch;
        else if (isSel) fill = "var(--acc-soft)";
        const fillOpacity = (after && r.finish && fid !== "keep") ? 0.5 : 1;
        return (
          <g key={r.id} className={"room" + (isSel ? " sel" : "")}
            onClick={() => r.finish && onSelectRoom(r.id)}
            style={{ cursor: r.finish ? "pointer" : "default" }}>
            <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={2}
              fill={fill} fillOpacity={fillOpacity} />
            <rect className="rstroke" x={r.x} y={r.y} width={r.w} height={r.h} rx={2} />
            <text className="rlabel" x={r.x + r.w / 2} y={r.y + r.h / 2 - 2}
              textAnchor="middle">{r.name}</text>
            <text className="rarea" x={r.x + r.w / 2} y={r.y + r.h / 2 + 14}
              textAnchor="middle">{r.area} m²{after && r.finish && fid !== "keep" ? " · " + f.name : ""}</text>
          </g>
        );
      })}

      {/* window glyphs when triple glazing active */}
      {has("windows") && [
        { x: OX + OW*0.5 - 26, y: OY - 3, w: 52, h: 6 },         // top
        { x: OX + OW*0.78 - 26, y: OY - 3, w: 52, h: 6 },        // top-right
        { x: OX - 3, y: OY + OH*0.6 - 26, w: 6, h: 52 },         // left
        { x: OX + OW - 3, y: OY + OH*0.4 - 26, w: 6, h: 52 },    // right
        { x: OX + OW*0.3 - 26, y: OY + OH - 3, w: 52, h: 6 },    // bottom
        { x: OX + OW*0.7 - 26, y: OY + OH - 3, w: 52, h: 6 }
      ].map((g, i) => (
        <rect key={i} x={g.x} y={g.y} width={g.w} height={g.h} rx={2}
          fill="var(--acc)" opacity="0.9" />
      ))}

      {/* technical-room system markers */}
      {has("heatpump") && (
        <g className="sys-marker">
          <rect x={478} y={170} width={42} height={26} rx={7} fill="var(--acc)" />
          <text x={499} y={187} textAnchor="middle" fill="#fff" fontSize="11">WP</text>
        </g>
      )}
      {has("mvhr") && (
        <g className="sys-marker">
          <rect x={528} y={170} width={42} height={26} rx={7} fill="var(--purple)" />
          <text x={549} y={187} textAnchor="middle" fill="#fff" fontSize="11">LÜ</text>
        </g>
      )}
    </svg>
  );
}
window.FloorPlan = FloorPlan;
