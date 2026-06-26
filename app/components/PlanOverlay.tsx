"use client";
/* PlanOverlay — the user's REAL floor plan with vision-detected rooms drawn on top.
   Rooms are positioned by their normalized bounding boxes; each is clickable to pick
   an interior finish (which colours it in the "after" view). */
import React from "react";
import { finishById, type PlanState, type DetectedRoom } from "@/app/lib/data";

interface PlanOverlayProps {
  img: string; // data URL, or "" for PDFs (rooms drawn on a neutral backdrop)
  rooms: DetectedRoom[];
  state: PlanState;
  view: string;
  selectedRoom: string | null;
  onSelectRoom: (id: string) => void;
}

export function PlanOverlay({ img, rooms, state, view, selectedRoom, onSelectRoom }: PlanOverlayProps) {
  const after = view === "after";
  return (
    <div className={"plan-overlay" + (img ? "" : " no-img")}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {img && <img src={img} alt="Your floor plan" className="plan-img" />}
      {rooms.map((r, i) => {
        const id = `det-${i}`;
        const fid = state.finishes[id] || "keep";
        const f = finishById(fid);
        const colored = after && fid !== "keep";
        const isSel = selectedRoom === id;
        return (
          <div
            key={id}
            className={"plan-room" + (isSel ? " sel" : "") + (colored ? " has-finish" : "")}
            style={{
              left: `${r.x * 100}%`,
              top: `${r.y * 100}%`,
              width: `${r.w * 100}%`,
              height: `${r.h * 100}%`,
              background: colored ? f.swatch : undefined,
            }}
            onClick={() => onSelectRoom(id)}
            title={`${r.name} · ${Math.round(r.area_m2)} m²`}
          >
            <span className="pr-label">{r.name}</span>
            <span className="pr-area">
              {Math.round(r.area_m2)} m²{colored ? " · " + f.name : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}
