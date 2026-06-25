"use client";
/* Root app — routing, lifted plan state, localStorage persistence.
   Ported from project/app/app.jsx */
import React, { useState, useEffect } from "react";
import { listings, computePlan, type PlanState, type Listing } from "@/app/lib/data";
import { decodeShare } from "@/app/lib/share";
import { Discover } from "./Discover";
import { Reimagine } from "./Reimagine";
import { Summary } from "./Summary";

const LS_KEY = "ssh_proto_v1";

interface SavedState {
  screen?: string;
  zip?: string;
  selectedId?: string | null;
  view?: string;
  plan?: PlanState;
}

function loadState(): SavedState | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return null;
}

export function AppRoot() {
  // Hydrate from localStorage after mount to keep SSR markup deterministic.
  const [hydrated, setHydrated] = useState(false);
  const [screen, setScreen] = useState("discover");
  const [zip, setZip] = useState("80");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState("after");
  const [plan, setPlan] = useState<PlanState>({ systems: [], finishes: {} });
  // a building pulled live from the GWR (not in the seed list)
  const [external, setExternal] = useState<Listing | null>(null);

  useEffect(() => {
    // A shared link (#plan=…) wins over local state — open its dossier directly.
    const m = window.location.hash.match(/[#&]plan=([^&]+)/);
    const shared = m ? decodeShare(decodeURIComponent(m[1])) : null;
    if (shared) {
      if (shared.ext) {
        setExternal(shared.ext);
        setSelectedId(shared.ext.id);
      } else if (shared.id) {
        setSelectedId(shared.id);
      }
      setPlan(shared.plan);
      setScreen("summary");
      // clean the URL so a later reload doesn't pin the shared view
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      setHydrated(true);
      return;
    }

    const saved = loadState();
    if (saved) {
      setScreen(saved.screen || "discover");
      setZip(saved.zip ?? "80");
      setSelectedId(saved.selectedId || null);
      setView(saved.view || "after");
      setPlan(saved.plan || { systems: [], finishes: {} });
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ screen, zip, selectedId, view, plan }));
    } catch {
      /* ignore */
    }
  }, [hydrated, screen, zip, selectedId, view, plan]);

  const listing =
    (external && external.id === selectedId ? external : listings.find((l) => l.id === selectedId)) || null;
  const computed = listing ? computePlan(listing, plan) : null;

  const onExternalListing = (l: Listing) => {
    setExternal(l);
    setSelectedId(l.id);
  };

  const toggleSystem = (id: string) =>
    setPlan((p) => ({
      ...p,
      systems: p.systems.includes(id) ? p.systems.filter((s) => s !== id) : [...p.systems, id],
    }));
  const setFinish = (roomId: string, fid: string) =>
    setPlan((p) => ({
      ...p,
      finishes: { ...p.finishes, [roomId]: fid },
    }));

  const proceed = () => {
    setView("after");
    setScreen("reimagine");
    window.scrollTo(0, 0);
  };

  if (screen === "discover" || !listing) {
    return (
      <Discover
        zip={zip}
        onZip={setZip}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onProceed={proceed}
        extraListing={external}
        onExternalListing={onExternalListing}
      />
    );
  }
  if (screen === "summary" && computed) {
    return (
      <Summary
        listing={listing}
        state={plan}
        computed={computed}
        onBack={() => setScreen("reimagine")}
        onPrint={() => window.print()}
      />
    );
  }
  return (
    <Reimagine
      listing={listing}
      state={plan}
      computed={computed!}
      view={view}
      setView={setView}
      onToggleSystem={toggleSystem}
      onSetFinish={setFinish}
      onOpenSummary={() => setScreen("summary")}
      onBack={() => setScreen("discover")}
    />
  );
}
