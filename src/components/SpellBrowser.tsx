import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, notify } from "./ui";
import { useCampaign } from "../lib/hooks";
import { getAssetBlob, getLocalBook } from "../lib/store";
import { indexBook, loadIndex, saveIndex, normClass, ocrCache, type OcrOptions, type SpellIndex, type SpellRef } from "../lib/spellIndex";
import type { OcrLang } from "../lib/ocr";
import type { BookSlot, Spell } from "../lib/types";
import { uid } from "../lib/id";

interface Props {
  className: string;
  known: Spell[];
  onAdd(spell: Spell): void;
  onClose(): void;
}

async function bookBlob(cid: string, slot: BookSlot): Promise<Blob | undefined> {
  const local = await getLocalBook(cid, slot.id);
  if (local) return local.blob;
  return slot.assetId ? getAssetBlob(cid, slot.assetId) : undefined;
}

export function SpellBrowser({ className, known, onAdd, onClose }: Props) {
  const { cid, data, visible } = useCampaign();
  const slots = visible(data.books);
  const [indexes, setIndexes] = useState<Record<string, SpellIndex | undefined>>({});
  const [busy, setBusy] = useState<{ slot: string; done: number; total: number }>();
  const cancel = useRef({ cancelled: false });
  const [q, setQ] = useState("");
  const [lvl, setLvl] = useState<number | "all">("all");
  const [onlyClass, setOnlyClass] = useState(true);
  const [open, setOpen] = useState<string>();
  const [ocrLang, setOcrLang] = useState<OcrLang>("ita");
  const [twoCols, setTwoCols] = useState(true);
  const [from, setFrom] = useState("1");
  const [to, setTo] = useState("999");
  const [ocrFor, setOcrFor] = useState<string>();
  const [startedAt, setStartedAt] = useState(0);

  useEffect(() => {
    let dead = false;
    (async () => {
      const out: Record<string, SpellIndex | undefined> = {};
      for (const s of slots) out[s.id] = await loadIndex(cid, s.id);
      if (!dead) setIndexes(out);
    })();
    return () => { dead = true; cancel.current.cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cid]);

  const run = async (slot: BookSlot, ocr?: boolean) => {
    cancel.current = { cancelled: false };
    setStartedAt(Date.now());
    setBusy({ slot: slot.id, done: 0, total: 0 });
    try {
      const blob = await bookBlob(cid, slot);
      if (!blob) throw new Error("File non disponibile su questo dispositivo: caricalo nella pagina Manuali.");
      const ocrOpts: OcrOptions | undefined = ocr
        ? { lang: ocrLang, from: Math.max(1, +from || 1), to: Math.max(1, +to || 999), twoColumns: twoCols, cache: ocrCache(cid, slot.id, ocrLang, twoCols) }
        : undefined;
      const idx = await indexBook(blob, slot.id, (done, total) => setBusy({ slot: slot.id, done, total }), cancel.current, ocrOpts);
      if (cancel.current.cancelled) return;
      if (!idx.spells.length) notify(idx.scannedPages > idx.pages / 2 && !ocr
        ? "Questo manuale è una scansione (senza testo): usa «Manuale scansionato (OCR)» sotto il suo nome."
        : "Nessun incantesimo riconosciuto. Controlla le pagine scelte o l'impaginazione del PDF.");
      await saveIndex(cid, slot.id, idx);
      setIndexes((x) => ({ ...x, [slot.id]: idx }));
    } catch (e) {
      notify("Impossibile leggere il manuale: " + (e as Error).message);
    } finally {
      setBusy(undefined);
    }
  };

  const all = useMemo(() => {
    const rows: (SpellRef & { book: string })[] = [];
    for (const s of slots) for (const sp of indexes[s.id]?.spells ?? []) rows.push({ ...sp, book: s.title });
    return rows;
  }, [slots, indexes]);

  const cls = normClass(className).toLowerCase();
  const hasClassInfo = all.some((s) => s.classes.length);
  const classFilterActive = onlyClass && !!className.trim() && hasClassInfo;
  const knownKeys = new Set(known.map((k) => `${k.name.toLowerCase()}|${k.level}`));
  const ql = q.trim().toLowerCase();
  const list = all.filter((s) =>
    (lvl === "all" || s.level === lvl) &&
    (!ql || s.name.toLowerCase().includes(ql)) &&
    (!classFilterActive || s.classes.length === 0 || s.classes.some((c) => c.toLowerCase() === cls)));
  const shown = list.slice(0, 80);

  const add = (s: SpellRef & { book: string }) =>
    onAdd({
      id: uid(), name: s.name, level: s.level, prepared: false,
      notes: `${s.casting} · ${s.range} · ${s.duration}`,
      school: s.school, casting: s.casting, range: s.range, components: s.components, duration: s.duration,
      text: s.text, source: `${s.book}, p. ${s.page}`,
    });

  return (
    <Modal title="Incantesimi dai manuali" onClose={onClose} wide>
      <h4>Manuali della campagna</h4>
      {slots.length === 0 && <p className="muted">Nessun manuale in questa campagna. Caricali dalla pagina Manuali.</p>}
      <ul className="plain tight">
        {slots.map((s) => {
          const idx = indexes[s.id];
          const working = busy?.slot === s.id;
          return (
            <li key={s.id} className="row between wrap gap">
              <span><b>{s.title}</b>{" "}<small className="muted">{idx ? `${idx.spells.length} incantesimi` : "non ancora letto"}</small></span>
              {working
                ? <span className="row gap"><span className="muted">Pagina {busy.done}/{busy.total || "…"}{busy.done > 2 && busy.total ? ` · circa ${Math.max(1, Math.round(((Date.now() - startedAt) / busy.done) * (busy.total - busy.done) / 60000))} min` : ""}</span><button className="ghost" onClick={() => { cancel.current.cancelled = true; }}>Annulla</button></span>
                : <button className="ghost" disabled={!!busy} onClick={() => run(s)}>{idx ? "Rileggi" : "Leggi il manuale"}</button>}
              {!working && idx && idx.scannedPages > 0 && (
                <small className="muted" style={{ width: "100%" }}>
                  {idx.scannedPages} pagine senza testo selezionabile{idx.ocrPages ? ` (${idx.ocrPages} lette con l'OCR)` : ""}.
                </small>
              )}
              {!working && (
                <div style={{ width: "100%" }}>
                  <button className="ghost small" onClick={() => setOcrFor(ocrFor === s.id ? undefined : s.id)}>
                    {ocrFor === s.id ? "▾" : "▸"} Manuale scansionato (OCR)
                  </button>
                  {ocrFor === s.id && (
                    <div className="note">
                      <p className="muted">Per i PDF fatti di immagini. È lento (qualche secondo a pagina): scegli solo le pagine degli incantesimi. Le pagine già lette restano salvate e non si rifanno.</p>
                      <div className="row gap wrap">
                        <label>Lingua <select value={ocrLang} onChange={(e) => setOcrLang(e.target.value as OcrLang)}><option value="ita">Italiano</option><option value="eng">Inglese</option></select></label>
                        <label>Da pagina <input style={{ width: 70 }} inputMode="numeric" value={from} onChange={(e) => setFrom(e.target.value.replace(/\D/g, ""))} /></label>
                        <label>a <input style={{ width: 70 }} inputMode="numeric" value={to} onChange={(e) => setTo(e.target.value.replace(/\D/g, ""))} /></label>
                        <label className="check"><input type="checkbox" checked={twoCols} onChange={(e) => setTwoCols(e.target.checked)} /> Due colonne per pagina</label>
                      </div>
                      <button className="primary" disabled={!!busy} onClick={() => run(s, true)}>Leggi con l'OCR</button>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {all.length > 0 && (
        <>
          <div className="row gap wrap" style={{ marginTop: 12 }}>
            <input placeholder="Cerca per nome" value={q} onChange={(e) => setQ(e.target.value)} />
            <select value={lvl} onChange={(e) => setLvl(e.target.value === "all" ? "all" : +e.target.value)}>
              <option value="all">Tutti i livelli</option>
              <option value={0}>Trucchetti</option>
              {Array.from({ length: 9 }, (_, i) => <option key={i} value={i + 1}>Livello {i + 1}</option>)}
            </select>
            {hasClassInfo && className.trim() && (
              <label className="check"><input type="checkbox" checked={onlyClass} onChange={(e) => setOnlyClass(e.target.checked)} /> Solo {className}</label>
            )}
          </div>
          {!hasClassInfo && <small className="muted">Questo manuale non indica le classi accanto agli incantesimi, quindi l'elenco non è filtrato per classe.</small>}
          <p className="muted">{list.length} risultati{list.length > shown.length ? " (mostro i primi 80, restringi la ricerca)" : ""}</p>
          <ul className="plain tight">
            {shown.map((s) => {
              const k = `${s.book}|${s.id}`;
              const has = knownKeys.has(`${s.name.toLowerCase()}|${s.level}`);
              return (
                <li key={k}>
                  <div className="row between gap">
                    <button className="ghost" style={{ textAlign: "left", flex: 1 }} onClick={() => setOpen(open === k ? undefined : k)}>
                      <b>{s.name}</b> <small className="muted">{s.level === 0 ? "trucchetto" : `liv. ${s.level}`} · {s.school}{s.ritual ? " · rituale" : ""}</small>
                    </button>
                    <button disabled={has} onClick={() => add(s)}>{has ? "Già presente" : "Aggiungi"}</button>
                  </div>
                  {open === k && (
                    <div className="note" style={{ marginBottom: 8 }}>
                      <div><b>Lancio:</b> {s.casting} · <b>Gittata:</b> {s.range} · <b>Durata:</b> {s.duration}</div>
                      <div><b>Componenti:</b> {s.components}</div>
                      <p>{s.text || "—"}</p>
                      <small className="muted">{s.book}, p. {s.page}</small>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Modal>
  );
}
