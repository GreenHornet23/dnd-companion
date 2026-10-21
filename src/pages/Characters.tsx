import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { useCampaign } from "../lib/hooks";
import { AssetImage, Empty } from "../components/ui";
import { newCharacter } from "../lib/rules5e";
import { uid } from "../lib/id";

export default function Characters() {
  const { cid, data, visible } = useCampaign();
  const upsert = useStore((s) => s.upsert);
  const nav = useNavigate();
  const chars = visible(data.characters);
  return (
    <div className="page">
      <header className="hero row between">
        <h1>Personaggi</h1>
        <button className="primary" onClick={() => {
          const c = newCharacter(uid(), Date.now());
          upsert(cid, "characters", c);
          nav(`/characters/${c.id}`);
        }}>＋ Nuovo</button>
      </header>
      {chars.length === 0 && <Empty>Nessun personaggio. Creane uno: i calcoli (bonus, tiri salvezza, slot) si fanno da soli.</Empty>}
      <div className="cards">
        {chars.map((c) => (
          <Link key={c.id} to={`/characters/${c.id}`} className="card char-card">
            <AssetImage cid={cid} assetId={c.portraits[0]?.assetId} alt={c.name} className="avatar" />
            <div>
              <h3>{c.name}</h3>
              <p className="muted">{c.race} {c.className} {c.level}{c.player ? ` · ${c.player}` : ""}</p>
              <p className="small">PF {c.hpCurrent}/{c.hpMax}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
