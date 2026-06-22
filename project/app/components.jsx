/* Shared UI primitives — exported to window for the other babel scripts */
const { useState, useEffect, useRef } = React;

/* animate a number toward its target on change */
function useAnimatedNumber(value, duration = 500) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef(null);
  const rafRef = useRef(null);
  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    startRef.current = null;
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const tick = (ts) => {
      if (startRef.current === null) startRef.current = ts;
      const p = Math.min(1, (ts - startRef.current) / duration);
      const cur = from + (to - from) * ease(p);
      setDisplay(cur);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else { fromRef.current = to; setDisplay(to); }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);
  return display;
}

/* big animated CHF / number */
function AnimatedCHF({ value, prefix = "CHF ", suffix = "" }) {
  const d = useAnimatedNumber(value);
  return React.createElement(React.Fragment, null,
    prefix, Math.round(d).toLocaleString("de-CH"), suffix);
}
function AnimatedNum({ value, digits = 0, suffix = "" }) {
  const d = useAnimatedNumber(value);
  const v = digits ? d.toFixed(digits) : Math.round(d).toLocaleString("de-CH");
  return React.createElement(React.Fragment, null, v, suffix);
}

function GeakBadge({ grade, size = 22 }) {
  return (
    <span className={"badge gb-" + grade}
      style={{ width: size, height: size, fontSize: size * 0.55 }}>
      {grade}
    </span>
  );
}

function GeakChip({ grade, label }) {
  return (
    <span className="geak-chip">
      <GeakBadge grade={grade} />
      {label && <span style={{ color: "var(--faint)" }}>{label}</span>}
    </span>
  );
}

function Brand() {
  return (
    <div className="brand">
      <div className="glyph"></div>
      <div className="name">Sustainable<span> Swiss Home</span></div>
    </div>
  );
}

function Steps({ current }) {
  const order = ["discover", "reimagine", "connect"];
  const labels = { discover: "Discover", reimagine: "Reimagine", connect: "Connect" };
  const ci = order.indexOf(current === "summary" ? "connect" : current);
  return (
    <div className="steps">
      {order.map((s, i) => (
        <React.Fragment key={s}>
          {i > 0 && <span className="sep">›</span>}
          <span className={"step " + (i === ci ? "on" : i < ci ? "done" : "")}>
            {i < ci ? "✓ " : ""}{labels[s]}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

Object.assign(window, { useAnimatedNumber, AnimatedCHF, AnimatedNum, GeakBadge, GeakChip, Brand, Steps });
