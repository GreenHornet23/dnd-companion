import { useState } from "react";
import { useStore } from "../lib/store";
import { useCampaign } from "../lib/hooks";
import { Empty, Field, Modal, confirmDo } from "../components/ui";
import { uid } from "../lib/id";
import type { Quest } from "../lib/types";

const STATUS: [Quest["status"], string][] = [["active", "Attive"], ["rumor", "Voci"], ["completed", "Completate"], ["failed", "Fallite"]];

export default function Quests() {
  const { cid, data, visible } = useCampaign();
  const upsert = useStore((s) => s.upsert);
  const remove = useStore((s) => s.remove);
  const [edit, setEdit] = useState<Quest>();
  const [newObj, setNewObj] = useState("");
  const quests = visible(data.quests);

  return (
    <div className="page">
      <header className="hero row between">
        <h1>Quest</h1>
        <button className="primary" onClick={() => setEdit({ id: uid(), updatedAt: 0, title: "", description: "", status: "active", giver: "", reward: "", location: "", objectives: [] })}>＋ Quest</button>
      </header>
      {quests.length === 0 && <Empty>Nessuna quest registrata.</Empty>}
      {STATUS.map(([st, label]) => {
        const list = quests.filter((q) => q.status === st);
        if (!list.length) return null;
        return (
          <section key={st}>
            <h2>{label} <span className="muted small">({list.length})</span></h2>
            <ul className="plain">
              {list.map((q) => (
                <li key={q.id} className={"card quest " + q.status}>
                  <div className="row between">
                    <h3>{q.title}</h3>
                    <button className="ghost" onClick={() => setEdit(q)}>Modifica</button>
                  </div>
                  <p className="muted small">{[q.giver && `Da: ${q.giver}`, q.location && `Dove: ${q.location}`, q.reward && `Ricompensa: ${q.reward}`].filter(Boolean).join(" · ")}</p>
                  {q.description && <p className="prewrap">{q.description}</p>}
                  {q.objectives.length > 0 && (
                    <ul className="plain tight">
                      {q.objectives.map((o) => (
                        <li key={o.id}>
                          <label className="check">
                            <input type="checkbox" checked={o.done} onChange={(e) => upsert(cid, "quests", { ...q, objectives: q.objectives.map((x) => (x.id === o.id ? { ...x, done: e.target.checked } : x)) })} />
                            <span className={o.done ? "done" : ""}>{o.text}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {edit && (
        <Modal title="Quest" onClose={() => setEdit(undefined)} wide>
          <Field label="Titolo"><input autoFocus value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>
          <Field label="Stato">
            <select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as Quest["status"] })}>
              <option value="rumor">Voce / non accettata</option>
              <option value="active">Attiva</option>
              <option value="completed">Completata</option>
              <option value="failed">Fallita</option>
            </select>
          </Field>
          <div className="grid three">
            <Field label="Mandante"><input value={edit.giver} onChange={(e) => setEdit({ ...edit, giver: e.target.value })} /></Field>
            <Field label="Luogo"><input value={edit.location} onChange={(e) => setEdit({ ...edit, location: e.target.value })} /></Field>
            <Field label="Ricompensa"><input value={edit.reward} onChange={(e) => setEdit({ ...edit, reward: e.target.value })} /></Field>
          </div>
          <Field label="Descrizione"><textarea rows={4} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
          <b>Obiettivi</b>
          <ul className="plain tight">
            {edit.objectives.map((o) => (
              <li key={o.id} className="row gap">
                <input type="checkbox" checked={o.done} onChange={(e) => setEdit({ ...edit, objectives: edit.objectives.map((x) => (x.id === o.id ? { ...x, done: e.target.checked } : x)) })} />
                <input className="grow" value={o.text} onChange={(e) => setEdit({ ...edit, objectives: edit.objectives.map((x) => (x.id === o.id ? { ...x, text: e.target.value } : x)) })} />
                <button className="ghost" onClick={() => setEdit({ ...edit, objectives: edit.objectives.filter((x) => x.id !== o.id) })}>✕</button>
              </li>
            ))}
          </ul>
          <div className="row gap">
            <input className="grow" placeholder="Nuovo obiettivo" value={newObj} onChange={(e) => setNewObj(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && newObj.trim()) { setEdit({ ...edit, objectives: [...edit.objectives, { id: uid(), text: newObj.trim(), done: false }] }); setNewObj(""); } }} />
            <button disabled={!newObj.trim()} onClick={() => { setEdit({ ...edit, objectives: [...edit.objectives, { id: uid(), text: newObj.trim(), done: false }] }); setNewObj(""); }}>Aggiungi</button>
          </div>
          <div className="row between">
            {data.quests.some((q) => q.id === edit.id) ? <button className="danger" onClick={() => confirmDo("Eliminare la quest?", () => { remove(cid, "quests", edit.id); setEdit(undefined); })}>Elimina</button> : <span />}
            <div className="row gap">
              <button onClick={() => setEdit(undefined)}>Annulla</button>
              <button className="primary" disabled={!edit.title.trim()} onClick={() => { upsert(cid, "quests", edit); setEdit(undefined); }}>Salva</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
