/* Root app — routing, lifted plan state, localStorage persistence */
const { useState, useEffect } = React;
const LS_KEY = "ssh_proto_v1";

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

function App() {
  const saved = loadState();
  const [screen, setScreen] = useState(saved?.screen || "discover");
  const [zip, setZip] = useState(saved?.zip ?? "80");
  const [selectedId, setSelectedId] = useState(saved?.selectedId || null);
  const [view, setView] = useState(saved?.view || "after");
  const [plan, setPlan] = useState(saved?.plan || { systems: [], finishes: {} });

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ screen, zip, selectedId, view, plan }));
    } catch (e) {}
  }, [screen, zip, selectedId, view, plan]);

  const listing = window.SSH.listings.find(l => l.id === selectedId) || null;
  const computed = listing ? window.SSH.computePlan(listing, plan) : null;

  const toggleSystem = (id) => setPlan(p => ({
    ...p,
    systems: p.systems.includes(id) ? p.systems.filter(s => s !== id) : [...p.systems, id]
  }));
  const setFinish = (roomId, fid) => setPlan(p => ({
    ...p, finishes: { ...p.finishes, [roomId]: fid }
  }));

  const proceed = () => { setView("after"); setScreen("reimagine"); window.scrollTo(0, 0); };

  if (screen === "discover") {
    return <Discover zip={zip} onZip={setZip} selectedId={selectedId}
      onSelect={setSelectedId} onProceed={proceed} />;
  }
  if (!listing) { // safety: no listing selected
    return <Discover zip={zip} onZip={setZip} selectedId={selectedId}
      onSelect={setSelectedId} onProceed={proceed} />;
  }
  if (screen === "summary") {
    return <Summary listing={listing} state={plan} computed={computed}
      onBack={() => setScreen("reimagine")} onPrint={() => window.print()} />;
  }
  return <Reimagine listing={listing} state={plan} computed={computed}
    view={view} setView={setView}
    onToggleSystem={toggleSystem} onSetFinish={setFinish}
    onOpenSummary={() => { setScreen("summary"); }} onBack={() => setScreen("discover")} />;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
