import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useStore } from "../lib/store";
import { useAssetUrl, useCampaign, shrinkImage } from "../lib/hooks";
import { Empty, Field, Modal, confirmDo } from "../components/ui";
import { uid } from "../lib/id";
import { canvasToBlob, renderToCanvas, THEME_LABEL, defaultTile } from "../lib/gridRender";
import { SIZES, SIZE_LABEL, DEFAULT_ROOMS, generate, randomSeed, toRows, blank, type SizeKey } from "../lib/gridGen";
import type { GridMap, GridTheme, MapDoc, MapPin } from "../lib/types";

const KINDS: Record<MapPin["kind"], string> = { city: "🏘️", dungeon: "🕳️", poi: "📍", quest: "❗", danger: "☠️", note: "📝" };
const KIND_LABEL: Record<MapPin["kind"], string> = { city: "Città", dungeon: "Dungeon", poi: "Luogo", quest: "Quest", danger: "Pericolo", note: "Nota" };

/** Anteprima di una mappa disegnata: la stessa immagine dell'editor, come URL temporaneo */
function useGridPreview(grid?: GridMap) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!grid) { setUrl(undefined); return; }
    let dead = false, cur: string | undefined;
    canvasToBlob(renderToCanvas(grid, 2400)).then((b) => {
      if (dead) return;
      cur = URL.createObjectURL(b);
      setUrl(cur);
    }).catch(() => {});
    return () => { dead = true; if (cur) URL.revokeObjectURL(cur); };
  }, [grid]);
  return url;
}

type NewKind = "image" | GridTheme;

export default function MapPage() {
  const { cid, data, visible } = useCampaign();
  const upsert = useStore((s) => s.upsert);
  const remove = useStore((s) => s.remove);
  const addAsset = useStore((s) => s.addAsset);
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const maps = visible(data.maps);
  const map = maps.find((m) => m.id === params.get("m")) ?? maps[0];
  const imgAsset = useAssetUrl(cid, map?.grid ? undefined : map?.assetId);
  const gridUrl = useGridPreview(map?.grid);
  const url = map?.grid ? gridUrl : imgAsset.url;
  const error = map?.grid ? undefined : imgAsset.error;
  const pins = visible(data.pins).filter((p) => p.mapId === map?.id);
  const [adding, setAdding] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [edit, setEdit] = useState<MapPin>();
  const [newOpen, setNewOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const select = (id: string) => setParams({ m: id }, { replace: true });

  const addImageMap = async (f: File) => {
    const a = await addAsset(cid, await shrinkImage(f, 3000, 0.85), f.name);
    const id = uid();
    upsert(cid, "maps", { id, updatedAt: 0, name: f.name.replace(/\.[^.]+$/, ""), assetId: a.id });
    select(id);
  };

  return (
    <div className="page">
      <header className="hero row between wrap">
        <h1>Mappe</h1>
        <div className="row gap wrap">
          {maps.length > 0 && (
            <select value={map?.id} onChange={(e) => select(e.target.value)} aria-label="Scegli la mappa">
              {maps.map((m) => <option key={m.id} value={m.id}>{m.grid ? "✏️ " : "🖼️ "}{m.name}</option>)}
            </select>
          )}
          <button className="primary" onClick={() => setNewOpen(true)}>＋ Nuova mappa</button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void addImageMap(f); }} />
        </div>
      </header>

      {!map ? (
        <Empty>Nessuna mappa. Disegna o genera un dungeon, una caverna o una mappa del mondo, oppure carica un'immagine.</Empty>
      ) : (
        <>
          <div className="row gap wrap toolbar">
            {map.grid && <button className="primary" onClick={() => nav(`/map/edit/${map.id}`)}>✏️ Modifica / genera</button>}
            <button className={adding ? "primary" : ""} onClick={() => setAdding((a) => !a)}>{adding ? "Tocca la mappa per piazzare…" : "📍 Aggiungi segnaposto"}</button>
            <button onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))} aria-label="Riduci">−</button>
            <span className="muted">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))} aria-label="Ingrandisci">＋</button>
            <button className="ghost danger" onClick={() => confirmDo(`Eliminare la mappa “${map.name}” e i suoi segnaposto?`, () => { pins.forEach((p) => remove(cid, "pins", p.id)); remove(cid, "maps", map.id); setParams({}, { replace: true }); })}>Elimina mappa</button>
          </div>
          {error && <p className="error">{error}</p>}
          <div className="mapwrap">
            {url && (
              <div className={"mapinner" + (adding ? " adding" : "")} style={{ width: `${zoom * 100}%` }}
                onClick={(e) => {
                  if (!adding) return;
                  const r = e.currentTarget.getBoundingClientRect();
                  setEdit({ id: uid(), updatedAt: 0, mapId: map.id, x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, title: "", note: "", kind: "poi" });
                  setAdding(false);
                }}>
                <img src={url} alt={map.name} draggable={false} />
                {pins.map((p) => (
                  <button key={p.id} className="pin" style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }} title={p.title}
                    onClick={(e) => { e.stopPropagation(); setEdit(p); }}>
                    <span>{KINDS[p.kind]}</span>
                    <small>{p.title}</small>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {newOpen && (
        <NewMapModal
          onClose={() => setNewOpen(false)}
          onImage={() => { setNewOpen(false); fileRef.current?.click(); }}
          onCreate={(doc) => { upsert(cid, "maps", doc); setNewOpen(false); nav(`/map/edit/${doc.id}`); }}
        />
      )}

      {edit && (
        <Modal title="Segnaposto" onClose={() => setEdit(undefined)}>
          <Field label="Titolo"><input autoFocus value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>
          <Field label="Tipo">
            <select value={edit.kind} onChange={(e) => setEdit({ ...edit, kind: e.target.value as MapPin["kind"] })}>
              {Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{KINDS[k as MapPin["kind"]]} {l}</option>)}
            </select>
          </Field>
          <Field label="Appunti"><textarea rows={4} value={edit.note} onChange={(e) => setEdit({ ...edit, note: e.target.value })} /></Field>
          <div className="row between">
            {data.pins.some((p) => p.id === edit.id) ? <button className="danger" onClick={() => { remove(cid, "pins", edit.id); setEdit(undefined); }}>Elimina</button> : <span />}
            <div className="row gap">
              <button onClick={() => setEdit(undefined)}>Annulla</button>
              <button className="primary" disabled={!edit.title.trim()} onClick={() => { upsert(cid, "pins", edit); setEdit(undefined); }}>Salva</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function NewMapModal({ onClose, onImage, onCreate }: { onClose: () => void; onImage: () => void; onCreate: (d: MapDoc) => void }) {
  const [kind, setKind] = useState<NewKind>("dungeon");
  const [name, setName] = useState("");
  const [size, setSize] = useState<SizeKey>("medium");
  const [auto, setAuto] = useState(true);
  const [seedStr, setSeedStr] = useState(() => String(randomSeed()));
  const theme = kind === "image" ? "dungeon" : kind;
  const [w, h] = SIZES[theme][size];
  const seed = Math.abs(parseInt(seedStr, 10)) || 1;

  const create = () => {
    if (kind === "image") return onImage();
    const cells = auto
      ? generate({ theme, w, h, seed, rooms: DEFAULT_ROOMS[size] })
      : blank(w, h, defaultTile(theme));
    const grid: GridMap = { theme, w, h, rows: toRows(cells), seed };
    onCreate({ id: uid(), updatedAt: 0, name: name.trim() || THEME_LABEL[theme], grid });
  };

  return (
    <Modal title="Nuova mappa" onClose={onClose}>
      <Field label="Tipo">
        <select value={kind} onChange={(e) => setKind(e.target.value as NewKind)}>
          <option value="dungeon">Dungeon (stanze e corridoi)</option>
          <option value="cave">Caverna</option>
          <option value="overland">Mappa del mondo</option>
          <option value="image">Carica un'immagine</option>
        </select>
      </Field>
      {kind !== "image" && (
        <>
          <Field label="Nome"><input value={name} onChange={(e) => setName(e.target.value)} placeholder={THEME_LABEL[theme]} /></Field>
          <Field label="Dimensione">
            <select value={size} onChange={(e) => setSize(e.target.value as SizeKey)}>
              {(Object.keys(SIZE_LABEL) as SizeKey[]).map((k) => <option key={k} value={k}>{SIZE_LABEL[k]} ({SIZES[theme][k][0]}×{SIZES[theme][k][1]})</option>)}
            </select>
          </Field>
          <label className="check"><input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Genera automaticamente (poi puoi ritoccare a mano)</label>
          {auto && (
            <Field label="Seme" hint="Lo stesso numero dà sempre la stessa mappa">
              <div className="row gap">
                <input inputMode="numeric" value={seedStr} onChange={(e) => setSeedStr(e.target.value.replace(/\D/g, "").slice(0, 10))} />
                <button type="button" onClick={() => setSeedStr(String(randomSeed()))}>🎲</button>
              </div>
            </Field>
          )}
        </>
      )}
      <div className="row end">
        <button onClick={onClose}>Annulla</button>
        <button className="primary" onClick={create}>{kind === "image" ? "Scegli file…" : auto ? "Genera e apri" : "Crea vuota e apri"}</button>
      </div>
    </Modal>
  );
}
