// Pre-elaborazione delle pagine scansionate prima dell'OCR: toglie le ombre e il fondo ingiallito,
// porta il testo a nero su bianco e trova da sola la separazione fra le colonne.

export interface Prepared {
  canvas: HTMLCanvasElement;
  /** frazione di pixel scuri: pagina bianca (~0) o piena di illustrazioni (alta) */
  ink: number;
  /** x (in pixel) del centro dello spazio fra due colonne, se la pagina ne ha due */
  gutter: number | null;
}

function otsu(hist: Uint32Array, total: number): number {
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, best = 0, thr = 128;
  for (let i = 0; i < 256; i++) {
    wB += hist[i];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += i * hist[i];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const v = wB * wF * (mB - mF) * (mB - mF);
    if (v > best) { best = v; thr = i; }
  }
  return thr;
}

/** Stima l'inclinazione della pagina (gradi) cercando l'angolo che rende più nette le righe di testo */
function skewAngle(bin: ImageData): number {
  const { width: w, height: h, data } = bin;
  const step = Math.max(1, Math.round(w / 700));
  const pts: number[] = [];
  for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) if (data[(y * w + x) * 4] < 128) pts.push(x, y);
  if (pts.length < 2000) return 0;
  let best = 0, bestScore = -1;
  const rows = new Float64Array(h + w + 8);
  for (let a = -3; a <= 3.001; a += 0.25) {
    const sin = Math.sin((a * Math.PI) / 180), cos = Math.cos((a * Math.PI) / 180);
    rows.fill(0);
    for (let i = 0; i < pts.length; i += 2) {
      const r = Math.round((pts[i + 1] * cos - pts[i] * sin) / step) + w;
      if (r >= 0 && r < rows.length) rows[r]++;
    }
    let sc = 0;
    for (let i = 0; i < rows.length; i++) sc += rows[i] * rows[i];
    if (sc > bestScore) { bestScore = sc; best = a; }
  }
  return best;
}

function deskew(cv: HTMLCanvasElement, data: ImageData): HTMLCanvasElement {
  const ang = skewAngle(data);
  if (Math.abs(ang) < 0.3) return cv;
  const out = document.createElement("canvas");
  out.width = cv.width; out.height = cv.height;
  const c = out.getContext("2d")!;
  c.fillStyle = "#fff";
  c.fillRect(0, 0, out.width, out.height);
  c.translate(out.width / 2, out.height / 2);
  c.rotate((-ang * Math.PI) / 180);
  c.drawImage(cv, -cv.width / 2, -cv.height / 2);
  cv.width = cv.height = 0;
  return out;
}

export function prepare(src: HTMLCanvasElement): Prepared {
  const w = src.width, h = src.height;
  const ctx = src.getContext("2d", { willReadFrequently: true })!;
  const img = ctx.getImageData(0, 0, w, h);
  const px = img.data;
  const gray = new Uint8ClampedArray(w * h);
  for (let i = 0, j = 0; i < px.length; i += 4, j++) gray[j] = (px[i] * 77 + px[i + 1] * 151 + px[i + 2] * 28) >> 8;

  // Sfondo stimato: la pagina rimpicciolita e riallargata (sfocatura forte); dividendo si eliminano ombre e macchie
  const sw = Math.max(8, Math.round(w / 24)), sh = Math.max(8, Math.round(h / 24));
  const g = document.createElement("canvas");
  g.width = w; g.height = h;
  const gctx = g.getContext("2d")!;
  const gi = gctx.createImageData(w, h);
  for (let i = 0, j = 0; j < gray.length; i += 4, j++) { gi.data[i] = gi.data[i + 1] = gi.data[i + 2] = gray[j]; gi.data[i + 3] = 255; }
  gctx.putImageData(gi, 0, 0);
  const small = document.createElement("canvas");
  small.width = sw; small.height = sh;
  const sctx = small.getContext("2d")!;
  sctx.imageSmoothingEnabled = true;
  sctx.drawImage(g, 0, 0, sw, sh);
  const bgc = document.createElement("canvas");
  bgc.width = w; bgc.height = h;
  const bctx = bgc.getContext("2d", { willReadFrequently: true })!;
  bctx.imageSmoothingEnabled = true;
  bctx.drawImage(small, 0, 0, w, h);
  const bg = bctx.getImageData(0, 0, w, h).data;

  const norm = new Uint8ClampedArray(w * h);
  const hist = new Uint32Array(256);
  for (let j = 0; j < norm.length; j++) {
    const b = Math.max(40, bg[j * 4]);
    const v = Math.min(255, (gray[j] * 255) / b);
    norm[j] = v;
    hist[v | 0]++;
  }
  const thr = Math.min(235, Math.max(90, otsu(hist, norm.length)));

  const out = ctx.createImageData(w, h);
  for (let j = 0; j < norm.length; j++) {
    const o = j * 4;
    const val = norm[j] < thr ? 0 : 255;
    out.data[o] = out.data[o + 1] = out.data[o + 2] = val;
    out.data[o + 3] = 255;
  }
  let dst = document.createElement("canvas");
  dst.width = w; dst.height = h;
  dst.getContext("2d")!.putImageData(out, 0, 0);
  dst = deskew(dst, out);

  // Pixel scuri e profilo verticale dell'inchiostro (dopo il raddrizzamento)
  const fin = dst.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, w, h).data;
  let dark = 0;
  const colInk = new Uint32Array(w);
  const y0 = Math.floor(h * 0.12), y1 = Math.floor(h * 0.88);
  for (let y = 0, j = 0; y < h; y++) {
    for (let x = 0; x < w; x++, j++) {
      if (fin[j * 4] < 128) { dark++; if (y >= y0 && y < y1) colInk[x]++; }
    }
  }

  // Spazio fra le colonne: la fascia vuota più larga vicino al centro, con testo su entrambi i lati
  let gutter: number | null = null;
  const band = y1 - y0;
  const empty = (x: number) => colInk[x] <= band * 0.004;
  let bestRun = 0, bestStart = 0, run = 0, start = 0;
  for (let x = Math.floor(w * 0.36); x <= Math.floor(w * 0.64); x++) {
    if (empty(x)) { if (!run) start = x; run++; if (run > bestRun) { bestRun = run; bestStart = start; } } else run = 0;
  }
  if (bestRun >= w * 0.012) {
    const c = bestStart + bestRun / 2;
    let left = 0, right = 0;
    for (let x = 0; x < w; x++) { if (x < c) left += colInk[x]; else right += colInk[x]; }
    const tot = left + right;
    if (tot > 0 && left / tot > 0.25 && right / tot > 0.25) gutter = c;
  }
  return { canvas: dst, ink: dark / (w * h), gutter };
}
