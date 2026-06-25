"use client";
/* Discover — zipcode search, schematic Zürich map with pins, listing cards */
import React from "react";
import { listings as ALL, fmt, geak } from "@/app/lib/data";
import { Brand, Steps, GeakChip } from "./primitives";
import { MapView } from "./MapView";

interface DiscoverProps {
  zip: string;
  onZip: (zip: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onProceed: () => void;
}

export function Discover({ zip, onZip, selectedId, onSelect, onProceed }: DiscoverProps) {
  const all = ALL;
  const matches = all.filter((l) => l.zip.startsWith(zip.trim()));
  const sel = all.find((l) => l.id === selectedId);

  return (
    <div className="discover">
      <div className="topbar">
        <Brand />
        <div style={{ width: 1, height: 26, background: "var(--line)" }}></div>
        <Steps current="discover" />
        <div className="spacer"></div>
        <span className="mono" style={{ fontSize: 11, color: "var(--faint)" }}>
          Seed Zürich data · swisstopo basemap
        </span>
      </div>

      <div className="discover-body">
        {/* MAP */}
        <div className="map-wrap">
          <MapView listings={matches} selectedId={selectedId} onSelect={onSelect} />
          <div className="map-overlay-label">
            Zürich · {matches.length} {matches.length === 1 ? "property" : "properties"}
          </div>
        </div>

        {/* LISTINGS */}
        <div className="listings-pane">
          <div className="listings-head">
            <h2>Find a place to reimagine</h2>
            <p>Pick a property below — you&apos;ll redesign it next.</p>
            <div className="zip-field">
              <span className="lbl">PLZ</span>
              <input
                value={zip}
                maxLength={4}
                inputMode="numeric"
                onChange={(e) => onZip(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="80…"
              />
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
            {matches.map((l) => (
              <div key={l.id} className={"listing-card" + (l.id === selectedId ? " sel" : "")} onClick={() => onSelect(l.id)}>
                <div className="lc-top">
                  <h3>{l.address}</h3>
                  <span className="lc-price">{fmt.CHF(l.price)}</span>
                </div>
                <div className="lc-meta">
                  {l.zip} {l.district} · {l.type} · {l.area} m² · Bj. {l.year}
                </div>
                <p className="lc-blurb">{l.blurb}</p>
                <div className="lc-foot">
                  <GeakChip grade={geak.of(l.baseEnergy)} label={"heute · " + l.heating} />
                </div>
              </div>
            ))}
          </div>

          <div className="discover-cta">
            <div className="hint">
              {sel ? (
                <span>
                  <b style={{ color: "var(--text)" }}>{sel.address}</b> selected
                </span>
              ) : (
                "Select a property to continue"
              )}
            </div>
            <button
              className="btn primary"
              disabled={!sel}
              style={{ opacity: sel ? 1 : 0.45, pointerEvents: sel ? "auto" : "none" }}
              onClick={onProceed}
            >
              Reimagine this →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
