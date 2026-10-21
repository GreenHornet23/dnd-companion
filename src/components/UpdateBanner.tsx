import { useEffect, useState } from "react";
import { checkForUpdate, type UpdateInfo } from "../lib/updater";

const DISMISS_KEY = "dndc:dismissed-update";

export function UpdateBanner() {
  const [upd, setUpd] = useState<UpdateInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState<number | null>(null);
  const [err, setErr] = useState<string>();

  useEffect(() => {
    const run = () => checkForUpdate().then((u) => u && localStorage.getItem(DISMISS_KEY) !== u.version && setUpd(u));
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
              await upd.install(setPct);
            } catch (e) {
              setErr((e as Error).message);
              setBusy(false);
            }
          }}
        >
          {busy ? (pct != null ? `Scarico… ${pct}%` : "Aggiorno…") : upd.mode === "tauri" ? "Aggiorna e riavvia" : "Scarica aggiornamento"}
        </button>
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
