import type { GridTheme } from "./types";

export type Cells = string[][];

export const blank = (w: number, h: number, c: string): Cells => Array.from({ length: h }, () => Array<string>(w).fill(c));
export const toRows = (cells: Cells): string[] => cells.map((r) => r.join(""));
export const fromRows = (rows: string[], w: number, h: number, fill = " "): Cells =>
  Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => rows[y]?.[x] ?? fill));

/** Generatore pseudo-casuale con seme (mulberry32): stesso seme = stessa mappa. */
export function rngFrom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const randomSeed = () => Math.floor(Math.random() * 1_000_000_000);

export type SizeKey = "small" | "medium" | "large";
export const SIZES: Record<GridTheme, Record<SizeKey, [number, number]>> = {
  dungeon: { small: [40, 30], medium: [64, 44], large: [90, 60] },
  cave: { small: [40, 30], medium: [64, 44], large: [90, 60] },
  overland: { small: [60, 40], medium: [100, 70], large: [140, 96] },
};
export const SIZE_LABEL: Record<SizeKey, string> = { small: "Piccola", medium: "Media", large: "Grande" };
export const DEFAULT_ROOMS: Record<SizeKey, number> = { small: 8, medium: 14, large: 24 };

// ───────────────────────── Dungeon: stanze e corridoi ─────────────────────────
export interface DungeonOpts {
  rooms: number;
  /** collegamenti extra tra stanze, così ci sono percorsi alternativi */
  loops: boolean;
}

export function generateDungeon(w: number, h: number, seed: number, opts: DungeonOpts): Cells {
  const rnd = rngFrom(seed);
  const ri = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
  const cells = blank(w, h, " ");
  interface Room { x: number; y: number; w: number; h: number }
  const rooms: Room[] = [];
  const maxW = Math.max(4, Math.min(10, w - 6));
  const maxH = Math.max(4, Math.min(9, h - 6));
  for (let t = 0; t < opts.rooms * 25 && rooms.length < opts.rooms; t++) {
    const rw = ri(4, maxW), rh = ri(4, maxH);
    if (w - rw - 3 < 2 || h - rh - 3 < 2) continue;
    const x = ri(2, w - rw - 3), y = ri(2, h - rh - 3);
    if (rooms.some((r) => x < r.x + r.w + 2 && x + rw + 2 > r.x && y < r.y + r.h + 2 && y + rh + 2 > r.y)) continue;
    rooms.push({ x, y, w: rw, h: rh });
  }

  const mask = blank(w, h, "").map((r) => r.map(() => false));
  for (const r of rooms) {
    const chamfer = r.w >= 6 && r.h >= 6 && rnd() < 0.3;
    for (let yy = 0; yy < r.h; yy++) {
      for (let xx = 0; xx < r.w; xx++) {
        if (chamfer && (xx === 0 || xx === r.w - 1) && (yy === 0 || yy === r.h - 1)) continue;
        cells[r.y + yy][r.x + xx] = ".";
        mask[r.y + yy][r.x + xx] = true;
      }
    }
  }

  const corr = mask.map((row) => row.map(() => false));
  const center = (r: Room) => ({ x: r.x + (r.w >> 1), y: r.y + (r.h >> 1) });
  const mark = (x: number, y: number) => {
    if (cells[y][x] === " ") {
      cells[y][x] = ".";
      corr[y][x] = true;
    }
  };
  const carve = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    let { x, y } = a;
    const horizontalFirst = rnd() < 0.5;
    const goH = () => { while (x !== b.x) { x += Math.sign(b.x - x); mark(x, y); } };
    const goV = () => { while (y !== b.y) { y += Math.sign(b.y - y); mark(x, y); } };
    if (horizontalFirst) { goH(); goV(); } else { goV(); goH(); }
  };
  const order = rooms.map((_, i) => i).sort((a, b) => center(rooms[a]).x - center(rooms[b]).x);
  for (let i = 0; i + 1 < order.length; i++) carve(center(rooms[order[i]]), center(rooms[order[i + 1]]));
  if (opts.loops && rooms.length > 3) {
    for (let k = 0; k < Math.floor(rooms.length / 4); k++) {
      const a = ri(0, rooms.length - 1), b = ri(0, rooms.length - 1);
      if (a !== b) carve(center(rooms[a]), center(rooms[b]));
    }
  }

  // porte: dove un corridoio incontra una stanza ed è stretto (muro da entrambi i lati)
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const isVoid = (x: number, y: number) => x < 0 || y < 0 || x >= w || y >= h || cells[y][x] === " ";
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (!corr[y][x] || cells[y][x] !== ".") continue;
      for (const [dx, dy] of dirs) {
        if (!mask[y + dy]?.[x + dx]) continue;
        if (isVoid(x + dy, y + dx) && isVoid(x - dy, y - dx) && rnd() < 0.75) {
          cells[y][x] = rnd() < 0.1 ? "S" : "D";
        }
        break;
      }
    }
  }

  // arredi
  for (const r of rooms) {
    if (r.w >= 7 && r.h >= 7 && rnd() < 0.4) {
      for (const [px, py] of [[r.x + 2, r.y + 2], [r.x + r.w - 3, r.y + 2], [r.x + 2, r.y + r.h - 3], [r.x + r.w - 3, r.y + r.h - 3]]) {
        if (cells[py][px] === ".") cells[py][px] = "O";
      }
    } else if (r.w >= 6 && r.h >= 6 && rnd() < 0.15) {
      const cx = r.x + (r.w - 1) / 2, cy = r.y + (r.h - 1) / 2;
      const rx = r.w / 2 - 1.6, ry = r.h / 2 - 1.6;
      for (let yy = r.y; yy < r.y + r.h; yy++) {
        for (let xx = r.x; xx < r.x + r.w; xx++) {
          if (cells[yy][xx] === "." && ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1) cells[yy][xx] = "~";
        }
      }
    }
    if (rnd() < 0.2) {
      for (let k = 0; k < 3; k++) {
        const xx = ri(r.x, r.x + r.w - 1), yy = ri(r.y, r.y + r.h - 1);
        if (cells[yy][xx] === ".") cells[yy][xx] = "%";
      }
    }
  }
  if (rooms.length) {
    for (const idx of [order[0], order[order.length - 1]]) {
      const r = rooms[idx];
      const c = center(r);
      if (cells[r.y + 1][r.x + 1] === ".") cells[r.y + 1][r.x + 1] = "U";
      else if (cells[c.y][c.x] === ".") cells[c.y][c.x] = "U";
    }
  }
  return cells;
}

// ───────────────────────── Caverna: automa cellulare ─────────────────────────
export interface CaveOpts {
  /** frazione iniziale di roccia (0.5–0.62): più è alta, più la caverna è stretta e tortuosa */
  fill: number;
}

function largestRegion(open: boolean[][], w: number, h: number): boolean[][] {
  const label = Array.from({ length: h }, () => Array<number>(w).fill(0));
  let best = 0, bestId = 0, id = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!open[y][x] || label[y][x]) continue;
      id++;
      let size = 0;
      const stack = [[x, y]];
      label[y][x] = id;
      while (stack.length) {
        const [cx, cy] = stack.pop()!;
        size++;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (nx >= 0 && ny >= 0 && nx < w && ny < h && open[ny][nx] && !label[ny][nx]) {
            label[ny][nx] = id;
            stack.push([nx, ny]);
          }
        }
      }
      if (size > best) { best = size; bestId = id; }
    }
  }
  return label.map((row) => row.map((l) => l === bestId && bestId !== 0));
}

export function generateCave(w: number, h: number, seed: number, opts: CaveOpts): Cells {
  let bestCells: Cells = blank(w, h, " ");
  let bestCount = -1;
  for (let attempt = 0; attempt < 8; attempt++) {
    const rnd = rngFrom(seed + attempt * 7919);
    let wall = Array.from({ length: h }, (_, y) =>
      Array.from({ length: w }, (_, x) => x === 0 || y === 0 || x === w - 1 || y === h - 1 || rnd() < opts.fill));
    for (let it = 0; it < 5; it++) {
      wall = wall.map((row, y) =>
        row.map((_, x) => {
          if (x === 0 || y === 0 || x === w - 1 || y === h - 1) return true;
          let n = 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h || wall[ny][nx]) n++;
          }
          return n >= 5;
        }));
    }
    const open = largestRegion(wall.map((r) => r.map((v) => !v)), w, h);
    const count = open.flat().filter(Boolean).length;
    if (count > bestCount) {
      bestCount = count;
      bestCells = open.map((r) => r.map((v) => (v ? "." : " ")));
    }
    if (count >= w * h * 0.3) break;
  }
  const rnd = rngFrom(seed ^ 0x9e3779b9);
  const floor: [number, number][] = [];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (bestCells[y][x] === ".") floor.push([x, y]);
  // stalagmiti dove c'è spazio libero attorno, pozze d'acqua, scale
  for (const [x, y] of floor) {
    let all = true;
    for (let dy = -1; dy <= 1 && all; dy++) for (let dx = -1; dx <= 1; dx++) if (bestCells[y + dy][x + dx] !== ".") { all = false; break; }
    if (all && rnd() < 0.012) bestCells[y][x] = "O";
  }
  if (floor.length > 50) {
    for (let k = 0; k < 2; k++) {
      const [px, py] = floor[Math.floor(rnd() * floor.length)];
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const x = px + dx, y = py + dy;
        if (dx * dx + dy * dy <= 4 && bestCells[y]?.[x] === ".") bestCells[y][x] = "~";
      }
    }
    const [sx, sy] = floor[Math.floor(rnd() * floor.length)];
    if (bestCells[sy][sx] === ".") bestCells[sy][sx] = "U";
  }
  return bestCells;
}

// ───────────────────────── Mappa del mondo: rumore + strade ─────────────────────────
export interface OverlandOpts {
  /** frazione di mappa coperta da acqua (0.2–0.6) */
  water: number;
  cities: number;
}

function hash(ix: number, iy: number, s: number) {
  let h = Math.imul(ix | 0, 374761393) ^ Math.imul(iy | 0, 668265263) ^ Math.imul(s | 0, 1013904223);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise(x: number, y: number, s: number) {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = x - x0, fy = y - y0;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(x0, y0, s), b = hash(x0 + 1, y0, s), c = hash(x0, y0 + 1, s), d = hash(x0 + 1, y0 + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x: number, y: number, s: number, octaves = 5) {
  let amp = 1, freq = 1, sum = 0, norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += vnoise(x * freq, y * freq, s + o * 101) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

class MinHeap {
  private a: [number, number][] = [];
  get size() { return this.a.length; }
  push(k: number, v: number) {
    const a = this.a;
    a.push([k, v]);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p][0] <= a[i][0]) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop(): [number, number] {
    const a = this.a;
    const top = a[0];
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

const ROAD_COST: Record<string, number> = { p: 1, f: 2, h: 3, d: 2, x: 4, m: 9, n: 20, a: 6, c: 1, v: 1, r: 0.4 };

function findPath(cells: Cells, w: number, h: number, from: [number, number], to: [number, number]): { path: [number, number][]; cost: number } | null {
  const N = w * h;
  const dist = new Float64Array(N).fill(Infinity);
  const prev = new Int32Array(N).fill(-1);
  const heap = new MinHeap();
  const s = from[1] * w + from[0], t = to[1] * w + to[0];
  dist[s] = 0;
  heap.push(0, s);
  while (heap.size) {
    const [d, u] = heap.pop();
    if (d > dist[u]) continue;
    if (u === t) break;
    const ux = u % w, uy = (u / w) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = ux + dx, ny = uy + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const c = ROAD_COST[cells[ny][nx]];
      if (c === undefined) continue; // acqua profonda e vuoto: non si attraversano
      const nd = d + c * (dx && dy ? 1.414 : 1);
      const v = ny * w + nx;
      if (nd < dist[v]) {
        dist[v] = nd;
        prev[v] = u;
        heap.push(nd, v);
      }
    }
  }
  if (!isFinite(dist[t])) return null;
  const path: [number, number][] = [];
  for (let u = t; u !== -1; u = prev[u]) path.push([u % w, (u / w) | 0]);
  return { path: path.reverse(), cost: dist[t] };
}

export function generateOverland(w: number, h: number, seed: number, opts: OverlandOpts): Cells {
  const rnd = rngFrom(seed);
  const elev: number[][] = [];
  const flat: number[] = [];
  for (let y = 0; y < h; y++) {
    const row: number[] = [];
    for (let x = 0; x < w; x++) {
      const dx = (x / (w - 1)) * 2 - 1, dy = (y / (h - 1)) * 2 - 1;
      const d = Math.min(1, Math.sqrt(dx * dx + dy * dy) / 1.15);
      const e = fbm(x / 20, y / 20, seed) - 0.55 * d * d;
      row.push(e);
      flat.push(e);
    }
    elev.push(row);
  }
  flat.sort((a, b) => a - b);
  const sea = flat[Math.min(flat.length - 1, Math.floor(opts.water * flat.length))];
  const maxE = flat[flat.length - 1];
  const cells = blank(w, h, "p");
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const e = elev[y][x];
      if (e < sea) { cells[y][x] = e < sea - 0.07 ? "w" : "a"; continue; }
      const t = (e - sea) / Math.max(1e-6, maxE - sea);
      const m = fbm(x / 14 + 50, y / 14 + 50, seed + 777);
      cells[y][x] = t > 0.9 ? "n" : t > 0.72 ? "m" : t > 0.5 ? "h" : m > 0.6 ? "f" : m < 0.32 ? "d" : t < 0.08 && m > 0.52 ? "x" : "p";
    }
  }

  const sites: { x: number; y: number; code: string }[] = [];
  const place = (count: number, minDist: number, code: string) => {
    let placed = 0;
    for (let t = 0; t < count * 300 && placed < count; t++) {
      const x = 2 + Math.floor(rnd() * (w - 4)), y = 2 + Math.floor(rnd() * (h - 4));
      if (cells[y][x] !== "p") continue;
      if (sites.some((s) => Math.hypot(s.x - x, s.y - y) < minDist)) continue;
      sites.push({ x, y, code });
      cells[y][x] = code;
      placed++;
    }
  };
  const scale = Math.sqrt((w * h) / 4000);
  place(opts.cities, Math.max(8, 14 * scale), "c");
  place(Math.round(opts.cities * 2.5), Math.max(5, 7 * scale), "v");

  const roadFrom = (a: { x: number; y: number }, b: { x: number; y: number }, maxCost: number) => {
    const res = findPath(cells, w, h, [a.x, a.y], [b.x, b.y]);
    if (!res || res.cost > maxCost) return;
    for (const [x, y] of res.path) if (cells[y][x] !== "c" && cells[y][x] !== "v") cells[y][x] = "r";
  };
  const cities = sites.filter((s) => s.code === "c");
  const connected = cities.slice(0, 1);
  for (const c of cities.slice(1)) {
    const near = [...connected].sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y))[0];
    roadFrom(c, near, 400);
    connected.push(c);
  }
  for (const v of sites.filter((s) => s.code === "v")) {
    const near = [...cities].sort((a, b) => Math.hypot(a.x - v.x, a.y - v.y) - Math.hypot(b.x - v.x, b.y - v.y))[0];
    if (near) roadFrom(v, near, 70 * scale);
  }
  return cells;
}

// ───────────────────────── Interfaccia unica ─────────────────────────
export interface GenOptions {
  theme: GridTheme;
  w: number;
  h: number;
  seed: number;
  rooms?: number;
  loops?: boolean;
  fill?: number;
  water?: number;
  cities?: number;
}

export function generate(o: GenOptions): Cells {
  switch (o.theme) {
    case "dungeon": return generateDungeon(o.w, o.h, o.seed, { rooms: o.rooms ?? 14, loops: o.loops ?? true });
    case "cave": return generateCave(o.w, o.h, o.seed, { fill: o.fill ?? 0.57 });
    case "overland": return generateOverland(o.w, o.h, o.seed, { water: o.water ?? 0.38, cities: o.cities ?? 4 });
  }
}
