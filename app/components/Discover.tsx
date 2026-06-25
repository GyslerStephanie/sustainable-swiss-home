"use client";
/* Discover — zipcode search, schematic Zürich map with pins, listing cards */
import React from "react";
import { listings as ALL, fmt, geak, type Listing } from "@/app/lib/data";
import { Brand, Steps, GeakChip } from "./primitives";
import { MapView } from "./MapView";

interface DiscoverProps {
  zip: string;
  onZip: (zip: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onProceed: () => void;
  extraListing: Listing | null;
  onExternalListing: (l: Listing) => void;
}

export function Discover({
  zip,
  onZip,
  selectedId,
  onSelect,
  onProceed,
  extraListing,
  onExternalListing,
}: DiscoverProps) {
  const all = ALL;
  const matched = all.filter((l) => l.zip.startsWith(zip.trim()));
  // a GWR-looked-up building (if any) leads the list and appears on the map
  const matches = extraListing
    ? [extraListing, ...matched.filter((m) => m.id !== extraListing.id)]
    : matched;
  const sel = matches.find((l) => l.id === selectedId);

  // GWR address lookup
  const [addr, setAddr] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "loading" | "error">("idle");
  const [errMsg, setErrMsg] = React.useState("");

  async function runLookup(query: string, notFound: string) {
    if (status === "loading") return;
    setStatus("loading");
    setErrMsg("");
    try {
      const res = await fetch(`/api/building?${query}`);
      const data = await res.json();
      if (!res.ok || !data.listing) throw new Error(data.error || notFound);
      onExternalListing(data.listing as Listing);
      setStatus("idle");
    } catch (e) {
      setStatus("error");
      setErrMsg(e instanceof Error ? e.message : "Lookup failed");
    }
  }
  function lookup() {
    const q = addr.trim();
    if (!q) return;
    runLookup(`address=${encodeURIComponent(q)}`, "No building found");
  }
  function pickBuilding(lng: number, lat: number) {
    runLookup(`lat=${lat}&lng=${lng}`, "No building at that spot — try clicking a roof");
  }

  return (
    <div className="discover">
      <div className="topbar">
        <Brand />
        <div style={{ width: 1, height: 26, background: "var(--line)" }}></div>
        <Steps current="discover" />
        <div className="spacer"></div>
        <span className="mono" style={{ fontSize: 11, color: "var(--faint)" }}>
          GWR · sonnendach · swisstopo basemap
        </span>
      </div>

      <div className="discover-body">
        {/* MAP */}
        <div className="map-wrap">
          <MapView listings={matches} selectedId={selectedId} onSelect={onSelect} onPick={pickBuilding} />
          <div className="map-overlay-label">
            {status === "loading" ? "Looking up building…" : "Click any building in Switzerland to reimagine it"}
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

            <div className="gwr-lookup">
              <div className="gwr-label">Don&apos;t see your place? Look up any Swiss address — or click it on the map</div>
              <div className="gwr-row">
                <input
                  value={addr}
                  placeholder="e.g. Seefeldstrasse 142, 8008 Zürich"
                  onChange={(e) => setAddr(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && lookup()}
                />
                <button className="btn sm" onClick={lookup} disabled={status === "loading"}>
                  {status === "loading" ? "Looking up…" : "Look up"}
                </button>
              </div>
              {status === "error" && <div className="gwr-err">{errMsg} — try “Street No, PLZ Town”.</div>}
              <div className="gwr-hint">Pulls official building facts from the federal register (GWR).</div>
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
                  {l.solar && (
                    <span
                      className="solar-chip"
                      title={`Suitable roof area ≈ ${l.solar.areaM2} m² · sonnendach suitability ${l.solar.klasse}/5`}
                    >
                      ☀ {l.solar.kwhYr.toLocaleString("de-CH")} kWh/yr roof solar
                    </span>
                  )}
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
