import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useStore } from "../lib/store";
import { useCampaign } from "../lib/hooks";
import { CELL, ERASE_CODE, TILES, canvasToBlob, defaultGrid, defaultTile, drawGrid, renderToCanvas } from "../lib/gridRender";
import { DEFAULT_ROOMS, SIZES, SIZE_LABEL, fromRows, generate, randomSeed, toRows, type Cells, type SizeKey } from "../lib/gridGen";
import { Field, Modal } from "../components/ui";
import { isAndroid, isIos, isTauri } from "../lib/platform";
import type { GridMap, GridTheme } from "../lib/types";

type Tool = "pencil" | "eraser" | "line" | "rect" | "outline" | "fill" | "pan";
const TOOLS: { id: Tool; icon: string; label: string }[] = [
  { id: "pencil", icon: "✏️", label: "Matita" },
  { id: "eraser", icon: "🧽", label: "Gomma" },
  { id: "line", icon: "╱", label: "Linea" },
  { id: "rect", icon: "▉", label: "Rettangolo" },
  { id: "outline", icon: "▭", label: "Contorno" },
  { id: "fill", icon: "🪣", label: "Riempi" },
  { id: "pan", icon: "✋", label: "Sposta" },
];
interface Snap { rows: string[]; w: number; h: number }
interface Pt { x: number; y: number }

export default function MapEditor() {
  const { id } = useParams();
  const { cid, data } = useCampaign();
  const map = data.maps.find((m) => m.id === id && !m.deleted);
  if (!map?.grid) {
    return <div className="page"><p className="empty">Mappa disegnata non trovata. <Link to="/map">Torna alle mappe</Link></p></div>;
  }
  return <Editor key={map.id} cid={cid} mapId={map.id} name={map.name} grid={map.grid} />;
}

function line(a: Pt, b: Pt): Pt[] {
  const out: Pt[] = [];
  let x = a.x, y = a.y;
  const dx = Math.abs(b.x - a.x), dy = -Math.abs(b.y - a.y);
  const sx = a.x < b.x ? 1 : -1, sy = a.y < b.y ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    out.push({ x, y });
    if (x === b.x && y === b.y) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
  return out;
}

function shapeCells(tool: Tool, a: Pt, b: Pt): Pt[] {
  if (tool === "line") return line(a, b);
  const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y);
  const out: Pt[] = [];
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (tool === "rect" || x === x0 || x === x1 || y === y0 || y === y1) out.push({ x, y });
    }
  }
  return out;
}

function Editor({ cid, mapId, name, grid }: { cid: string; mapId: string; name: string; grid: GridMap }) {
  const nav = useNavigate();
  const theme: GridTheme = grid.theme;
  const tiles = TILES[theme];
  const colorOf = (code: string) => tiles.find((t) => t.code === code)?.color ?? "#000";

  const cells = useRef<Cells>(fromRows(grid.rows, grid.w, grid.h));
  const dims = useRef({ w: grid.w, h: grid.h });
  const seed = useRef(grid.seed ?? 1);
  const undoStack = useRef<Snap[]>([]);
  const redoStack = useRef<Snap[]>([]);
  const [, setTick] = useState(0);
  const rerender = () => setTick((n) => n + 1);

  const [tool, setTool] = useState<Tool>("pencil");
  const [tile, setTile] = useState(defaultTile(theme));
  const [brush, setBrush] = useState(1);
  const [showGrid, setShowGrid] = useState(defaultGrid(theme));
  const [title, setTitle] = useState(name);
  const titleRef = useRef(name);
  const [genOpen, setGenOpen] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const view = useRef({ scale: 1, ox: 0, oy: 0 });
  const preview = useRef<{ tool: Tool; a: Pt; b: Pt } | null>(null);
  const raf = useRef(0);
  const pointers = useRef(new Map<number, Pt>());
  type Gesture =
    | { kind: "stroke"; start: Pt; last: Pt; before: Snap; painted: boolean }
    | { kind: "pan"; lx: number; ly: number }
    | { kind: "pinch"; d: number; cx: number; cy: number; scale: number; ox: number; oy: number };
  const gesture = useRef<Gesture | null>(null);

  // ── salvataggio (automatico, 0,7 s dopo l'ultima modifica) ──
  const dirty = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const save = useCallback(() => {
    clearTimeout(saveTimer.current);
    if (!dirty.current) return;
    dirty.current = false;
    const cur = useStore.getState().data[cid]?.maps.find((m) => m.id === mapId);
    if (!cur) return;
    useStore.getState().upsert(cid, "maps", {
      ...cur,
      name: titleRef.current.trim() || cur.name,
      grid: { theme, w: dims.current.w, h: dims.current.h, rows: toRows(cells.current), seed: seed.current },
    });
  }, [cid, mapId, theme]);
  const touch = useCallback(() => {
    dirty.current = true;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(save, 700);
  }, [save]);
  useEffect(() => () => save(), [save]);

  // ── disegno ──
  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const { scale, ox, oy } = view.current;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#0e0a07";
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);
    drawGrid(ctx, theme, cells.current, dims.current.w, dims.current.h, showGrid);
    const p = preview.current;
    if (p) {
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = colorOf(p.tool === "eraser" ? ERASE_CODE : tile);
      for (const c of shapeCells(p.tool, p.a, p.b)) {
        if (c.x >= 0 && c.y >= 0 && c.x < dims.current.w && c.y < dims.current.h) ctx.fillRect(c.x * CELL, c.y * CELL, CELL, CELL);
      }
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = "rgba(232,182,90,0.6)";
    ctx.lineWidth = 2 / scale;
    ctx.strokeRect(0, 0, dims.current.w * CELL, dims.current.h * CELL);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, showGrid, tile]);
  const requestDraw = useCallback(() => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(draw);
  }, [draw]);

  const fit = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const cw = wrap.clientWidth, ch = wrap.clientHeight;
    const s = Math.min(cw / (dims.current.w * CELL), ch / (dims.current.h * CELL)) * 0.96;
    view.current = { scale: s, ox: (cw - dims.current.w * CELL * s) / 2, oy: (ch - dims.current.h * CELL * s) / 2 };
    requestDraw();
  }, [requestDraw]);

  useEffect(() => {
    const wrap = wrapRef.current, cv = canvasRef.current;
    if (!wrap || !cv) return;
    let first = true;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      cv.width = Math.max(1, Math.floor(wrap.clientWidth * dpr));
      cv.height = Math.max(1, Math.floor(wrap.clientHeight * dpr));
      if (first) { first = false; fit(); } else requestDraw();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [fit, requestDraw]);
  useEffect(() => requestDraw(), [requestDraw]);

  const zoomAt = useCallback((px: number, py: number, f: number) => {
    const v = view.current;
    const s = Math.min(8, Math.max(0.15, v.scale * f));
    view.current = { scale: s, ox: px - ((px - v.ox) / v.scale) * s, oy: py - ((py - v.oy) / v.scale) * s };
    requestDraw();
  }, [requestDraw]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = cv.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0015));
    };
    cv.addEventListener("wheel", onWheel, { passive: false });
    return () => cv.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  // ── annulla / ripeti ──
  const snap = (): Snap => ({ rows: toRows(cells.current), w: dims.current.w, h: dims.current.h });
  const restore = (s: Snap) => {
    dims.current = { w: s.w, h: s.h };
    cells.current = fromRows(s.rows, s.w, s.h);
  };
  const pushUndo = (before: Snap) => {
    undoStack.current.push(before);
    if (undoStack.current.length > 60) undoStack.current.shift();
    redoStack.current = [];
    touch();
    rerender();
  };
  const undo = () => {
    const s = undoStack.current.pop();
    if (!s) return;
    redoStack.current.push(snap());
    restore(s);
    touch(); rerender(); requestDraw();
  };
  const redo = () => {
    const s = redoStack.current.pop();
    if (!s) return;
    undoStack.current.push(snap());
    restore(s);
    touch(); rerender(); requestDraw();
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ── operazioni sulle celle ──
  const inb = (c: Pt) => c.x >= 0 && c.y >= 0 && c.x < dims.current.w && c.y < dims.current.h;
  const clampPt = (c: Pt): Pt => ({ x: Math.min(dims.current.w - 1, Math.max(0, c.x)), y: Math.min(dims.current.h - 1, Math.max(0, c.y)) });
  const setCell = (x: number, y: number, code: string) => { if (x >= 0 && y >= 0 && x < dims.current.w && y < dims.current.h) cells.current[y][x] = code; };
  const paintAt = (c: Pt, code: string) => {
    const o = Math.floor(brush / 2);
    for (let j = 0; j < brush; j++) for (let i = 0; i < brush; i++) setCell(c.x - o + i, c.y - o + j, code);
  };
  const floodFill = (start: Pt, code: string) => {
    const target = cells.current[start.y][start.x];
    if (target === code) return false;
    const stack = [start];
    while (stack.length) {
      const { x, y } = stack.pop()!;
      if (!inb({ x, y }) || cells.current[y][x] !== target) continue;
      cells.current[y][x] = code;
      stack.push({ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 });
    }
    return true;
  };

  const local = (e: React.PointerEvent): Pt => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const toCell = (p: Pt): Pt => ({
    x: Math.floor((p.x - view.current.ox) / (view.current.scale * CELL)),
    y: Math.floor((p.y - view.current.oy) / (view.current.scale * CELL)),
  });

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    if (pointers.current.size === 2) {
      const g = gesture.current;
      if (g?.kind === "stroke") { restore(g.before); preview.current = null; }
      const [a, b] = [...pointers.current.values()];
      gesture.current = { kind: "pinch", d: Math.hypot(a.x - b.x, a.y - b.y) || 1, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, ...view.current };
      requestDraw();
      return;
    }
    if (pointers.current.size > 2) return;
    if (tool === "pan" || e.button === 1 || e.button === 2) {
      gesture.current = { kind: "pan", lx: p.x, ly: p.y };
      return;
    }
    const c = toCell(p);
    const before = snap();
    const code = tool === "eraser" ? ERASE_CODE : tile;
    if (tool === "fill") {
      if (inb(c) && floodFill(c, code)) pushUndo(before);
      gesture.current = null;
      requestDraw();
      return;
    }
    gesture.current = { kind: "stroke", start: clampPt(c), last: c, before, painted: false };
    if (tool === "pencil" || tool === "eraser") {
      if (inb(c)) { paintAt(c, code); (gesture.current as { painted: boolean }).painted = true; }
    } else {
      preview.current = { tool, a: clampPt(c), b: clampPt(c) };
    }
    requestDraw();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    const g = gesture.current;
    if (!g) return;
    if (g.kind === "pinch" && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const s = Math.min(8, Math.max(0.15, g.scale * (d / g.d)));
      const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      view.current = { scale: s, ox: cx - ((g.cx - g.ox) / g.scale) * s, oy: cy - ((g.cy - g.oy) / g.scale) * s };
      requestDraw();
    } else if (g.kind === "pan") {
      view.current = { ...view.current, ox: view.current.ox + p.x - g.lx, oy: view.current.oy + p.y - g.ly };
      g.lx = p.x; g.ly = p.y;
      requestDraw();
    } else if (g.kind === "stroke") {
      const c = toCell(p);
      if (tool === "pencil" || tool === "eraser") {
        const code = tool === "eraser" ? ERASE_CODE : tile;
        for (const q of line(g.last, c)) if (inb(q)) { paintAt(q, code); g.painted = true; }
        g.last = c;
      } else {
        preview.current = { tool, a: g.start, b: clampPt(c) };
      }
      requestDraw();
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (g?.kind === "stroke") {
      let changed = g.painted;
      const pv = preview.current;
      if (pv) {
        for (const c of shapeCells(pv.tool, pv.a, pv.b)) setCell(c.x, c.y, tile);
        changed = true;
      }
      preview.current = null;
      gesture.current = null;
      if (changed) pushUndo(g.before);
      requestDraw();
    } else if (g?.kind === "pinch") {
      if (pointers.current.size < 2) gesture.current = null;
    } else {
      gesture.current = null;
    }
  };

  // ── generazione automatica ──
  const applyGenerated = (w: number, h: number, c: Cells, s: number) => {
    const before = snap();
    dims.current = { w, h };
    cells.current = c;
    seed.current = s;
    pushUndo(before);
    fit();
    setGenOpen(false);
  };

  const exportPng = async () => {
    const cv = renderToCanvas({ theme, w: dims.current.w, h: dims.current.h, rows: toRows(cells.current) }, 3000, showGrid);
    const blob = await canvasToBlob(cv);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(titleRef.current || "mappa").replace(/[^\w-]+/g, "_")}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const center = () => {
    const r = wrapRef.current!.getBoundingClientRect();
    return { x: r.width / 2, y: r.height / 2 };
  };

  return (
    <div className="editor">
      <div className="editor-head">
        <button className="ghost" onClick={() => { save(); nav(`/map?m=${mapId}`); }}>← Mappe</button>
        <input className="title-input" value={title} aria-label="Nome della mappa"
          onChange={(e) => { setTitle(e.target.value); titleRef.current = e.target.value; touch(); }} />
        <button onClick={() => setGenOpen(true)}>🎲 Genera…</button>
        {!(isTauri() && (isAndroid() || isIos())) && <button onClick={exportPng}>⬇ PNG</button>}
      </div>

      <div className="tool-row">
        {TOOLS.map((t) => (
          <button key={t.id} className={tool === t.id ? "primary" : ""} title={t.label} aria-label={t.label} aria-pressed={tool === t.id} onClick={() => setTool(t.id)}>
            {t.icon}<span className="tl"> {t.label}</span>
          </button>
        ))}
        <span className="sep" />
        <button title="Annulla (Ctrl+Z)" aria-label="Annulla" disabled={!undoStack.current.length} onClick={undo}>↶</button>
        <button title="Ripeti (Ctrl+Y)" aria-label="Ripeti" disabled={!redoStack.current.length} onClick={redo}>↷</button>
        <span className="sep" />
        <button title="Riduci" aria-label="Riduci" onClick={() => { const c = center(); zoomAt(c.x, c.y, 1 / 1.25); }}>−</button>
        <button title="Ingrandisci" aria-label="Ingrandisci" onClick={() => { const c = center(); zoomAt(c.x, c.y, 1.25); }}>＋</button>
        <button title="Adatta alla finestra" aria-label="Adatta" onClick={fit}>⤢</button>
        <span className="sep" />
        <select aria-label="Dimensione pennello" value={brush} onChange={(e) => setBrush(+e.target.value)}>
          {[1, 2, 3, 5].map((n) => <option key={n} value={n}>Pennello {n}×{n}</option>)}
        </select>
        <label className="check"><input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} /> Griglia</label>
        <button className="ghost" title="Cancella tutto (si può annullare)" onClick={() => {
          const before = snap();
          cells.current = Array.from({ length: dims.current.h }, () => Array<string>(dims.current.w).fill(ERASE_CODE));
          pushUndo(before);
          requestDraw();
        }}>Svuota</button>
      </div>

      <div className="palette" role="group" aria-label="Elementi">
        {tiles.filter((t) => t.code !== ERASE_CODE).map((t) => (
          <button key={t.code} className={"swatch" + (tile === t.code && tool !== "eraser" ? " sel" : "")} title={t.label}
            onClick={() => { setTile(t.code); if (tool === "eraser" || tool === "pan") setTool("pencil"); }}>
            <i style={{ background: t.color }} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="editor-canvas" ref={wrapRef}>
        <canvas ref={canvasRef}
          style={{ cursor: tool === "pan" ? "grab" : "crosshair" }}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
          onContextMenu={(e) => e.preventDefault()} />
      </div>
      <p className="muted small editor-hint">Rotella o pizzico per lo zoom · tasto destro o “Sposta” per spostare la mappa · i muri si disegnano da soli ai bordi del pavimento · i segnaposto si mettono dalla pagina Mappa.</p>

      {genOpen && <GenerateModal theme={theme} onClose={() => setGenOpen(false)} onGenerate={applyGenerated} initialSeed={seed.current} />}
    </div>
  );
}

function GenerateModal({ theme, initialSeed, onClose, onGenerate }: {
  theme: GridTheme; initialSeed: number; onClose: () => void; onGenerate: (w: number, h: number, c: Cells, seed: number) => void;
}) {
  const [size, setSize] = useState<SizeKey>("medium");
  const [seedStr, setSeedStr] = useState(String(initialSeed));
  const [rooms, setRooms] = useState(DEFAULT_ROOMS.medium);
  const [loops, setLoops] = useState(true);
  const [fill, setFill] = useState(0.57);
  const [water, setWater] = useState(0.38);
  const [cities, setCities] = useState(4);
  const [w, h] = SIZES[theme][size];
  const seed = Math.abs(parseInt(seedStr, 10)) || 1;

  return (
    <Modal title="Genera automaticamente" onClose={onClose}>
      <p className="muted">Sostituisce il disegno attuale (con «Annulla» lo recuperi). Lo stesso numero di seme dà sempre la stessa mappa.</p>
      <Field label="Dimensione">
        <select value={size} onChange={(e) => { const s = e.target.value as SizeKey; setSize(s); setRooms(DEFAULT_ROOMS[s]); }}>
          {(Object.keys(SIZE_LABEL) as SizeKey[]).map((k) => <option key={k} value={k}>{SIZE_LABEL[k]} ({SIZES[theme][k][0]}×{SIZES[theme][k][1]})</option>)}
        </select>
      </Field>
      {theme === "dungeon" && (
        <>
          <Field label={`Stanze: ${rooms}`}><input type="range" min={4} max={40} value={rooms} onChange={(e) => setRooms(+e.target.value)} /></Field>
          <label className="check"><input type="checkbox" checked={loops} onChange={(e) => setLoops(e.target.checked)} /> Percorsi alternativi (anelli)</label>
        </>
      )}
      {theme === "cave" && (
        <Field label={`Roccia iniziale: ${Math.round(fill * 100)}%`} hint="Più alta = caverna più stretta e tortuosa">
          <input type="range" min={0.5} max={0.62} step={0.01} value={fill} onChange={(e) => setFill(+e.target.value)} />
        </Field>
      )}
      {theme === "overland" && (
        <>
          <Field label={`Acqua: ${Math.round(water * 100)}%`}><input type="range" min={0.2} max={0.6} step={0.02} value={water} onChange={(e) => setWater(+e.target.value)} /></Field>
          <Field label={`Città: ${cities}`}><input type="range" min={1} max={10} value={cities} onChange={(e) => setCities(+e.target.value)} /></Field>
        </>
      )}
      <Field label="Seme">
        <div className="row gap">
          <input inputMode="numeric" value={seedStr} onChange={(e) => setSeedStr(e.target.value.replace(/\D/g, "").slice(0, 10))} />
          <button type="button" onClick={() => setSeedStr(String(randomSeed()))}>🎲 Casuale</button>
        </div>
      </Field>
      <div className="row end">
        <button onClick={onClose}>Annulla</button>
        <button className="primary" onClick={() => onGenerate(w, h, generate({ theme, w, h, seed, rooms, loops, fill, water, cities }), seed)}>Genera</button>
      </div>
    </Modal>
  );
}
