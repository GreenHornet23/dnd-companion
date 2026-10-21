import { Link } from "react-router-dom";
import { useCampaign } from "../lib/hooks";
import { Empty } from "../components/ui";
import { useSync } from "../lib/syncStatus";

export default function Dashboard() {
  const { cid, campaign, edition, data, visible } = useCampaign();
  const sync = useSync();
  if (!campaign) return null;
  const chars = visible(data.characters);
  const quests = visible(data.quests);
  const active = quests.filter((q) => q.status === "active");
  const logs = [...visible(data.logs)].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4);
  const books = visible(data.books);
  const loaded = books.filter((b) => b.assetId).length;

  return (
    <div className="page">
      <header className="hero">
        <h1>{campaign.name}</h1>
        <p className="muted">{edition.name}</p>
        {campaign.description && <p>{campaign.description}</p>}
      </header>

      {campaign.sync ? (
        <div className="card row between">
          <span>☁ Sincronizzata con il server del party{sync.error ? ` — ⚠ ${sync.error}` : ""}</span>
          <button disabled={sync.busy} onClick={() => sync.run(cid)}>{sync.busy ? "Sincronizzo…" : "Sincronizza ora"}</button>
        </div>
      ) : (
        <div className="card note">
          Questa campagna è solo su questo dispositivo. Attiva la sincronizzazione col party in <Link to="/settings">Impostazioni</Link>.
        </div>
      )}

      <div className="grid stats">
        <Link to="/characters" className="card stat"><b>{chars.length}</b><span>Personaggi</span></Link>
        <Link to="/quests" className="card stat"><b>{active.length}</b><span>Quest attive</span></Link>
        <Link to="/npcs" className="card stat"><b>{visible(data.npcs).length}</b><span>PNG incontrati</span></Link>
        <Link to="/manuals" className="card stat"><b>{loaded}/{books.length}</b><span>Manuali caricati</span></Link>
      </div>

      <section>
        <h2>Quest attive</h2>
        {active.length === 0 ? <Empty>Nessuna quest attiva.</Empty> : (
          <ul className="plain">{active.map((q) => (
            <li key={q.id} className="card">
              <b>{q.title}</b>
              <span className="muted"> · {q.objectives.filter((o) => o.done).length}/{q.objectives.length} obiettivi</span>
            </li>
          ))}</ul>
        )}
      </section>

      <section>
        <h2>Ultime voci del diario</h2>
        {logs.length === 0 ? <Empty>Il diario è vuoto.</Empty> : (
          <ul className="plain">{logs.map((l) => (
            <li key={l.id} className="card"><b>{l.title}</b><p className="muted clamp">{l.body}</p></li>
          ))}</ul>
        )}
      </section>
    </div>
  );
}
