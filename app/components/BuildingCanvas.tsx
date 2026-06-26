"use client";
/* BuildingCanvas — the REAL building, top-down.
   Renders the actual cadastre footprint (façade shape) when we have it, or an
   area-proportional fallback massing otherwise. Top-down: the footprint IS the
   roof and its outline IS the façade — so sustainable upgrades are shown where
   they physically act, and each is clickable to toggle. No fake interior. */
import React from "react";
import type { Listing, PlanState } from "@/app/lib/data";

interface BuildingCanvasProps {
  listing: Listing;
  state: PlanState;
  view: string;
  onToggleSystem: (id: string) => void;
}

const VB = 600;
const H = 480;

/* Project a WGS84 ring to centred, real-proportioned SVG points (y flipped). */
function projectFootprint(ring: [number, number][]): [number, number][] | null {
  if (!ring || ring.length < 3) return null;
  const lat0 = ring[0][1];
  const k = Math.cos((lat0 * Math.PI) / 180);
  const m = ring.map(([lng, lat]) => [lng * 111320 * k, lat * 110540] as [number, number]);
  const xs = m.map((p) => p[0]);
  const ys = m.map((p) => p[1]);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(...ys),
    maxY = Math.max(...ys);
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  // fit into a central box, leaving margins for the upgrade chips
  const boxW = 300,
    boxH = 240,
    cx = VB / 2,
    cy = H / 2;
  const scale = Math.min(boxW / w, boxH / h);
  return m.map(([x, y]) => [
    cx + (x - (minX + maxX) / 2) * scale,
    cy - (y - (minY + maxY) / 2) * scale, // flip: geo north is up
  ]);
}

/* Fallback: a rounded box proportioned by floor area (when no footprint). */
function fallbackBox(area: number): [number, number][] {
  const a = Math.max(40, area || 120);
  const side = Math.sqrt(a) * 11; // visual scale
  const w = Math.min(320, side * 1.25);
  const h = Math.min(240, side);
  const cx = VB / 2,
    cy = H / 2;
  return [
    [cx - w / 2, cy - h / 2],
    [cx + w / 2, cy - h / 2],
    [cx + w / 2, cy + h / 2],
    [cx - w / 2, cy + h / 2],
  ];
}

const ZONES = [
  { id: "roof", label: "Roof insulation", x: VB / 2, y: 38, anchor: "middle" as const },
  { id: "pv", label: "☀ Solar PV", x: VB - 18, y: 70, anchor: "end" as const },
  { id: "facade", label: "Façade insulation", x: 18, y: H / 2, anchor: "start" as const },
  { id: "windows", label: "Triple glazing", x: VB - 18, y: H / 2, anchor: "end" as const },
  { id: "heatpump", label: "Heat pump", x: 18, y: H - 26, anchor: "start" as const },
  { id: "mvhr", label: "Ventilation", x: VB - 18, y: H - 26, anchor: "end" as const },
];

export function BuildingCanvas({ listing, state, view, onToggleSystem }: BuildingCanvasProps) {
  const after = view === "after";
  const has = (id: string) => after && state.systems.includes(id);
  const on = (id: string) => state.systems.includes(id);

  const real = projectFootprint(listing.footprint as [number, number][]);
  const pts = real ?? fallbackBox(listing.area);
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") + " Z";
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;

  // edge midpoints for window glyphs
  const mids = pts.map((p, i) => {
    const q = pts[(i + 1) % pts.length];
    return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2] as [number, number];
  });

  return (
    <svg className="bld-svg" viewBox={`0 0 ${VB} ${H}`} xmlns="http://www.w3.org/2000/svg">
      {/* façade insulation halo (drawn behind the wall) */}
      {has("facade") && <path d={path} fill="none" stroke="var(--green)" strokeWidth={16} opacity={0.28} />}

      {/* roof / footprint body — top-down, the polygon is the roof */}
      <path
        d={path}
        fill={has("roof") ? "var(--green-soft)" : "#e9ece9"}
        stroke={has("facade") ? "var(--green)" : "var(--line-2)"}
        strokeWidth={has("facade") ? 3.5 : 2}
      />

      {/* PV panels on the roof */}
      {has("pv") &&
        [-1, 0, 1].map((r) =>
          [-1.5, -0.5, 0.5, 1.5].map((c) => (
            <rect
              key={`${r}-${c}`}
              x={cx + c * 26 - 11}
              y={cy + r * 20 - 8}
              width={22}
              height={16}
              rx={2}
              fill="var(--acc)"
              opacity={0.9}
            />
          ))
        )}

      {/* window glyphs on the façade edges */}
      {has("windows") &&
        mids.slice(0, 8).map((m, i) => (
          <circle key={i} cx={m[0]} cy={m[1]} r={5} fill="var(--acc)" stroke="#fff" strokeWidth={1.5} />
        ))}

      {/* system markers near the centre */}
      {has("heatpump") && (
        <g>
          <rect x={cx - 46} y={cy + 38} width={40} height={24} rx={6} fill="var(--acc)" />
          <text x={cx - 26} y={cy + 54} textAnchor="middle" fill="#fff" fontSize={11}>
            WP
          </text>
        </g>
      )}
      {has("mvhr") && (
        <g>
          <rect x={cx + 6} y={cy + 38} width={40} height={24} rx={6} fill="var(--purple)" />
          <text x={cx + 26} y={cy + 54} textAnchor="middle" fill="#fff" fontSize={11}>
            LÜ
          </text>
        </g>
      )}

      {/* centre label: real size */}
      <text x={cx} y={cy - 6} textAnchor="middle" className="bld-area">
        {listing.area} m²
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" className="bld-sub">
        {listing.floors ? `${listing.floors} Geschosse` : real ? "real footprint" : "≈ massing"}
      </text>

      {/* clickable upgrade zones */}
      {ZONES.map((z) => {
        const active = on(z.id);
        return (
          <g
            key={z.id}
            className="bld-zone"
            onClick={() => onToggleSystem(z.id)}
            style={{ cursor: "pointer" }}
          >
            <text
              x={z.x}
              y={z.y}
              textAnchor={z.anchor}
              className={"bld-chip" + (active ? " on" : "")}
            >
              {active ? "● " : "○ "}
              {z.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
