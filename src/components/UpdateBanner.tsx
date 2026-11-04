import { useEffect, useState } from "react";
import { checkForUpdate, type UpdateInfo } from "../lib/updater";
import { openExternal, releasesPageUrl, runtimeInfo } from "../lib/platform";

const DISMISS_KEY = "dndc:dismissed-update";
const INSTALLING_KEY = "dndc:installing-update";

export function UpdateBanner() {
  const [upd, setUpd] = useState<UpdateInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState<number | null>(null);
  const [err, setErr] = useState<string>();
  const [stuck, setStuck] = useState<{ version?: string; dir?: string }>();

  useEffect(() => {
    const run = () => checkForUpdate().then(async (u) => {
      if (!u || localStorage.getItem(DISMISS_KEY) === u.version) return;
      // Avevi già avviato questo aggiornamento ma l'app che si apre è ancora vecchia: di solito esiste una seconda copia installata
      if (u.mode === "tauri" && localStorage.getItem(INSTALLING_KEY) === u.version) setStuck(await runtimeInfo());
      setUpd(u);
    });
    run();
    const t = setInterval(run, 6 * 60 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  if (!upd) return null;
  return (
    <div className="update-banner" role="status">
      <div>
        <strong>Nuova versione {upd.version} disponibile.</strong>
        {upd.notes && <span className="muted"> {upd.notes.slice(0, 140)}</span>}
        {stuck && (
          <div className="error">
            Questo aggiornamento risulta già installato, ma l'app che hai aperto è la {stuck.version ?? "versione precedente"}
            {stuck.dir ? ` (cartella: ${stuck.dir})` : ""}. Probabilmente sul PC c'è una copia vecchia: disinstalla «Dungeon Companion» da Impostazioni → App,
            poi installa l'ultima versione dalla pagina delle release e apri l'app dal menu Start.
          </div>
        )}
        {err && <div className="error">Aggiornamento non riuscito: {err}</div>}
      </div>
      <div className="row">
        <button
          className="primary"
          disabled={busy || (upd.mode === "link" && !upd.url)}
          onClick={async () => {
            setBusy(true);
            setErr(undefined);
            try {
              try { localStorage.setItem(INSTALLING_KEY, upd.version); } catch { /* ignore */ }
              await upd.install(setPct);
            } catch (e) {
              setErr((e as Error).message);
              setBusy(false);
            }
          }}
        >
          {busy ? (pct != null ? `Scarico… ${pct}%` : "Aggiorno…") : upd.mode === "tauri" ? "Aggiorna e riavvia" : "Scarica aggiornamento"}
        </button>
        {stuck && releasesPageUrl() && <button onClick={() => openExternal(releasesPageUrl()!)}>Apri la pagina di download</button>}
        <button
          className="ghost"
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, upd.version);
            setUpd(null);
          }}
        >
          Più tardi
        </button>
      </div>
    </div>
  );
}
