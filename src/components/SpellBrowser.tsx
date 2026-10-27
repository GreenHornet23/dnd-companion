import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, notify } from "./ui";
import { useCampaign } from "../lib/hooks";
import { getAssetBlob, getLocalBook } from "../lib/store";
import { indexBook, loadIndex, saveIndex, normClass, type SpellIndex, type SpellRef } from "../lib/spellIndex";
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

  const run = async (slot: BookSlot) => {
    cancel.current = { cancelled: false };
    setBusy({ slot: slot.id, done: 0, total: 0 });
    try {
      const blob = await bookBlob(cid, slot);
      if (!blob) throw new Error("File non disponibile su questo dispositivo: caricalo nella pagina Manuali.");
      const idx = await indexBook(blob, slot.id, (done, total) => setBusy({ slot: slot.id, done, total }), cancel.current);
      if (cancel.current.cancelled) return;
      if (!idx.spells.length) notify("Nessun incantesimo riconosciuto. Il PDF potrebbe essere una scansione (senza testo) o avere un'impaginazione insolita.");
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
                ? <span className="row gap"><span className="muted">Lettura {busy.done}/{busy.total || "…"}</span><button className="ghost" onClick={() => { cancel.current.cancelled = true; }}>Annulla</button></span>
                : <button className="ghost" disabled={!!busy} onClick={() => run(s)}>{idx ? "Rileggi" : "Leggi il manuale"}</button>}
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
