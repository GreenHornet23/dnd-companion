// Legge il testo di un manuale PDF e ne ricava l'elenco degli incantesimi (inglese e italiano, 5e 2014 e 2024).
// Il riconoscimento si basa sul formato standard della scheda di un incantesimo: nome, riga "scuola/livello",
// poi "Tempo di lancio / Gittata / Componenti / Durata". Funziona solo su PDF con testo selezionabile (non scansioni).
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";
import { pdfjs, BlobRange, ASSETS } from "./pdfDoc";
import { createOcr, type Ocr, type OcrLang } from "./ocr";

export interface SpellRef {
  id: string;
  name: string;
  level: number;
  school: string;
  classes: string[];
  ritual: boolean;
  casting: string;
  range: string;
  components: string;
  duration: string;
  text: string;
  page: number;
}

export interface SpellIndex {
  bookId: string;
  indexedAt: number;
  pages: number;
  /** pagine senza testo selezionabile (immagini) */
  scannedPages: number;
  /** pagine lette con l'OCR */
  ocrPages: number;
  spells: SpellRef[];
}

export interface OcrOptions {
  lang: OcrLang;
  from: number;
  to: number;
  /** la pagina ha due colonne: si legge prima la sinistra, poi la destra */
  twoColumns: boolean;
  cache?: { get(page: number): Promise<string[] | undefined>; set(page: number, lines: string[]): Promise<void> };
}

export interface Line { text: string; page: number }

const SCHOOLS: Record<string, string> = {
  abjuration: "Abiurazione", abiurazione: "Abiurazione",
  conjuration: "Invocazione", invocazione: "Invocazione",
  divination: "Divinazione", divinazione: "Divinazione",
  enchantment: "Ammaliamento", ammaliamento: "Ammaliamento",
  evocation: "Evocazione", evocazione: "Evocazione",
  illusion: "Illusione", illusione: "Illusione",
  necromancy: "Necromanzia", necromanzia: "Necromanzia",
  transmutation: "Trasmutazione", trasmutazione: "Trasmutazione",
};

/** Nomi di classe inglesi → italiani (quelli usati dall'app) */
const CLASS_IT: Record<string, string> = {
  barbarian: "Barbaro", bard: "Bardo", cleric: "Chierico", druid: "Druido", fighter: "Guerriero", monk: "Monaco",
  paladin: "Paladino", ranger: "Ranger", rogue: "Ladro", sorcerer: "Stregone", warlock: "Warlock", wizard: "Mago",
  artificer: "Artefice",
};
export const normClass = (s: string) => {
  const k = s.trim().toLowerCase();
  if (CLASS_IT[k]) return CLASS_IT[k];
  const it = Object.values(CLASS_IT).find((v) => v.toLowerCase() === k);
  return it ?? s.trim();
};

const CASTING_RE = /^(casting\s*t[il1]me|tempo\s*di\s*lancio|tempo\s*di\s*esecuzione)\s*[:;.]?\s*/i;
const RANGE_RE = /^(range|gittata|raggio)\s*[:;.]?\s*/i;
const COMP_RE = /^(components|componenti)\s*[:;.]?\s*/i;
const DUR_RE = /^(duration|durata)\s*[:;.]?\s*/i;

export function parseHeader(raw: string): { level: number; school: string; classes: string[]; ritual: boolean } | null {
  const line = raw.replace(/\s+/g, " ").trim();
  if (line.length < 6 || line.length > 110) return null;
  const lower = line.toLowerCase();
  const words = lower.replace(/\([^)]*\)/g, " ").match(/[a-zà-ù]+/g) ?? [];
  const schoolWord = words.find((w) => SCHOOLS[w]);
  if (!schoolWord) return null;
  let level: number | undefined;
  if (/cantrip|trucchett/.test(lower)) level = 0;
  else {
    const m = lower.match(/(\d)\s*(?:st|nd|rd|th|°|º|ª|a)?[\s-]*(?:level|l[il1]vello)/) ?? lower.match(/(?:level|l[il1]vello)\s*(\d)/);
    if (m) level = +m[1];
  }
  if (level === undefined || level > 9) return null;
  // Troppe parole = è un periodo di testo, non una riga di intestazione
  if (words.length > 14) return null;
  const classes: string[] = [];
  let ritual = /\b(ritual|rituale)\b/.test(lower);
  for (const g of line.matchAll(/\(([^)]*)\)/g)) {
    for (const part of g[1].split(/[,;/]|\be\b|\band\b/i)) {
      const p = part.trim();
      if (!p) continue;
      if (/^(ritual|rituale)$/i.test(p)) { ritual = true; continue; }
      classes.push(normClass(p));
    }
  }
  return { level, school: SCHOOLS[schoolWord], classes, ritual };
}

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/** Trasforma le righe di testo di un manuale in incantesimi */
export function parseSpellLines(lines: Line[]): SpellRef[] {
  const heads: { i: number; h: NonNullable<ReturnType<typeof parseHeader>> }[] = [];
  for (let i = 1; i < lines.length; i++) {
    const h = parseHeader(lines[i].text);
    if (!h) continue;
    let ok = false;
    for (let k = i + 1; k <= i + 4 && k < lines.length; k++) if (CASTING_RE.test(lines[k].text.trim())) { ok = true; break; }
    if (ok) heads.push({ i, h });
  }
  const out: SpellRef[] = [];
  const seen = new Set<string>();
  heads.forEach(({ i, h }, n) => {
    const name = clean(lines[i - 1].text).replace(/[.:;]$/, "");
    if (!name || name.length > 60) return;
    const end = n + 1 < heads.length ? heads[n + 1].i - 1 : Math.min(lines.length, i + 80);
    const span = lines.slice(i + 1, Math.max(i + 1, end)).map((l) => l.text.trim());
    let casting = "", range = "", components = "", duration = "";
    let mode: "none" | "comp" | "desc" = "none";
    const desc: string[] = [];
    for (const raw of span) {
      if (!raw) continue;
      if (mode === "desc") { desc.push(raw); continue; }
      if (CASTING_RE.test(raw)) { casting = clean(raw.replace(CASTING_RE, "")); mode = "none"; }
      else if (RANGE_RE.test(raw)) { range = clean(raw.replace(RANGE_RE, "")); mode = "none"; }
      else if (COMP_RE.test(raw)) { components = clean(raw.replace(COMP_RE, "")); mode = "comp"; }
      else if (DUR_RE.test(raw)) { duration = clean(raw.replace(DUR_RE, "")); mode = "desc"; }
      else if (mode === "comp") components = clean(components + " " + raw);
    }
    if (!casting || !duration) return;
    const text = clean(desc.join(" ")).slice(0, 2500);
    const key = `${name.toLowerCase()}|${h.level}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      id: key, name, level: h.level, school: h.school, classes: [...new Set(h.classes)], ritual: h.ritual,
      casting, range, components, duration, text, page: lines[i].page,
    });
  });
  return out.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}

export interface TextItem { str: string; x: number; y: number; w: number; h: number }

/**
 * Mette in ordine di lettura gli elementi di testo di una pagina, anche su due colonne:
 * le righe a tutta larghezza (titoli) dividono la pagina in fasce; in ogni fascia si legge prima la colonna sinistra, poi la destra.
 */
export function orderPageItems(items: TextItem[], pageW: number): string[] {
  const its = items.filter((i) => i.str.trim());
  if (!its.length) return [];
  const mid = pageW / 2;
  const tol = 4;
  const kind = (i: TextItem): "L" | "R" | "F" => {
    const x1 = i.x + i.w;
    if (i.x < mid - tol && x1 > mid + tol) return "F"; // attraversa il centro
    return x1 <= mid + tol ? "L" : "R";
  };
  const ks = its.map(kind);
  const nL = ks.filter((k) => k === "L").length, nR = ks.filter((k) => k === "R").length, nF = ks.filter((k) => k === "F").length;
  const two = nL >= 8 && nR >= 8 && nL + nR >= 0.6 * its.length && nF <= 0.25 * its.length;

  const toLines = (arr: TextItem[]): { y: number; text: string }[] => {
    const sorted = [...arr].sort((a, b) => b.y - a.y || a.x - b.x);
    const rows: { y: number; items: TextItem[] }[] = [];
    for (const it of sorted) {
      const row = rows[rows.length - 1];
      const t = Math.max(2, (it.h || 8) * 0.35);
      if (row && Math.abs(row.y - it.y) <= t) row.items.push(it);
      else rows.push({ y: it.y, items: [it] });
    }
    return rows.map((r) => {
      r.items.sort((a, b) => a.x - b.x);
      let text = "", prevEnd = -1e9;
      for (const it of r.items) {
        const gap = it.x - prevEnd;
        if (text && gap > (it.h || 8) * 0.15 && !text.endsWith(" ") && !it.str.startsWith(" ")) text += " ";
        text += it.str;
        prevEnd = it.x + it.w;
      }
      return { y: r.y, text: text.trim() };
    }).filter((r) => r.text);
  };

  if (!two) return toLines(its).map((l) => l.text);

  // Fasce delimitate dagli elementi a tutta larghezza
  const full = its.filter((_, n) => ks[n] === "F");
  const fullLines = toLines(full);
  const cuts = fullLines.map((l) => l.y).sort((a, b) => b - a);
  const out: string[] = [];
  const side = its.filter((_, n) => ks[n] !== "F");
  const band = (hi: number, lo: number) => {
    const inBand = side.filter((i) => i.y < hi && i.y >= lo);
    const left = inBand.filter((i) => kind(i) === "L"), right = inBand.filter((i) => kind(i) === "R");
    out.push(...toLines(left).map((l) => l.text), ...toLines(right).map((l) => l.text));
  };
  let hi = Infinity;
  for (let n = 0; n < cuts.length; n++) {
    band(hi, cuts[n] + 0.01);
    out.push(fullLines.find((l) => l.y === cuts[n])!.text);
    hi = cuts[n];
  }
  band(hi, -Infinity);
  return out;
}

/** Disegna la pagina e la legge con l'OCR; con due colonne legge prima la metà sinistra, poi la destra */
async function ocrPage(page: Awaited<ReturnType<import("./pdfDoc").PDFDocumentProxy["getPage"]>>, ocr: Ocr, twoColumns: boolean): Promise<string[]> {
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(4, Math.max(1.5, 2200 / base.width));
  const vp = page.getViewport({ scale });
  const cv = document.createElement("canvas");
  cv.width = Math.floor(vp.width);
  cv.height = Math.floor(vp.height);
  await page.render({ canvas: cv, viewport: vp }).promise;
  if (!twoColumns) return ocr.read(cv);
  const half = Math.floor(cv.width / 2);
  const out: string[] = [];
  for (const [x0, w] of [[0, half], [half, cv.width - half]] as const) {
    const part = document.createElement("canvas");
    part.width = w;
    part.height = cv.height;
    part.getContext("2d")!.drawImage(cv, x0, 0, w, cv.height, 0, 0, w, cv.height);
    out.push(...(await ocr.read(part)));
  }
  cv.width = cv.height = 0;
  return out;
}

/** Estrae il testo di tutte le pagine, riga per riga */
export async function extractLines(blob: Blob, onProgress?: (done: number, total: number) => void, signal?: { cancelled: boolean }, ocrOpts?: OcrOptions): Promise<{ lines: Line[]; pages: number; scannedPages: number; ocrPages: number }> {
  const task = pdfjs.getDocument({ range: new BlobRange(blob), rangeChunkSize: 1 << 20, disableAutoFetch: true, ...ASSETS });
  const pdf = await task.promise;
  const lines: Line[] = [];
  let scannedPages = 0, ocrPages = 0;
  let ocr: Ocr | undefined;
  try {
    for (let p = 1; p <= pdf.numPages; p++) {
      if (signal?.cancelled) break;
      const page = await pdf.getPage(p);
      const tc = await page.getTextContent();
      const items: TextItem[] = [];
      for (const it of tc.items) {
        if (!("str" in it)) continue;
        items.push({ str: it.str, x: it.transform[4] as number, y: it.transform[5] as number, w: it.width, h: it.height || Math.abs(it.transform[3] as number) });
      }
      const view = page.view as number[];
      const chars = items.reduce((n, i) => n + i.str.trim().length, 0);
      if (chars >= 25) {
        for (const text of orderPageItems(items.map((i) => ({ ...i, x: i.x - view[0] })), view[2] - view[0])) lines.push({ text, page: p });
      } else {
        scannedPages++;
        if (ocrOpts && p >= ocrOpts.from && p <= ocrOpts.to) {
          let got = await ocrOpts.cache?.get(p);
          if (!got) {
            ocr ??= await createOcr(ocrOpts.lang);
            got = await ocrPage(page, ocr, ocrOpts.twoColumns);
            await ocrOpts.cache?.set(p, got);
          }
          ocrPages++;
          for (const text of got) lines.push({ text, page: p });
        }
      }
      page.cleanup();
      onProgress?.(p, pdf.numPages);
      if (p % 10 === 0) await new Promise((r) => setTimeout(r));
    }
  } finally {
    await ocr?.close();
    await task.destroy();
  }
  return { lines, pages: pdf.numPages, scannedPages, ocrPages };
}

/** Toglie intestazioni e numeri di pagina, che si ripetono quasi identici su molte pagine e finirebbero dentro il testo degli incantesimi */
export function dropRunningLines(lines: Line[], pages: number): Line[] {
  if (pages < 6) return lines;
  const norm = (t: string) => t.replace(/\d+/g, "#").replace(/\s+/g, " ").trim().toLowerCase();
  const seen = new Map<string, Set<number>>();
  for (const l of lines) {
    if (l.text.length > 60) continue;
    const k = norm(l.text);
    if (!seen.has(k)) seen.set(k, new Set());
    seen.get(k)!.add(l.page);
  }
  const limit = Math.max(4, pages * 0.3);
  return lines.filter((l) => l.text.length > 60 || (seen.get(norm(l.text))?.size ?? 0) < limit || /:\s*\S/.test(l.text) || !!parseHeader(l.text));
}

export async function indexBook(blob: Blob, bookId: string, onProgress?: (done: number, total: number) => void, signal?: { cancelled: boolean }, ocrOpts?: OcrOptions): Promise<SpellIndex> {
  const { lines, pages, scannedPages, ocrPages } = await extractLines(blob, onProgress, signal, ocrOpts);
  return { bookId, indexedAt: Date.now(), pages, scannedPages, ocrPages, spells: parseSpellLines(dropRunningLines(lines, pages)) };
}

const key = (cid: string, slotId: string) => `spells:${cid}:${slotId}`;
export const saveIndex = (cid: string, slotId: string, idx: SpellIndex) => idbSet(key(cid, slotId), idx);
export const loadIndex = async (cid: string, slotId: string) => (await idbGet(key(cid, slotId))) as SpellIndex | undefined;
export const deleteIndex = (cid: string, slotId: string) => idbDel(key(cid, slotId));

export const ocrCache = (cid: string, slotId: string, lang: OcrLang, twoColumns: boolean) => {
  const k = (p: number) => `ocr:${cid}:${slotId}:${lang}:${twoColumns ? 2 : 1}:${p}`;
  return {
    get: async (p: number) => (await idbGet(k(p))) as string[] | undefined,
    set: (p: number, lines: string[]) => idbSet(k(p), lines),
  };
};
