import type { GridMap, GridTheme } from "./types";
import { fromRows, type Cells } from "./gridGen";

/** Lato di una cella in unità logiche: editor ed esportazione disegnano con la stessa geometria. */
export const CELL = 24;

export interface TileDef {
  code: string;
  label: string;
  color: string;
}

const dungeonTiles = (floor: string, rock: string): TileDef[] => [
  { code: " ", label: "Roccia", color: rock },
  { code: ".", label: "Pavimento", color: floor },
  { code: "D", label: "Porta", color: "#8a5a2b" },
  { code: "S", label: "Porta segreta", color: "#5a3d1f" },
  { code: "U", label: "Scale", color: "#9c8f74" },
  { code: "~", label: "Acqua", color: "#4f7fa8" },
  { code: "O", label: "Pilastro", color: "#6b6b6b" },
  { code: "%", label: "Macerie", color: "#8d7b5c" },
];

export const TILES: Record<GridTheme, TileDef[]> = {
  dungeon: dungeonTiles("#cdbf9f", "#1a140f"),
  cave: dungeonTiles("#a89377", "#1b1510"),
  overland: [
    { code: " ", label: "Vuoto", color: "#e8dcbd" },
    { code: "w", label: "Mare", color: "#2f5d86" },
    { code: "a", label: "Acque basse", color: "#5b94b8" },
    { code: "p", label: "Pianura", color: "#a9c775" },
    { code: "f", label: "Foresta", color: "#5f8f4e" },
    { code: "h", label: "Colline", color: "#b5a26a" },
    { code: "m", label: "Montagne", color: "#8a8378" },
    { code: "n", label: "Vette innevate", color: "#f2f2f2" },
    { code: "d", label: "Deserto", color: "#e3c987" },
    { code: "x", label: "Palude", color: "#6f8f6a" },
    { code: "r", label: "Strada", color: "#a0763c" },
    { code: "c", label: "Città", color: "#b04a3a" },
    { code: "v", label: "Villaggio", color: "#c9834a" },
  ],
};

export const THEME_LABEL: Record<GridTheme, string> = { dungeon: "Dungeon", cave: "Caverna", overland: "Mappa del mondo" };
export const ERASE_CODE = " ";
export const defaultTile = (t: GridTheme) => (t === "overland" ? "p" : ".");
export const defaultGrid = (t: GridTheme) => t !== "overland";

const colorMap = (t: GridTheme): Record<string, string> => Object.fromEntries(TILES[t].map((d) => [d.code, d.color]));
const COLORS: Record<GridTheme, Record<string, string>> = { dungeon: colorMap("dungeon"), cave: colorMap("cave"), overland: colorMap("overland") };

type Ctx = CanvasRenderingContext2D;

function drawDungeon(ctx: Ctx, theme: GridTheme, cells: Cells, w: number, h: number, showGrid: boolean) {
  const col = COLORS[theme];
  const C = CELL;
  ctx.fillStyle = col[" "];
  ctx.fillRect(0, 0, w * C, h * C);
  const isVoid = (x: number, y: number) => x < 0 || y < 0 || x >= w || y >= h || cells[y][x] === " ";

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = cells[y][x];
      if (c === " ") continue;
      ctx.fillStyle = c === "~" ? col["~"] : col["."];
      ctx.fillRect(x * C, y * C, C, C);
    }
  }
  if (showGrid) {
    ctx.strokeStyle = "rgba(50,38,26,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (cells[y][x] !== " ") ctx.rect(x * C + 0.5, y * C + 0.5, C, C);
    ctx.stroke();
  }
  // muri: bordo tra cella aperta e roccia
  ctx.strokeStyle = "#2b1d12";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (cells[y][x] === " ") continue;
      const x0 = x * C, y0 = y * C;
      if (isVoid(x, y - 1)) { ctx.moveTo(x0, y0); ctx.lineTo(x0 + C, y0); }
      if (isVoid(x, y + 1)) { ctx.moveTo(x0, y0 + C); ctx.lineTo(x0 + C, y0 + C); }
      if (isVoid(x - 1, y)) { ctx.moveTo(x0, y0); ctx.lineTo(x0, y0 + C); }
      if (isVoid(x + 1, y)) { ctx.moveTo(x0 + C, y0); ctx.lineTo(x0 + C, y0 + C); }
    }
  }
  ctx.stroke();

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = cells[y][x];
      const x0 = x * C, y0 = y * C;
      if (c === "D" || c === "S") {
        const vertical = isVoid(x, y - 1) && isVoid(x, y + 1); // passaggio orizzontale: la porta è una barra verticale
        ctx.fillStyle = c === "D" ? "#8a5a2b" : "#4a3322";
        ctx.strokeStyle = "#2b1a0c";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (vertical) ctx.rect(x0 + C * 0.36, y0 + C * 0.1, C * 0.28, C * 0.8);
        else ctx.rect(x0 + C * 0.1, y0 + C * 0.36, C * 0.8, C * 0.28);
        ctx.fill();
        ctx.stroke();
        if (c === "S") {
          ctx.fillStyle = "#e8d9b8";
          ctx.font = `bold ${Math.round(C * 0.5)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("S", x0 + C / 2, y0 + C / 2 + 1);
        }
      } else if (c === "U") {
        ctx.fillStyle = col["U"];
        ctx.fillRect(x0 + 2, y0 + 2, C - 4, C - 4);
        ctx.strokeStyle = "#5c5240";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 1; i < 5; i++) { ctx.moveTo(x0 + 3, y0 + (C * i) / 5); ctx.lineTo(x0 + C - 3, y0 + (C * i) / 5); }
        ctx.stroke();
      } else if (c === "O") {
        ctx.fillStyle = col["O"];
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x0 + C / 2, y0 + C / 2, C * 0.32, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (c === "%") {
        ctx.fillStyle = col["%"];
        ctx.strokeStyle = "#5a4c36";
        ctx.lineWidth = 1;
        for (const [fx, fy, r] of [[0.3, 0.35, 3], [0.66, 0.3, 2.5], [0.5, 0.7, 3.2]]) {
          ctx.beginPath();
          ctx.arc(x0 + C * fx, y0 + C * fy, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      } else if (c === "~") {
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x0 + 4, y0 + C * 0.4);
        ctx.quadraticCurveTo(x0 + C * 0.35, y0 + C * 0.25, x0 + C * 0.5, y0 + C * 0.4);
        ctx.quadraticCurveTo(x0 + C * 0.65, y0 + C * 0.55, x0 + C - 4, y0 + C * 0.4);
        ctx.stroke();
      }
    }
  }
}

function drawOverland(ctx: Ctx, cells: Cells, w: number, h: number, showGrid: boolean) {
  const col = COLORS.overland;
  const C = CELL;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? "" : cells[y][x]);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = cells[y][x];
      const base = c === "r" || c === "c" || c === "v" ? col["p"] : col[c] ?? col[" "];
      ctx.fillStyle = base;
      ctx.fillRect(x * C, y * C, C + 0.5, C + 0.5);
    }
  }
  // strade: linee tra i centri di celle vicine
  ctx.strokeStyle = "#8a6232";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  const isRoad = (c: string) => c === "r" || c === "c" || c === "v";
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!isRoad(cells[y][x])) continue;
      for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) {
        if (isRoad(at(x + dx, y + dy))) {
          ctx.moveTo(x * C + C / 2, y * C + C / 2);
          ctx.lineTo((x + dx) * C + C / 2, (y + dy) * C + C / 2);
        }
      }
    }
  }
  ctx.stroke();
  // simboli
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = cells[y][x];
      const x0 = x * C, y0 = y * C;
      if (c === "m" || c === "n") {
        ctx.fillStyle = "#6c655b";
        ctx.beginPath();
        ctx.moveTo(x0 + C * 0.1, y0 + C * 0.85);
        ctx.lineTo(x0 + C * 0.5, y0 + C * 0.12);
        ctx.lineTo(x0 + C * 0.9, y0 + C * 0.85);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = c === "n" ? "#fafafa" : "#9b9488";
        ctx.beginPath();
        ctx.moveTo(x0 + C * 0.5, y0 + C * 0.12);
        ctx.lineTo(x0 + C * 0.5 + C * 0.17, y0 + C * 0.42);
        ctx.lineTo(x0 + C * 0.5 - C * 0.17, y0 + C * 0.42);
        ctx.closePath();
        ctx.fill();
      } else if (c === "h") {
        ctx.strokeStyle = "#8a7a45";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x0 + C * 0.5, y0 + C * 0.8, C * 0.32, Math.PI, 0);
        ctx.stroke();
      } else if (c === "f") {
        for (const [fx, fy] of [[0.3, 0.55], [0.68, 0.45]]) {
          ctx.fillStyle = "#3d6b3a";
          ctx.beginPath();
          ctx.arc(x0 + C * fx, y0 + C * fy, C * 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (c === "x") {
        ctx.strokeStyle = "#3f5f45";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (const fx of [0.3, 0.5, 0.7]) { ctx.moveTo(x0 + C * fx, y0 + C * 0.75); ctx.lineTo(x0 + C * fx, y0 + C * 0.45); }
        ctx.stroke();
      } else if (c === "d") {
        ctx.fillStyle = "#c9a85d";
        for (const [fx, fy] of [[0.25, 0.3], [0.7, 0.5], [0.4, 0.78]]) ctx.fillRect(x0 + C * fx, y0 + C * fy, 2, 2);
      } else if (c === "c") {
        ctx.fillStyle = "#b04a3a";
        ctx.strokeStyle = "#4a1f18";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.rect(x0 + C * 0.18, y0 + C * 0.3, C * 0.64, C * 0.5);
        ctx.fill();
        ctx.stroke();
        for (const fx of [0.18, 0.43, 0.68]) ctx.fillRect(x0 + C * fx, y0 + C * 0.2, C * 0.14, C * 0.12);
      } else if (c === "v") {
        ctx.fillStyle = "#c9834a";
        ctx.strokeStyle = "#5a3517";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.rect(x0 + C * 0.28, y0 + C * 0.45, C * 0.44, C * 0.35);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x0 + C * 0.2, y0 + C * 0.47);
        ctx.lineTo(x0 + C * 0.5, y0 + C * 0.22);
        ctx.lineTo(x0 + C * 0.8, y0 + C * 0.47);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
  }
  if (showGrid) {
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= w; x++) { ctx.moveTo(x * C + 0.5, 0); ctx.lineTo(x * C + 0.5, h * C); }
    for (let y = 0; y <= h; y++) { ctx.moveTo(0, y * C + 0.5); ctx.lineTo(w * C, y * C + 0.5); }
    ctx.stroke();
  }
}

/** Disegna la mappa nell'origine del contesto, in unità di CELL pixel per cella. */
export function drawGrid(ctx: Ctx, theme: GridTheme, cells: Cells, w: number, h: number, showGrid: boolean) {
  ctx.save();
  if (theme === "overland") drawOverland(ctx, cells, w, h, showGrid);
  else drawDungeon(ctx, theme, cells, w, h, showGrid);
  ctx.restore();
}

/** Disegna una mappa salvata su un canvas nuovo (per anteprima nella pagina Mappa ed esportazione PNG). */
export function renderToCanvas(grid: GridMap, maxSide = 2400, showGrid = grid.theme !== "overland"): HTMLCanvasElement {
  const cells = fromRows(grid.rows, grid.w, grid.h);
  const scale = Math.min(1, maxSide / (Math.max(grid.w, grid.h) * CELL));
  const cv = document.createElement("canvas");
  cv.width = Math.round(grid.w * CELL * scale);
  cv.height = Math.round(grid.h * CELL * scale);
  const ctx = cv.getContext("2d")!;
  ctx.scale(scale, scale);
  drawGrid(ctx, grid.theme, cells, grid.w, grid.h, showGrid);
  return cv;
}

export const canvasToBlob = (cv: HTMLCanvasElement) =>
  new Promise<Blob>((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error("Esportazione non riuscita"))), "image/png"));
