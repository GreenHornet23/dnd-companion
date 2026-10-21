import { useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useStore } from "../lib/store";
import { useCampaign, shrinkImage } from "../lib/hooks";
import { AssetImage, Empty, Field, confirmDo } from "../components/ui";
import { ABILITIES, CLASSES, derive, findClass, fmt, racesFor } from "../lib/rules5e";
import { buildCharacterPrompt, equippedSummary, PORTRAIT_STYLES } from "../lib/aiPrompt";
import type { Character, Item, Spell } from "../lib/types";
import { uid } from "../lib/id";

type Tab = "sheet" | "spells" | "inventory" | "story" | "portrait";
const TABS: [Tab, string][] = [["sheet", "Scheda"], ["spells", "Incantesimi"], ["inventory", "Inventario"], ["story", "Storia"], ["portrait", "Ritratto"]];

export default function CharacterSheet() {
  const { id } = useParams();
  const { cid, ruleset, data } = useCampaign();
  const upsert = useStore((s) => s.upsert);
  const remove = useStore((s) => s.remove);
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>("sheet");
  const c = data.characters.find((x) => x.id === id && !x.deleted);
  if (!c) return <div className="page"><Empty>Personaggio non trovato. <Link to="/characters">Torna all'elenco</Link></Empty></div>;

  const set = (patch: Partial<Character>) => upsert(cid, "characters", { ...c, ...patch });
  const auto = ruleset !== "generic";

  return (
    <div className="page">
      <header className="hero row between wrap">
        <div>
          <Link to="/characters" className="muted small">← Personaggi</Link>
          <h1>{c.name}</h1>
        </div>
        <button className="ghost danger" onClick={() => confirmDo(`Eliminare ${c.name}?`, () => { remove(cid, "characters", c.id); nav("/characters"); })}>Elimina</button>
      </header>
      <div className="tabs" role="tablist">
        {TABS.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "active" : ""} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {tab === "sheet" && <SheetTab c={c} set={set} ruleset={ruleset} auto={auto} />}
      {tab === "spells" && <SpellsTab c={c} set={set} ruleset={ruleset} auto={auto} />}
      {tab === "inventory" && <InventoryTab c={c} set={set} />}
      {tab === "story" && <StoryTab c={c} set={set} />}
      {tab === "portrait" && <PortraitTab c={c} set={set} cid={cid} />}
    </div>
  );
}

type TabProps = { c: Character; set: (p: Partial<Character>) => void };

function Num({ value, onChange, min = 0, max = 999, width }: { value: number; onChange: (n: number) => void; min?: number; max?: number; width?: number }) {
  return <input type="number" inputMode="numeric" style={width ? { width } : undefined} value={Number.isFinite(value) ? value : 0} min={min} max={max}
    onChange={(e) => onChange(Math.min(max, Math.max(min, parseInt(e.target.value, 10) || 0)))} />;
}

function SheetTab({ c, set, ruleset, auto }: TabProps & { ruleset: string; auto: boolean }) {
  const d = useMemo(() => derive(c, ruleset), [c, ruleset]);
  const cls = findClass(c.className);
  const raceLabel = ruleset === "5e2024" ? "Specie" : "Razza";
  return (
    <>
      <section className="card grid form">
        <Field label="Nome"><input value={c.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        <Field label="Giocatore"><input value={c.player} onChange={(e) => set({ player: e.target.value })} /></Field>
        <Field label={raceLabel}>
          <input list="races" value={c.race} onChange={(e) => set({ race: e.target.value })} />
          <datalist id="races">{racesFor(ruleset).map((r) => <option key={r.name} value={r.name} />)}</datalist>
        </Field>
        <Field label="Classe">
          <input list="classes" value={c.className} onChange={(e) => set({ className: e.target.value })} />
          <datalist id="classes">{CLASSES.map((x) => <option key={x.name} value={x.name} />)}</datalist>
        </Field>
        <Field label="Sottoclasse" hint={cls && (cls.name === "Guerriero" || cls.name === "Ladro") ? "Cavaliere Mistico / Ladro Arcano attivano gli slot incantesimo" : undefined}>
          <input value={c.subclass} onChange={(e) => set({ subclass: e.target.value })} />
        </Field>
        <Field label="Livello"><Num value={c.level} min={1} max={20} onChange={(n) => set({ level: n })} /></Field>
        <Field label="Background"><input value={c.background} onChange={(e) => set({ background: e.target.value })} /></Field>
        <Field label="Allineamento"><input value={c.alignment} onChange={(e) => set({ alignment: e.target.value })} /></Field>
      </section>

      <section className="card">
        <div className="row between wrap">
          <h2>Caratteristiche</h2>
          {ruleset === "5e2014" && (
            <label className="check"><input type="checkbox" checked={c.applyRacialBonus} onChange={(e) => set({ applyRacialBonus: e.target.checked })} /> Applica bonus razziali</label>
          )}
        </div>
        <div className="abilities">
          {ABILITIES.map((a) => (
            <div key={a.key} className="ability">
              <small>{a.short}</small>
              <b>{auto ? fmt(d.mods[a.key]) : ""}</b>
              <Num value={c.abilities[a.key]} min={1} max={30} onChange={(n) => set({ abilities: { ...c.abilities, [a.key]: n } })} />
              {auto && d.abilities[a.key] !== c.abilities[a.key] && <small className="muted">tot. {d.abilities[a.key]}</small>}
            </div>
          ))}
        </div>
        {ruleset === "5e2024" && (
          <>
            <h3>Bonus dal background</h3>
            <div className="abilities">
              {ABILITIES.map((a) => (
                <div key={a.key} className="ability">
                  <small>{a.short}</small>
                  <Num value={c.bgBonus?.[a.key] ?? 0} min={0} max={3} onChange={(n) => set({ bgBonus: { ...c.bgBonus, [a.key]: n } })} />
                </div>
              ))}
            </div>
            <small className="muted">Nel regolamento 2024 il background dà +2/+1 oppure +1/+1/+1 a tre caratteristiche: inseriscili qui, vengono sommati al punteggio base.</small>
          </>
        )}
        {!auto && <p className="note">Per questa edizione i calcoli automatici non sono disponibili: usa i campi come appunti.</p>}
      </section>

      <section className="card grid stats">
        <Field label="PF attuali"><Num value={c.hpCurrent} min={-999} onChange={(n) => set({ hpCurrent: n })} /></Field>
        <Field label="PF massimi"><Num value={c.hpMax} onChange={(n) => set({ hpMax: n })} /></Field>
        <Field label="PF temporanei"><Num value={c.hpTemp} onChange={(n) => set({ hpTemp: n })} /></Field>
        <Field label="CA (scrivila tu)"><Num value={c.acBonus} onChange={(n) => set({ acBonus: n })} /></Field>
        {auto && (
          <>
            <div className="stat"><b>{fmt(d.prof)}</b><span>Competenza</span></div>
            <div className="stat"><b>{fmt(d.initiative)}</b><span>Iniziativa</span></div>
            <div className="stat"><b>{d.speed} ft</b><span>Velocità</span></div>
            <div className="stat"><b>{d.passivePerception}</b><span>Percezione passiva</span></div>
            {d.hitDie && <div className="stat"><b>d{d.hitDie}{c.level > 1 ? ` × ${c.level}` : ""}</b><span>Dado vita</span></div>}
          </>
        )}
      </section>

      {auto && (
        <div className="grid two">
          <section className="card">
            <h2>Tiri salvezza</h2>
            <ul className="plain tight">
              {ABILITIES.map((a) => (
                <li key={a.key} className="row between">
                  <span>{d.saves[a.key].prof ? "●" : "○"} {a.label}</span><b>{fmt(d.saves[a.key].value)}</b>
                </li>
              ))}
            </ul>
            {cls && <small className="muted">Competenze da {cls.name}.</small>}
          </section>
          <section className="card">
            <h2>Abilità</h2>
            <ul className="plain tight">
              {d.skills.map((s) => (
                <li key={s.key} className="row between">
                  <button className="skill" title="Tocca per cambiare: nessuna → competenza → maestria"
                    onClick={() => set({ skillProf: { ...c.skillProf, [s.key]: (((c.skillProf[s.key] ?? 0) + 1) % 3) as 0 | 1 | 2 } })}>
                    {s.level === 2 ? "◉" : s.level === 1 ? "●" : "○"} {s.label} <small className="muted">({ABILITIES.find((a) => a.key === s.ability)!.short})</small>
                  </button>
                  <b>{fmt(s.value)}</b>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </>
  );
}

function SpellsTab({ c, set, ruleset, auto }: TabProps & { ruleset: string; auto: boolean }) {
  const d = useMemo(() => derive(c, ruleset), [c, ruleset]);
  const [name, setName] = useState("");
  const [lvl, setLvl] = useState(0);
  const info = d.spell?.info;
  if (!auto) return <p className="note">Lo spellsheet automatico è disponibile per la 5ª edizione.</p>;
  const used = (i: number) => c.slotsUsed[i] ?? 0;
  const setUsed = (i: number, n: number) => {
    const arr = [...c.slotsUsed];
    while (arr.length <= i) arr.push(0);
    arr[i] = Math.max(0, n);
    set({ slotsUsed: arr });
  };
  const spells = [...c.spells].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  const upd = (s: Spell, patch: Partial<Spell>) => set({ spells: c.spells.map((x) => (x.id === s.id ? { ...x, ...patch } : x)) });

  return (
    <>
      {!d.spell ? (
        <section className="card"><p className="muted">{c.className || "Questa classe"} non lancia incantesimi (o la classe non è nella lista). Puoi comunque annotare incantesimi o capacità magiche qui sotto.</p></section>
      ) : (
        <section className="card">
          <div className="grid stats">
            <div className="stat"><b>{d.spell.abilityLabel}</b><span>Caratteristica</span></div>
            <div className="stat"><b>{d.spell.dc}</b><span>CD tiro salvezza</span></div>
            <div className="stat"><b>{fmt(d.spell.attack)}</b><span>Bonus attacco</span></div>
          </div>
          <h2>Slot incantesimo</h2>
          {info && info.pact && (
            <div className="slots">
              <span>Patto (livello {info.pact.level})</span>
              {Array.from({ length: info.pact.count }, (_, i) => (
                <input key={i} type="checkbox" aria-label={`slot patto ${i + 1}`} checked={used(0) > i} onChange={(e) => setUsed(0, e.target.checked ? i + 1 : i)} />
              ))}
              <small className="muted">spunta = usato</small>
            </div>
          )}
          {info && info.slots.map((n, i) => (
            <div key={i} className="slots">
              <span>Livello {i + 1}</span>
              {Array.from({ length: n }, (_, k) => (
                <input key={k} type="checkbox" aria-label={`slot ${i + 1} n.${k + 1}`} checked={used(i) > k} onChange={(e) => setUsed(i, e.target.checked ? k + 1 : k)} />
              ))}
            </div>
          ))}
          {info && info.slots.length === 0 && !info.pact && <p className="muted">Nessuno slot a questo livello.</p>}
          <button className="ghost" onClick={() => set({ slotsUsed: [] })}>Riposo lungo: ripristina slot</button>
        </section>
      )}

      <section className="card">
        <h2>Incantesimi conosciuti</h2>
        <div className="row gap wrap">
          <input placeholder="Nome incantesimo" value={name} onChange={(e) => setName(e.target.value)} />
          <select value={lvl} onChange={(e) => setLvl(+e.target.value)}>
            <option value={0}>Trucchetto</option>
            {Array.from({ length: 9 }, (_, i) => <option key={i} value={i + 1}>Livello {i + 1}</option>)}
          </select>
          <button disabled={!name.trim()} onClick={() => { set({ spells: [...c.spells, { id: uid(), name: name.trim(), level: lvl, prepared: false, notes: "" }] }); setName(""); }}>Aggiungi</button>
        </div>
        {spells.length === 0 && <Empty>Nessun incantesimo.</Empty>}
        <ul className="plain tight">
          {spells.map((s) => (
            <li key={s.id} className="row between">
              <label className="check"><input type="checkbox" checked={s.prepared} onChange={(e) => upd(s, { prepared: e.target.checked })} /> <b>{s.name}</b> <small className="muted">{s.level === 0 ? "trucchetto" : `liv. ${s.level}`}</small></label>
              <button className="ghost" aria-label="Rimuovi" onClick={() => set({ spells: c.spells.filter((x) => x.id !== s.id) })}>✕</button>
            </li>
          ))}
        </ul>
        <small className="muted">Gli incantesimi razziali e di sottoclasse vanno inseriti a mano. L'elenco automatico dai manuali PDF è previsto in una fase successiva.</small>
      </section>
    </>
  );
}

const SLOTS: [Item["slot"], string][] = [
  ["mainHand", "Mano principale"], ["offHand", "Altra mano"], ["head", "Testa"], ["body", "Corpo"], ["hands", "Mani"],
  ["feet", "Piedi"], ["neck", "Collo"], ["cloak", "Mantello"], ["ring", "Anello"], ["other", "Altro"],
];

function InventoryTab({ c, set }: TabProps) {
  const [name, setName] = useState("");
  const upd = (i: Item, patch: Partial<Item>) => set({ inventory: c.inventory.map((x) => (x.id === i.id ? { ...x, ...patch } : x)) });
  return (
    <>
      <section className="card">
        <h2>Monete</h2>
        <div className="coins">
          {(["pp", "gp", "ep", "sp", "cp"] as const).map((k) => (
            <Field key={k} label={k.toUpperCase()}><Num value={c.coins[k]} onChange={(n) => set({ coins: { ...c.coins, [k]: n } })} /></Field>
          ))}
        </div>
      </section>
      <section className="card">
        <h2>Oggetti</h2>
        <div className="row gap">
          <input placeholder="Nuovo oggetto" value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && name.trim() && (set({ inventory: [...c.inventory, { id: uid(), name: name.trim(), qty: 1, equipped: false, slot: "other", notes: "" }] }), setName(""))} />
          <button disabled={!name.trim()} onClick={() => { set({ inventory: [...c.inventory, { id: uid(), name: name.trim(), qty: 1, equipped: false, slot: "other", notes: "" }] }); setName(""); }}>Aggiungi</button>
        </div>
        {c.inventory.length === 0 && <Empty>Zaino vuoto.</Empty>}
        <ul className="plain">
          {c.inventory.map((i) => (
            <li key={i.id} className="item">
              <div className="row gap wrap">
                <input className="grow" value={i.name} onChange={(e) => upd(i, { name: e.target.value })} />
                <Num value={i.qty} min={0} width={70} onChange={(n) => upd(i, { qty: n })} />
                <label className="check"><input type="checkbox" checked={i.equipped} onChange={(e) => upd(i, { equipped: e.target.checked })} /> In uso</label>
                {i.equipped && (
                  <select value={i.slot} onChange={(e) => upd(i, { slot: e.target.value as Item["slot"] })}>
                    {SLOTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                )}
                <button className="ghost" aria-label="Rimuovi" onClick={() => set({ inventory: c.inventory.filter((x) => x.id !== i.id) })}>✕</button>
              </div>
              <input className="small-input" placeholder="Note (danni, proprietà, magia…)" value={i.notes} onChange={(e) => upd(i, { notes: e.target.value })} />
            </li>
          ))}
        </ul>
        <small className="muted">Gli oggetti “in uso” compaiono nel ritratto generato dall'AI.</small>
      </section>
    </>
  );
}

function StoryTab({ c, set }: TabProps) {
  return (
    <section className="card">
      <Field label="Aspetto"><textarea rows={3} value={c.appearance} onChange={(e) => set({ appearance: e.target.value })} /></Field>
      <Field label="Tratti, ideali, legami, difetti"><textarea rows={4} value={c.personality} onChange={(e) => set({ personality: e.target.value })} /></Field>
      <Field label="Backstory"><textarea rows={10} value={c.backstory} onChange={(e) => set({ backstory: e.target.value })} /></Field>
      <Field label="Appunti"><textarea rows={5} value={c.notes} onChange={(e) => set({ notes: e.target.value })} /></Field>
    </section>
  );
}

function PortraitTab({ c, set, cid }: TabProps & { cid: string }) {
  const addAsset = useStore((s) => s.addAsset);
  const fileRef = useRef<HTMLInputElement>(null);
  const [style, setStyle] = useState(PORTRAIT_STYLES[0].id);
  const [desc, setDesc] = useState(c.appearance);
  const generated = useMemo(() => buildCharacterPrompt(c, desc, style), [c, desc, style]);
  const [prompt, setPrompt] = useState<string | null>(null);
  const shown = prompt ?? generated;
  const gear = equippedSummary(c);

  return (
    <>
      <section className="card">
        <h2>Generatore di ritratti <span className="tag">in arrivo</span></h2>
        <p className="muted">
          L'interfaccia è pronta; la generazione vera e propria verrà collegata quando avremo scelto il servizio di immagini.
          Il prompt qui sotto si costruisce già da descrizione, razza, classe ed equipaggiamento in uso.
        </p>
        <Field label="Descrizione"><textarea rows={3} value={desc} onChange={(e) => { setDesc(e.target.value); setPrompt(null); }} placeholder="Capelli rossi intrecciati, cicatrice sull'occhio sinistro, sguardo severo…" /></Field>
        <Field label="Stile">
          <select value={style} onChange={(e) => { setStyle(e.target.value); setPrompt(null); }}>
            {PORTRAIT_STYLES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </Field>
        <div>
          <b>Equipaggiamento in uso</b>
          {gear.length ? <ul>{gear.map((g) => <li key={g}>{g}</li>)}</ul> : <p className="muted">Nessun oggetto segnato “in uso” nell'inventario.</p>}
        </div>
        <Field label="Prompt (modificabile)" hint={prompt !== null ? "Modificato a mano" : "Generato automaticamente"}>
          <textarea rows={6} value={shown} onChange={(e) => setPrompt(e.target.value)} />
        </Field>
        <div className="row gap wrap">
          <button className="primary" disabled title="Servizio di generazione non ancora collegato">✨ Genera ritratto</button>
          <button onClick={() => navigator.clipboard?.writeText(shown)}>Copia prompt</button>
          {prompt !== null && <button className="ghost" onClick={() => setPrompt(null)}>Ripristina</button>}
        </div>
      </section>

      <section className="card">
        <div className="row between">
          <h2>Immagini del personaggio</h2>
          <button onClick={() => fileRef.current?.click()}>＋ Carica immagine</button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            const blob = await shrinkImage(f, 1024, 0.88);
            const a = await addAsset(cid, blob, f.name);
            set({ portraits: [...c.portraits, { id: uid(), assetId: a.id, prompt: "", createdAt: Date.now() }] });
          }} />
        </div>
        {c.portraits.length === 0 && <Empty>Nessuna immagine. La prima caricata diventa l'avatar.</Empty>}
        <div className="gallery">
          {c.portraits.map((p, i) => (
            <figure key={p.id}>
              <AssetImage cid={cid} assetId={p.assetId} alt={`Ritratto ${i + 1}`} />
              <figcaption className="row between">
                {i === 0 ? <span className="tag">Avatar</span> : <button className="ghost small" onClick={() => set({ portraits: [p, ...c.portraits.filter((x) => x.id !== p.id)] })}>Imposta avatar</button>}
                <button className="ghost small" onClick={() => set({ portraits: c.portraits.filter((x) => x.id !== p.id) })}>✕</button>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    </>
  );
}

