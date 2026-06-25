"use client";
/* Shared UI primitives — ported from project/app/components.jsx */
import React, { useState, useEffect, useRef } from "react";
import { fmt, type Grade } from "@/app/lib/data";

/* animate a number toward its target on change */
export function useAnimatedNumber(value: number, duration = 500): number {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    startRef.current = null;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const tick = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const p = Math.min(1, (ts - startRef.current) / duration);
      const cur = from + (to - from) * ease(p);
      setDisplay(cur);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else {
        fromRef.current = to;
        setDisplay(to);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);
  return display;
}

/* big animated CHF / number */
export function AnimatedCHF({ value, prefix = "CHF ", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const d = useAnimatedNumber(value);
  return (
    <>
      {prefix}
      {fmt.group(d)}
      {suffix}
    </>
  );
}

export function AnimatedNum({ value, digits = 0, suffix = "" }: { value: number; digits?: number; suffix?: string }) {
  const d = useAnimatedNumber(value);
  const v = digits ? d.toFixed(digits) : fmt.group(d);
  return (
    <>
      {v}
      {suffix}
    </>
  );
}

export function GeakBadge({ grade, size = 22 }: { grade: Grade; size?: number }) {
  return (
    <span className={"badge gb-" + grade} style={{ width: size, height: size, fontSize: size * 0.55 }}>
      {grade}
    </span>
  );
}

export function GeakChip({ grade, label }: { grade: Grade; label?: string }) {
  return (
    <span className="geak-chip">
      <GeakBadge grade={grade} />
      {label && <span style={{ color: "var(--faint)" }}>{label}</span>}
    </span>
  );
}

export function Brand() {
  return (
    <div className="brand">
      <div className="glyph"></div>
      <div className="name">
        Sustainable<span> Swiss Home</span>
      </div>
    </div>
  );
}

export function Steps({ current }: { current: string }) {
  const order = ["discover", "reimagine", "connect"];
  const labels: Record<string, string> = { discover: "Discover", reimagine: "Reimagine", connect: "Connect" };
  const ci = order.indexOf(current === "summary" ? "connect" : current);
  return (
    <div className="steps">
      {order.map((s, i) => (
        <React.Fragment key={s}>
          {i > 0 && <span className="sep">›</span>}
          <span className={"step " + (i === ci ? "on" : i < ci ? "done" : "")}>
            {i < ci ? "✓ " : ""}
            {labels[s]}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}
