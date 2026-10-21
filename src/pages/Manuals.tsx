import { useEffect, useRef, useState } from "react";
import { useStore, getAssetBlob, getLocalBook, putLocalBook, delLocalBook, listLocalBooks } from "../lib/store";
import { useCampaign } from "../lib/hooks";
import { Empty, Modal, confirmDo, notify } from "../components/ui";
import { uid } from "../lib/id";
import type { BookSlot } from "../lib/types";

function Viewer({ cid, slot, onClose }: { cid: string; slot: BookSlot; onClose: () => void }) {
  const [url, setUrl] = useState<string>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    let cur: string | undefined;
    let dead = false;
    (async () => {
      try {
        const local = await getLocalBook(cid, slot.id);
        const blob = local?.blob ?? (slot.assetId ? await getAssetBlob(cid, slot.assetId) : undefined);
        if (dead) return;
        if (!blob) return setError("File non disponibile su questo dispositivo");
        cur = URL.createObjectURL(blob);
        setUrl(cur);
      } catch (e) {
        if (!dead) setError((e as Error).message);
      }
    })();
    return () => {
      dead = true;
      if (cur) URL.revokeObjectURL(cur);
    };
  }, [cid, slot.id, slot.assetId]);
  return (
    <Modal title={slot.title} onClose={onClose} wide>
      {error && <p className="error">{error}</p>}
      {!url && !error && <p className="muted">Apro il file…</p>}
      {url && (
        <>
          <iframe className="pdf" src={url} title={slot.title} />
          <p className="muted"><a href={url} target="_blank" rel="noreferrer">Apri a schermo intero</a></p>
        </>
      )}
    </Modal>
  );
}

export default function Manuals() {
  const { cid, campaign, edition, data, visible } = useCampaign();
  const upsert = useStore((s) => s.upsert);
  const addAsset = useStore((s) => s.addAsset);
  const remove = useStore((s) => s.remove);
  const [viewing, setViewing] = useState<BookSlot>();
  const [busy, setBusy] = useState<string>();
  const [local, setLocal] = useState<Map<string, string>>(new Map());
  const pickRef = useRef<HTMLInputElement>(null);
  const targetRef = useRef<BookSlot | null>(null);
  const [custom, setCustom] = useState("");
  const refresh = () => listLocalBooks(cid).then(setLocal);
  useEffect(() => { if (cid) void refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [cid]);
  if (!campaign) return null;

  const canShare = !!campaign.sync;
  const slots = visible(data.books);
  const assets = new Map(data.assets.map((a) => [a.id, a]));
  const missing = edition.books.filter((b) => !slots.some((s) => s.bookId === b.id));

  const upload = async (slot: BookSlot, file: File) => {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return notify("Seleziona un file PDF");
    setBusy(slot.id);
    try {
      const blob = new Blob([file], { type: "application/pdf" });
      if (canShare && slot.shared) {
        const asset = await addAsset(cid, blob, file.name);
        upsert(cid, "books", { ...slot, assetId: asset.id });
      } else {
        await putLocalBook(cid, slot.id, blob, file.name);
      }
      await refresh();
    } finally {
      setBusy(undefined);
    }
  };

  const shareLocal = async (slot: BookSlot) => {
    const lb = await getLocalBook(cid, slot.id);
    if (!lb) return;
    setBusy(slot.id);
    try {
      const asset = await addAsset(cid, lb.blob, lb.name);
      upsert(cid, "books", { ...slot, shared: true, assetId: asset.id });
    } finally {
      setBusy(undefined);
    }
  };

  const status = (s: BookSlot) => {
    const lb = local.get(s.id);
    if (s.shared && canShare) {
      if (!s.assetId) return lb ? "Solo su questo dispositivo (non ancora condiviso)" : "Vuoto";
      const a = assets.get(s.assetId);
      if (!a) return "In arrivo dal party…";
      return a.synced ? `Condiviso col party · ${a.name}` : "Condiviso: caricamento al prossimo sync";
    }
    return lb ? `Sul tuo dispositivo · ${lb}` : "Vuoto";
  };
  const hasFile = (s: BookSlot) => !!local.get(s.id) || !!(s.shared && canShare && s.assetId);

  return (
    <div className="page">
      <header className="hero">
        <h1>Manuali</h1>
        <p className="muted">
          Carica i PDF dei tuoi manuali. Sono materiale protetto da copyright: per impostazione predefinita ognuno carica la propria copia, che resta solo sul suo dispositivo.
          {canShare ? " Se lo decidi tu, puoi condividere un manuale col party spuntando «Condividi»." : ""}
        </p>
      </header>

      <input ref={pickRef} type="file" accept="application/pdf,.pdf" hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f && targetRef.current) void upload(targetRef.current, f); e.target.value = ""; }} />

      {slots.length === 0 && <Empty>Nessuno slot. Aggiungine uno qui sotto.</Empty>}
      <ul className="plain">
        {slots.map((s) => (
          <li key={s.id} className="card slot">
            <div>
              <b>{s.title}</b>
              <div className="muted small">{status(s)}</div>
              {canShare && (
                <label className="check small">
                  <input type="checkbox" checked={!!s.shared} onChange={(e) => upsert(cid, "books", { ...s, shared: e.target.checked })} /> Condividi col party
                </label>
              )}
            </div>
            <div className="row gap wrap">
              {hasFile(s) && <button onClick={() => setViewing(s)}>Apri</button>}
              {canShare && s.shared && !s.assetId && local.get(s.id) && (
                <button disabled={busy === s.id} onClick={() => shareLocal(s)}>Condividi il file che ho qui</button>
              )}
              <button disabled={busy === s.id} onClick={() => { targetRef.current = s; pickRef.current?.click(); }}>
                {busy === s.id ? "Carico…" : hasFile(s) ? "Sostituisci" : "Carica PDF"}
              </button>
              <button className="ghost" title="Rimuovi slot" onClick={() => confirmDo(`Rimuovere lo slot “${s.title}”?`, async () => { await delLocalBook(cid, s.id); remove(cid, "books", s.id); void refresh(); })}>🗑</button>
            </div>
          </li>
        ))}
      </ul>

      <section>
        <h2>Aggiungi slot</h2>
        {missing.length > 0 && (
          <div className="row gap wrap">
            <select id="add-book" defaultValue="">
              <option value="" disabled>Dal catalogo di {edition.name}…</option>
              {missing.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
            <button onClick={() => {
              const el = document.getElementById("add-book") as HTMLSelectElement;
              const b = missing.find((x) => x.id === el.value);
              if (b) upsert(cid, "books", { id: `slot-${b.id}`, bookId: b.id, title: b.title, updatedAt: 0 });
            }}>Aggiungi</button>
          </div>
        )}
        <div className="row gap wrap">
          <input placeholder="Slot personalizzato (homebrew, avventura, regole della casa…)" value={custom} onChange={(e) => setCustom(e.target.value)} />
          <button disabled={!custom.trim()} onClick={() => {
            const id = uid();
            upsert(cid, "books", { id, bookId: "custom:" + id, title: custom.trim(), updatedAt: 0 });
            setCustom("");
          }}>Aggiungi</button>
        </div>
      </section>

      {viewing && <Viewer cid={cid} slot={viewing} onClose={() => setViewing(undefined)} />}
    </div>
  );
}
