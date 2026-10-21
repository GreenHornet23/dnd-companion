import { useEffect } from "react";
import { NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useStore } from "./lib/store";
import { useSync } from "./lib/syncStatus";
import { UpdateBanner } from "./components/UpdateBanner";
import { DialogHost } from "./components/ui";
import Campaigns from "./pages/Campaigns";
import Dashboard from "./pages/Dashboard";
import Characters from "./pages/Characters";
import CharacterSheet from "./pages/CharacterSheet";
import LogPage from "./pages/LogPage";
import Quests from "./pages/Quests";
import Npcs from "./pages/Npcs";
import MapPage from "./pages/MapPage";
import MapEditor from "./pages/MapEditor";
import Manuals from "./pages/Manuals";
import Settings from "./pages/Settings";

const NAV = [
  { to: "/dashboard", icon: "🏰", label: "Campagna" },
  { to: "/characters", icon: "🛡️", label: "Personaggi" },
  { to: "/log", icon: "📜", label: "Diario" },
  { to: "/quests", icon: "❗", label: "Quest" },
  { to: "/npcs", icon: "🎭", label: "PNG" },
  { to: "/map", icon: "🗺️", label: "Mappa" },
  { to: "/manuals", icon: "📚", label: "Manuali" },
  { to: "/settings", icon: "⚙️", label: "Impostazioni" },
];

export default function App() {
  const ready = useStore((s) => s.ready);
  const init = useStore((s) => s.init);
  const campaign = useStore((s) => s.campaigns.find((c) => c.id === s.activeId));
  const nav = useNavigate();
  const sync = useSync();

  useEffect(() => void init(), [init]);

  // sincronizzazione automatica: all'apertura, ogni 2 minuti e ~10 s dopo una modifica locale
  const cid = campaign?.id;
  const linked = !!campaign?.sync;
  useEffect(() => {
    if (!cid || !linked) return;
    void sync.run(cid, { silent: true });
    const iv = setInterval(() => void useSync.getState().run(cid, { silent: true }), 120_000);
    let t: ReturnType<typeof setTimeout>;
    const unsub = useStore.subscribe((s, prev) => {
      if (s.data[cid] !== prev.data[cid]) {
        clearTimeout(t);
        t = setTimeout(() => void useSync.getState().run(cid, { silent: true }), 10_000);
      }
    });
    return () => {
      clearInterval(iv);
      clearTimeout(t);
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cid, linked]);

  if (!ready) return <div className="boot">Caricamento…</div>;

  return (
    <div className="shell">
      <UpdateBanner />
      <DialogHost />
      <div className="frame">
        {campaign && (
          <nav className="nav" aria-label="Navigazione">
            <button className="brand" onClick={() => nav("/")} title="Cambia campagna">
              <span>🐉</span>
              <b>{campaign.name}</b>
            </button>
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>
                <span className="ico">{n.icon}</span>
                <span className="lbl">{n.label}</span>
              </NavLink>
            ))}
            {linked && (
              <div className="sync-pill" title={sync.error ?? ""}>
                {sync.busy ? `⟳ ${sync.detail ?? "Sync…"}` : sync.error ? "⚠ Sync" : sync.lastAt ? "☁ Sincronizzato" : "☁ Server"}
              </div>
            )}
          </nav>
        )}
        <main className="content">
          <Routes>
            <Route path="/" element={<Campaigns />} />
            {campaign ? (
              <>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/characters" element={<Characters />} />
                <Route path="/characters/:id" element={<CharacterSheet />} />
                <Route path="/log" element={<LogPage />} />
                <Route path="/quests" element={<Quests />} />
                <Route path="/npcs" element={<Npcs />} />
                <Route path="/map" element={<MapPage />} />
                <Route path="/map/edit/:id" element={<MapEditor />} />
                <Route path="/manuals" element={<Manuals />} />
                <Route path="/settings" element={<Settings />} />
              </>
            ) : null}
            <Route path="*" element={<Navigate to={campaign ? "/dashboard" : "/"} replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
