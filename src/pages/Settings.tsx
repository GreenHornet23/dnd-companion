import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { useCampaign } from "../lib/hooks";
import { Field, confirmDo } from "../components/ui";
import { useSync } from "../lib/syncStatus";
import { enableSync } from "../lib/sync";
import { deleteRemote, encodeInvite } from "../lib/server";
import { checkForUpdate } from "../lib/updater";

const LS_URL = "dndc:serverUrl";

export default function Settings() {
  const { cid, campaign } = useCampaign();
  const update = useStore((s) => s.updateCampaign);
  const del = useStore((s) => s.deleteCampaign);
  const exportCampaign = useStore((s) => s.exportCampaign);
  const sync = useSync();
  const nav = useNavigate();
  const [url, setUrl] = useState(() => localStorage.getItem(LS_URL) ?? "");
  const [createKey, setCreateKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>();
  const [copied, setCopied] = useState(false);
  const [upMsg, setUpMsg] = useState<string>();
  if (!campaign) return null;

  const wrap = async (fn: () => Promise<void>) => {
    setMsg(undefined);
    setBusy(true);
    try { await fn(); } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="page narrow">
      <header className="hero"><h1>Impostazioni</h1></header>

      <section className="card">
        <h2>Campagna</h2>
        <Field label="Nome"><input value={campaign.name} onChange={(e) => update(cid, { name: e.target.value })} /></Field>
        <Field label="Descrizione"><textarea rows={3} value={campaign.description} onChange={(e) => update(cid, { description: e.target.value })} /></Field>
      </section>

      <section className="card">
        <h2>Sincronizzazione con il party</h2>
        {campaign.sync ? (
          <>
            <p>☁ Sincronizzata con <code>{campaign.sync.url}</code></p>
            <Field label="Codice d'invito" hint="Mandalo ai tuoi giocatori: in “Campagne → Unisciti con un codice” entrano subito. Chi ha il codice può leggere e modificare la campagna: condividilo solo con il party.">
              <textarea readOnly rows={3} value={encodeInvite(campaign.sync, cid)} onFocus={(e) => e.currentTarget.select()} />
            </Field>
            <div className="row gap wrap">
              <button onClick={async () => {
                await navigator.clipboard?.writeText(encodeInvite(campaign.sync!, cid));
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}>{copied ? "Copiato ✓" : "Copia codice"}</button>
              <button disabled={sync.busy} onClick={() => sync.run(cid)}>{sync.busy ? sync.detail ?? "Sincronizzo…" : "Sincronizza ora"}</button>
            </div>
            {sync.error && <p className="error">{sync.error}</p>}
            {sync.lastAt && <p className="muted small">Ultima sincronizzazione: {new Date(sync.lastAt).toLocaleString("it-IT")}</p>}
            <hr />
            <div className="row gap wrap">
              <button className="ghost" onClick={() => confirmDo("Scollegare questa campagna dal server? Resta sul dispositivo e sul server, ma non verrà più sincronizzata qui.", () => update(cid, { sync: undefined }))}>Scollega da questo dispositivo</button>
              <button className="danger" disabled={busy} onClick={() => confirmDo("Eliminare la campagna DAL SERVER per tutto il party (dati e file)? I dispositivi che la hanno già la tengono in locale, ma non potranno più sincronizzarla. L'operazione non si può annullare.", () => wrap(async () => {
                await deleteRemote(campaign.sync!, cid);
                update(cid, { sync: undefined });
                setMsg("Campagna eliminata dal server.");
              }))}>Elimina dal server</button>
            </div>
          </>
        ) : (
          <>
            <p className="muted">
              Per giocare insieme serve un server di sincronizzazione (vedi README: si crea gratis su Cloudflare in pochi minuti).
              Chi lo gestisce conosce la <b>chiave di creazione</b>; i giocatori entrano poi con un codice d'invito, senza account.
            </p>
            <Field label="Indirizzo del server"><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://dungeon-companion-sync.tuo-nome.workers.dev" inputMode="url" /></Field>
            <Field label="Chiave di creazione"><input type="password" value={createKey} onChange={(e) => setCreateKey(e.target.value)} autoComplete="off" /></Field>
            <button className="primary" disabled={busy || !url.trim() || !createKey} onClick={() => wrap(async () => {
              localStorage.setItem(LS_URL, url.trim());
              await enableSync(cid, url, createKey);
              setCreateKey("");
              setMsg("Sincronizzazione attiva: copia il codice d'invito e mandalo al party.");
            })}>{busy ? "Attivo…" : "Attiva sincronizzazione"}</button>
          </>
        )}
        {msg && <p className="muted">{msg}</p>}
      </section>

      <section className="card">
        <h2>App</h2>
        <p className="muted">Versione {__APP_VERSION__}</p>
        <button onClick={async () => {
          setUpMsg("Controllo…");
          const u = await checkForUpdate();
          setUpMsg(u ? `Disponibile la versione ${u.version}: ricarica l'app per vedere l'avviso.` : "Sei aggiornato.");
        }}>Controlla aggiornamenti</button>
        {upMsg && <p className="muted">{upMsg}</p>}
      </section>

      <section className="card">
        <h2>Dati</h2>
        <button onClick={() => {
          const blob = new Blob([exportCampaign(cid)], { type: "application/json" });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `${campaign.name.replace(/[^\w-]+/g, "_")}.json`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        }}>Esporta campagna (JSON, senza PDF e immagini)</button>
        <hr />
        <button className="danger" onClick={() => confirmDo(`Eliminare “${campaign.name}” da questo dispositivo? Sul server del party non cambia nulla.`, async () => { await del(cid); nav("/"); })}>
          Elimina campagna da questo dispositivo
        </button>
      </section>
    </div>
  );
}
