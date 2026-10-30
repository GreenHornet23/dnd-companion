// Legge il testo di un manuale PDF e ne ricava l'elenco degli incantesimi (inglese e italiano, 5e 2014 e 2024).
// Il riconoscimento si basa sul formato standard della scheda di un incantesimo: nome, riga "scuola/livello",
// poi "Tempo di lancio / Gittata / Componenti / Durata". Funziona solo su PDF con testo selezionabile (non scansioni).
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";
import { pdfjs, BlobRange, ASSETS } from "./pdfDoc";
import { createOcr, ocrWorkers, type Ocr, type OcrLang } from "./ocr";
import { prepare } from "./imgPrep";
import { isAndroid, isIos } from "./platform";

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
  /** il livello o la scuola sono stati dedotti da un testo letto male: da verificare */
  uncertain?: boolean;
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
  /** classi per incantesimo, ricavate dagli elenchi per classe del manuale (nome minuscolo → classi) */
  classLists?: Record<string, string[]>;
}

export interface OcrOptions {
  lang: OcrLang;
  from: number;
  to: number;
  /** "auto": si accorge da sola se la pagina ha due colonne; altrimenti forzato */
  columns: "auto" | 1 | 2;
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

const VOCAB = ["instantaneous", "concentration", "reaction", "dispelled", "minutes", "minute", "hours", "hour", "round", "rounds", "bonus", "action", "special", "touch", "self", "sight", "feet", "mile", "miles", "until", "istantanea", "concentrazione", "reazione", "dissolto", "minuti", "minuto", "ore", "azione", "speciale", "contatto", "personale", "vista", "metri", "fino", "bonus"];
const VOCAB_SET = new Set(VOCAB);

/** Corregge gli errori tipici dell'OCR nei campi brevi (tempo di lancio, gittata, durata) con un piccolo vocabolario */
export function fixShortField(text: string): string {
  const t = text.replace(/^[|lI!]\s+(?=\S)/, "1 ").replace(/\b[|I](?=\s*(?:action|reaction|minute|hour|round|azione|reazione|minuto|ora)\b)/gi, "1");
  return t.replace(/[A-Za-zà-ù]{6,}/g, (w) => {
    const lw = w.toLowerCase();
    if (VOCAB_SET.has(lw)) return w;
    let best = "", bd = 99;
    for (const v of VOCAB) {
      if (Math.abs(v.length - lw.length) > 3) continue;
      const d = lev(lw, v);
      if (d < bd) { bd = d; best = v; }
    }
    return best && bd <= Math.ceil(lw.length * 0.3) ? (w[0] === w[0].toUpperCase() ? best[0].toUpperCase() + best.slice(1) : best) : w;
  });
}

/** Trasforma le righe di testo di un manuale in incantesimi */
// ---- Etichette tolleranti agli errori dell'OCR ("Casting T:me", "Duiation") ----
type Label = "casting" | "range" | "components" | "duration";
const LABELS: [Label, string[]][] = [
  ["casting", ["castingtime", "tempodilancio", "tempodiesecuzione"]],
  ["range", ["range", "gittata", "raggio"]],
  ["components", ["components", "componenti"]],
  ["duration", ["duration", "durata"]],
];

function lev(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

const letters = (t: string) => t.toLowerCase().replace(/[^a-zà-ù]/g, "");

/** Se la riga inizia con un'etichetta (anche letta male) ritorna quale e il valore che segue */
export function labelOf(raw: string): { kind: Label; value: string } | null {
  const text = raw.trim();
  if (text.length < 4) return null;
  const tryLabel = (labelText: string): Label | null => {
    const l = letters(labelText);
    if (l.length < 4 || l.length > 18) return null;
    for (const [kind, names] of LABELS) {
      for (const n of names) {
        const max = n.length <= 5 ? 1 : Math.max(1, Math.floor(n.length * 0.22));
        if (lev(l, n) <= max) return kind;
      }
    }
    return null;
  };
  const colon = text.search(/[:;]/);
  if (colon > 0 && colon <= 22) {
    const k = tryLabel(text.slice(0, colon));
    if (k) return { kind: k, value: clean(text.slice(colon + 1)) };
  }
  // senza i due punti (persi dall'OCR): provo con le prime 1-3 parole
  const w = text.split(/\s+/);
  for (let n = Math.min(3, w.length - 1); n >= 1; n--) {
    const k = tryLabel(w.slice(0, n).join(" "));
    if (k) return { kind: k, value: clean(w.slice(n).join(" ")) };
  }
  return null;
}

const isCasting = (t: string) => labelOf(t)?.kind === "casting";

/** Trasforma le righe di testo di un manuale in incantesimi */
export function parseSpellLines(lines: Line[]): SpellRef[] {
  type Head = { i: number; level: number; school: string; classes: string[]; ritual: boolean; uncertain: boolean };
  const heads: Head[] = [];
  const castingAt: number[] = [];
  lines.forEach((l, i) => { if (isCasting(l.text)) castingAt.push(i); });
  const covered = new Set<number>();
  for (let i = 1; i < lines.length; i++) {
    const h = parseHeader(lines[i].text);
    if (!h) continue;
    const c = castingAt.find((k) => k > i && k <= i + 4);
    if (c === undefined) continue;
    heads.push({ i, ...h, uncertain: false });
    covered.add(c);
  }
  // "Tempo di lancio" non preceduto da una riga di livello riconoscibile: il livello è stato letto male (OCR)
  for (const c of castingAt) {
    if (covered.has(c) || c < 2) continue;
    const prev = lines[c - 1].text;
    if (heads.some((h) => h.i === c - 1)) continue;
    const low = prev.toLowerCase();
    const m = low.match(/(\d)\s*(?:st|nd|rd|th|°|º|ª|a)?[\s-]*(?:le|li|liv)/) ?? low.match(/(?:level|livello|l[il1]vello)\s*(\d)/);
    const level = /cantrip|trucchett/.test(low) ? 0 : m ? Math.min(9, +m[1]) : 1;
    const school = Object.entries(SCHOOLS).find(([k]) => low.split(/[^a-zà-ù]+/).some((w) => w.length >= 6 && lev(w, k) <= 2))?.[1] ?? "";
    heads.push({ i: c - 1, level, school, classes: [], ritual: /ritual|rituale/.test(low), uncertain: true });
  }
  heads.sort((a, b) => a.i - b.i);

  const out: SpellRef[] = [];
  const seen = new Set<string>();
  heads.forEach((h, n) => {
    const i = h.i;
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
      const lab = labelOf(raw);
      if (lab?.kind === "casting") { casting = lab.value; mode = "none"; }
      else if (lab?.kind === "range") { range = lab.value; mode = "none"; }
      else if (lab?.kind === "components") { components = lab.value; mode = "comp"; }
      else if (lab?.kind === "duration") { duration = lab.value; mode = "desc"; }
      else if (mode === "comp") components = clean(components + " " + raw);
    }
    if (!casting || !duration) return;
    const text = clean(desc.join(" ")).slice(0, 2500);
    const key = `${name.toLowerCase()}|${h.level}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      id: key, name, level: h.level, school: h.school, classes: [...new Set(h.classes)], ritual: h.ritual,
      casting: fixShortField(casting), range: fixShortField(range), components, duration: fixShortField(duration), text, page: lines[i].page, ...(h.uncertain ? { uncertain: true } : {}),
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


const CLASS_WORDS = "barbarian|bard|cleric|druid|fighter|monk|paladin|ranger|rogue|sorcerer|warlock|wizard|artificer|barbaro|bardo|chierico|druido|guerriero|monaco|ladro|stregone|mago|artefice";

/** Riconosce un titolo di elenco ("Bard Spells", "Incantesimi del Mago", "Wizard Spell List") */
export function classHeading(raw: string): string | null {
  const t = raw.replace(/\s+/g, " ").trim().replace(/[:.]$/, "");
  if (t.length > 40) return null;
  const m =
    t.match(new RegExp(`^(${CLASS_WORDS})\\s+spells?(?:\\s+list)?$`, "i")) ??
    t.match(new RegExp(`^(?:lista\\s+degli\\s+)?incantesimi\\s+(?:del|della|dello|dell'|di)\\s*(${CLASS_WORDS})$`, "i")) ??
    t.match(new RegExp(`^(?:lista\\s+(?:degli\\s+)?incantesimi\\s+(?:del|della)\\s+)(${CLASS_WORDS})$`, "i")) ??
    t.match(new RegExp(`^(${CLASS_WORDS})\\s+(?:spell\\s+list|incantesimi)$`, "i"));
  return m ? normClass(m[1]) : null;
}

export const normName = (t: string) =>
  t.toLowerCase().replace(/\((?:ritual|rituale|r)\)/g, " ").replace(/[*†‡•·]/g, " ").replace(/[^a-zà-ù0-9'’ -]/g, " ").replace(/\s+/g, " ").trim();

/**
 * Cerca nel testo gli elenchi per classe (tipici dei manuali 2014: "Bard Spells", poi i nomi in colonna)
 * e ritorna, per ogni incantesimo noto, le classi che lo hanno. Si considerano solo nomi già letti dal manuale.
 */
export function extractClassLists(lines: Line[], names: string[]): Record<string, string[]> {
  const known = new Set(names.map(normName));
  const out: Record<string, Set<string>> = {};
  let current: string | null = null;
  let since = 0;
  const add = (n: string) => { (out[n] ??= new Set()).add(current!); since = 0; };
  for (const l of lines) {
    const head = classHeading(l.text);
    if (head) { current = head; since = 0; continue; }
    if (!current) continue;
    // fine dell'elenco: iniziano le schede degli incantesimi, oppure troppe righe senza incantesimi
    if (isCasting(l.text) || ++since > 40) { current = null; continue; }
    const t = normName(l.text);
    if (!t) continue;
    if (known.has(t)) { add(t); continue; }
    // più nomi sulla stessa riga, oppure nome seguito da colonne (scuola, componenti)
    for (const part of l.text.split(/[,;]/)) {
      const p = normName(part);
      if (known.has(p)) { add(p); continue; }
      const w = p.split(" ");
      for (let n = Math.min(6, w.length - 1); n >= 1; n--) {
        const cand = w.slice(0, n).join(" ");
        if (known.has(cand)) { add(cand); break; }
      }
    }
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, [...v]]));
}

/** Disegna la pagina, la pulisce e la legge con l'OCR colonna per colonna. Ritorna null per pagine vuote o di sole illustrazioni. */
async function ocrPage(page: Awaited<ReturnType<import("./pdfDoc").PDFDocumentProxy["getPage"]>>, ocr: Ocr, columns: "auto" | 1 | 2): Promise<string[] | null> {
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(4, Math.max(1.5, 2300 / base.width));
  const vp = page.getViewport({ scale });
  const cv = document.createElement("canvas");
  cv.width = Math.floor(vp.width);
  cv.height = Math.floor(vp.height);
  await page.render({ canvas: cv, viewport: vp, background: "#ffffff" }).promise;
  const prep = prepare(cv);
  cv.width = cv.height = 0;
  const bw = prep.canvas;
  try {
    if (prep.ink < 0.004 || prep.ink > 0.4) return null; // bianca oppure illustrazione a tutta pagina
    let gutter = prep.gutter;
    if (columns === 1) gutter = null;
    else if (columns === 2 && gutter === null) gutter = bw.width / 2;
    if (gutter === null) return await ocr.read(bw);
    const g = Math.round(gutter);
    const parts: [number, number][] = [[0, g], [g, bw.width - g]];
    const reads = parts.map(async ([x0, w]) => {
      const part = document.createElement("canvas");
      part.width = w;
      part.height = bw.height;
      part.getContext("2d")!.drawImage(bw, x0, 0, w, bw.height, 0, 0, w, bw.height);
      const lines = await ocr.read(part);
      part.width = part.height = 0;
      return lines;
    });
    return (await Promise.all(reads)).flat();
  } finally {
    bw.width = bw.height = 0;
  }
}

/** Estrae il testo di tutte le pagine, riga per riga */
export async function extractLines(blob: Blob, onProgress?: (done: number, total: number) => void, signal?: { cancelled: boolean }, ocrOpts?: OcrOptions): Promise<{ lines: Line[]; pages: number; scannedPages: number; ocrPages: number }> {
  const task = pdfjs.getDocument({ range: new BlobRange(blob), rangeChunkSize: 1 << 20, disableAutoFetch: true, ...ASSETS });
  const pdf = await task.promise;
  const perPage: Line[][] = Array.from({ length: pdf.numPages + 1 }, () => []);
  let scannedPages = 0, ocrPages = 0, done = 0;
  let ocr: Ocr | undefined;
  const jobs = new Set<Promise<void>>();
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
        for (const text of orderPageItems(items.map((i) => ({ ...i, x: i.x - view[0] })), view[2] - view[0])) perPage[p].push({ text, page: p });
        page.cleanup();
        onProgress?.(++done, pdf.numPages);
      } else {
        scannedPages++;
        if (ocrOpts && p >= ocrOpts.from && p <= ocrOpts.to) {
          // Le pagine già lette si riprendono dalla memoria; le altre vanno all'OCR, più pagine insieme
          const cached = await ocrOpts.cache?.get(p);
          if (cached) {
            if (cached.length) ocrPages++;
            for (const text of cached) perPage[p].push({ text, page: p });
            page.cleanup();
            onProgress?.(++done, pdf.numPages);
            continue;
          }
          ocr ??= await createOcr(ocrOpts.lang, ocrWorkers(isAndroid() || isIos()));
          while (jobs.size >= ocr.size) await Promise.race(jobs);
          if (signal?.cancelled) break;
          const o = ocr;
          const job: Promise<void> = (async () => {
            const got = await ocrPage(page, o, ocrOpts.columns);
            await ocrOpts.cache?.set(p, got ?? []);
            if (got?.length) { ocrPages++; for (const text of got) perPage[p].push({ text, page: p }); }
            page.cleanup();
          })().catch(() => {}).finally(() => { jobs.delete(job); onProgress?.(++done, pdf.numPages); });
          jobs.add(job);
        } else {
          page.cleanup();
          onProgress?.(++done, pdf.numPages);
        }
      }
      if (p % 10 === 0) await new Promise((r) => setTimeout(r));
    }
    await Promise.all(jobs);
  } finally {
    await ocr?.close();
    await task.destroy();
  }
  return { lines: perPage.flat(), pages: pdf.numPages, scannedPages, ocrPages };
}

/** Cerca nel sommario (segnalibri) del PDF il capitolo degli incantesimi e ne ricava le pagine */
export async function suggestSpellRange(blob: Blob): Promise<{ from: number; to: number; title: string } | null> {
  const task = pdfjs.getDocument({ range: new BlobRange(blob), rangeChunkSize: 1 << 20, disableAutoFetch: true, ...ASSETS });
  try {
    const pdf = await task.promise;
    type Raw = { title: string; dest: unknown; items?: Raw[] };
    const outline = (await pdf.getOutline().catch(() => null)) as Raw[] | null;
    if (!outline?.length) return null;
    const flat: { title: string; depth: number; page: number }[] = [];
    const walk = async (items: Raw[], depth: number) => {
      for (const it of items) {
        try {
          const d = typeof it.dest === "string" ? await pdf.getDestination(it.dest) : (it.dest as unknown[] | null);
          if (d) flat.push({ title: it.title, depth, page: (await pdf.getPageIndex(d[0] as never)) + 1 });
        } catch { /* destinazione non valida */ }
        if (it.items?.length) await walk(it.items, depth + 1);
      }
    };
    await walk(outline, 0);
    const re = /(spell descriptions?|spells?$|descrizione degli incantesimi|incantesimi$|^incantesimi)/i;
    const hits = flat.map((f, i) => ({ f, i })).filter(({ f }) => re.test(f.title.trim()) && !/lists?|elenc|liste|slot|casting|lancio/i.test(f.title));
    if (!hits.length) return null;
    // preferisco il titolo che contiene "descri"; altrimenti l'ultimo (di solito il capitolo con le schede)
    const pick = hits.find(({ f }) => /descri/i.test(f.title)) ?? hits[hits.length - 1];
    const next = flat.slice(pick.i + 1).find((f) => f.depth <= pick.f.depth && f.page > pick.f.page);
    return { from: pick.f.page, to: next ? next.page - 1 : pdf.numPages, title: pick.f.title.trim() };
  } catch {
    return null;
  } finally {
    await task.destroy();
  }
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
  const clean = dropRunningLines(lines, pages);
  const spells = parseSpellLines(clean);
  return { bookId, indexedAt: Date.now(), pages, scannedPages, ocrPages, spells, classLists: extractClassLists(clean, spells.map((x) => x.name)) };
}

const key = (cid: string, slotId: string) => `spells:${cid}:${slotId}`;
export const saveIndex = (cid: string, slotId: string, idx: SpellIndex) => idbSet(key(cid, slotId), idx);
export const loadIndex = async (cid: string, slotId: string) => (await idbGet(key(cid, slotId))) as SpellIndex | undefined;
export const deleteIndex = (cid: string, slotId: string) => idbDel(key(cid, slotId));

export const ocrCache = (cid: string, slotId: string, lang: OcrLang, columns: "auto" | 1 | 2) => {
  const k = (p: number) => `ocr2:${cid}:${slotId}:${lang}:${columns}:${p}`;
  return {
    get: async (p: number) => (await idbGet(k(p))) as string[] | undefined,
    set: (p: number, lines: string[]) => idbSet(k(p), lines),
  };
};
