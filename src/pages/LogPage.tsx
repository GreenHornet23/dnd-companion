import { useState } from "react";
import { useStore } from "../lib/store";
import { useCampaign } from "../lib/hooks";
import { Empty, Field, Modal, confirmDo } from "../components/ui";
import { uid } from "../lib/id";
import type { LogEntry } from "../lib/types";

const today = () => new Date().toISOString().slice(0, 10);

export default function LogPage() {
  const { cid, data, visible } = useCampaign();
  const upsert = useStore((s) => s.upsert);
  const remove = useStore((s) => s.remove);
  const [edit, setEdit] = useState<LogEntry>();
  const [filter, setFilter] = useState("");
  const chars = visible(data.characters);
  const logs = visible(data.logs)
    .filter((l) => !filter || l.characterId === filter)
    .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt);

  const blank = (): LogEntry => ({ id: uid(), updatedAt: 0, title: "", body: "", date: today(), inGameDate: "", characterId: chars[0]?.id });

  return (
    <div className="page">
      <header className="hero row between wrap">
        <h1>Diario dell'avventuriero</h1>
        <div className="row gap">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filtra per personaggio">
            <option value="">Tutti</option>
            {chars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button className="primary" onClick={() => setEdit(blank())}>＋ Voce</button>
        </div>
      </header>
      {logs.length === 0 && <Empty>Ancora nessuna voce. Scrivi cosa è successo nell'ultima sessione.</Empty>}
      <ul className="plain">
        {logs.map((l) => (
          <li key={l.id} className="card">
            <div className="row between">
              <h3>{l.title || "Senza titolo"}</h3>
              <span className="muted small">{l.sessionNo ? `Sessione ${l.sessionNo} · ` : ""}{l.date}{l.inGameDate ? ` · ${l.inGameDate}` : ""}</span>
            </div>
            {l.characterId && <span className="tag">{chars.find((c) => c.id === l.characterId)?.name ?? "—"}</span>}
            <p className="prewrap">{l.body}</p>
            <div className="row gap">
              <button className="ghost" onClick={() => setEdit(l)}>Modifica</button>
              <button className="ghost" onClick={() => confirmDo("Eliminare la voce?", () => remove(cid, "logs", l.id))}>Elimina</button>
            </div>
          </li>
        ))}
      </ul>

      {edit && (
        <Modal title="Voce del diario" onClose={() => setEdit(undefined)} wide>
          <Field label="Titolo"><input autoFocus value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>
          <div className="grid three">
            <Field label="Data"><input type="date" value={edit.date} onChange={(e) => setEdit({ ...edit, date: e.target.value })} /></Field>
            <Field label="Sessione n."><input type="number" value={edit.sessionNo ?? ""} onChange={(e) => setEdit({ ...edit, sessionNo: e.target.value ? +e.target.value : undefined })} /></Field>
            <Field label="Data nel gioco"><input value={edit.inGameDate} onChange={(e) => setEdit({ ...edit, inGameDate: e.target.value })} /></Field>
          </div>
          <Field label="Personaggio">
            <select value={edit.characterId ?? ""} onChange={(e) => setEdit({ ...edit, characterId: e.target.value || undefined })}>
              <option value="">Party / nessuno</option>
              {chars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Racconto"><textarea rows={10} value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} /></Field>
          <div className="row end">
            <button onClick={() => setEdit(undefined)}>Annulla</button>
            <button className="primary" disabled={!edit.title.trim() && !edit.body.trim()} onClick={() => { upsert(cid, "logs", edit); setEdit(undefined); }}>Salva</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
