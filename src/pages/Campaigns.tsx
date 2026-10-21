import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { joinCampaign } from "../lib/sync";
import { EDITIONS, getEdition } from "../lib/catalog";
import { Empty, Field, Modal, notify } from "../components/ui";
import { uid } from "../lib/id";
import { emptyData, type CampaignData } from "../lib/types";

export default function Campaigns() {
  const campaigns = useStore((s) => s.campaigns);
  const setActive = useStore((s) => s.setActive);
  const create = useStore((s) => s.createCampaign);
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [editionId, setEditionId] = useState("5e2014");
  const edition = getEdition(editionId);
  const [books, setBooks] = useState<string[]>(edition.books.filter((b) => b.defaultOn).map((b) => b.id));

  const pickEdition = (id: string) => {
    setEditionId(id);
    setBooks(getEdition(id).books.filter((b) => b.defaultOn).map((b) => b.id));
  };

  const importJson = async (file: File) => {
    try {
      const j = JSON.parse(await file.text());
      if (j.app !== "dungeon-companion" || !j.campaign) throw new Error("File non valido");
      const id = uid();
      const camp = { ...j.campaign, id, name: j.campaign.name + " (importata)", sync: undefined };
      const data: CampaignData = { ...emptyData(), ...(j.data ?? {}) };
      await useStore.getState().importCampaign(camp, data);
      nav("/dashboard");
    } catch (e) {
      notify("Import non riuscito: " + (e as Error).message + "\n(I PDF e le immagini non sono inclusi nell'export JSON.)");
    }
  };

  const [joinOpen, setJoinOpen] = useState(false);
  const [code, setCode] = useState("");
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinErr, setJoinErr] = useState<string>();

  return (
    <div className="page narrow">
      <header className="hero">
        <h1>🐉 Dungeon Companion</h1>
        <p className="muted">Le tue campagne, ognuna con la sua edizione, i suoi manuali e il suo party.</p>
      </header>

      {campaigns.length === 0 && <Empty>Nessuna campagna. Creane una per iniziare.</Empty>}
      <div className="cards">
        {campaigns.map((c) => (
          <button
            key={c.id}
            className="card campaign-card"
            onClick={() => {
              setActive(c.id);
              nav("/dashboard");
            }}
          >
            <h3>{c.name}</h3>
            <p className="muted">{getEdition(c.editionId).name}</p>
            {c.description && <p>{c.description.slice(0, 120)}</p>}
            {c.sync && <span className="tag">☁ Party</span>}
          </button>
        ))}
      </div>

      <div className="row gap">
        <button className="primary" onClick={() => setOpen(true)}>＋ Nuova campagna</button>
        <button onClick={() => setJoinOpen(true)}>Unisciti con un codice</button>
        <button onClick={() => fileRef.current?.click()}>Importa da JSON</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
      </div>

      {joinOpen && (
        <Modal title="Unisciti a una campagna" onClose={() => setJoinOpen(false)}>
          <Field label="Codice d'invito" hint="Te lo manda chi gestisce la campagna: inizia con “dnd1.”">
            <textarea rows={4} autoFocus value={code} onChange={(e) => setCode(e.target.value)} />
          </Field>
          {joinErr && <p className="error">{joinErr}</p>}
          <div className="row end">
            <button onClick={() => setJoinOpen(false)}>Annulla</button>
            <button className="primary" disabled={!code.trim() || joinBusy} onClick={async () => {
              setJoinBusy(true);
              setJoinErr(undefined);
              try {
                await joinCampaign(code);
                setJoinOpen(false);
                setCode("");
                nav("/dashboard");
              } catch (e) {
                setJoinErr((e as Error).message);
              } finally {
                setJoinBusy(false);
              }
            }}>{joinBusy ? "Entro…" : "Unisciti"}</button>
          </div>
        </Modal>
      )}

      {open && (
        <Modal title="Nuova campagna" onClose={() => setOpen(false)}>
          <Field label="Nome"><input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Es. La maledizione di Strahd" /></Field>
          <Field label="Descrizione"><textarea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
          <Field label="Edizione">
            <select value={editionId} onChange={(e) => pickEdition(e.target.value)}>
              {EDITIONS.map((e) => <option key={e.id} value={e.id}>{e.name} — {e.year}</option>)}
            </select>
          </Field>
          {edition.ruleset === "generic" && (
            <p className="note">Per questa edizione la scheda ha i campi base ma non i calcoli automatici (disponibili per la 5e del 2014 e la 5.5e del 2024).</p>
          )}
          <fieldset>
            <legend>Slot manuali da preparare</legend>
            <div className="checks">
              {edition.books.map((b) => (
                <label key={b.id} className="check">
                  <input
                    type="checkbox"
                    checked={books.includes(b.id)}
                    onChange={(e) => setBooks((x) => (e.target.checked ? [...x, b.id] : x.filter((i) => i !== b.id)))}
                  />
                  {b.title} {b.kind === "setting" && <span className="tag">ambientazione</span>}
                </label>
              ))}
            </div>
            <small className="muted">Potrai aggiungerne altri o creare slot personalizzati più tardi.</small>
          </fieldset>
          <div className="row end">
            <button onClick={() => setOpen(false)}>Annulla</button>
            <button
              className="primary"
              disabled={!name.trim()}
              onClick={async () => {
                await create({ name: name.trim(), description: desc, editionId, bookIds: books });
                setOpen(false);
                nav("/dashboard");
              }}
            >
              Crea
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
