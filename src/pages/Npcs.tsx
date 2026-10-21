import { useRef, useState } from "react";
import { useStore } from "../lib/store";
import { useCampaign, shrinkImage } from "../lib/hooks";
import { AssetImage, Empty, Field, Modal, confirmDo } from "../components/ui";
import { uid } from "../lib/id";
import type { Npc } from "../lib/types";

const ATT: Record<Npc["attitude"], string> = { ally: "Alleato", neutral: "Neutrale", hostile: "Ostile", unknown: "Sconosciuto" };

export default function Npcs() {
  const { cid, data, visible } = useCampaign();
  const upsert = useStore((s) => s.upsert);
  const remove = useStore((s) => s.remove);
  const addAsset = useStore((s) => s.addAsset);
  const [edit, setEdit] = useState<Npc>();
  const [q, setQ] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const npcs = visible(data.npcs).filter((n) => !q || (n.name + n.role + n.location).toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="page">
      <header className="hero row between wrap">
        <h1>Personaggi incontrati</h1>
        <div className="row gap">
          <input type="search" placeholder="Cerca…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="primary" onClick={() => setEdit({ id: uid(), updatedAt: 0, name: "", role: "", race: "", location: "", attitude: "unknown", description: "", notes: "" })}>＋ PNG</button>
        </div>
      </header>
      {npcs.length === 0 && <Empty>Nessun PNG. Annota chi incontrate lungo la strada.</Empty>}
      <div className="cards">
        {npcs.map((n) => (
          <button key={n.id} className="card char-card" onClick={() => setEdit(n)}>
            <AssetImage cid={cid} assetId={n.portraitAssetId} alt={n.name} className="avatar" />
            <div>
              <h3>{n.name}</h3>
              <p className="muted">{[n.race, n.role].filter(Boolean).join(" · ")}</p>
              <p className="small"><span className={"tag " + n.attitude}>{ATT[n.attitude]}</span> {n.location}</p>
            </div>
          </button>
        ))}
      </div>

      {edit && (
        <Modal title={edit.name || "Nuovo PNG"} onClose={() => setEdit(undefined)} wide>
          <div className="row gap">
            <AssetImage cid={cid} assetId={edit.portraitAssetId} alt="Ritratto" className="avatar big" />
            <div>
              <button onClick={() => fileRef.current?.click()}>Carica ritratto</button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={async (e) => {
                const f = e.target.files?.[0]; e.target.value = "";
                if (!f) return;
                const a = await addAsset(cid, await shrinkImage(f, 1024, 0.88), f.name);
                setEdit((x) => x && { ...x, portraitAssetId: a.id });
              }} />
            </div>
          </div>
          <div className="grid two">
            <Field label="Nome"><input autoFocus value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Ruolo"><input value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value })} placeholder="Locandiere, mago, nobile…" /></Field>
            <Field label="Razza"><input value={edit.race} onChange={(e) => setEdit({ ...edit, race: e.target.value })} /></Field>
            <Field label="Dove l'abbiamo incontrato"><input value={edit.location} onChange={(e) => setEdit({ ...edit, location: e.target.value })} /></Field>
          </div>
          <Field label="Atteggiamento">
            <select value={edit.attitude} onChange={(e) => setEdit({ ...edit, attitude: e.target.value as Npc["attitude"] })}>
              {Object.entries(ATT).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </Field>
          <Field label="Descrizione"><textarea rows={3} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
          <Field label="Appunti"><textarea rows={4} value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></Field>
          <div className="row between">
            {data.npcs.some((n) => n.id === edit.id) ? <button className="danger" onClick={() => confirmDo("Eliminare il PNG?", () => { remove(cid, "npcs", edit.id); setEdit(undefined); })}>Elimina</button> : <span />}
            <div className="row gap">
              <button onClick={() => setEdit(undefined)}>Annulla</button>
              <button className="primary" disabled={!edit.name.trim()} onClick={() => { upsert(cid, "npcs", edit); setEdit(undefined); }}>Salva</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
