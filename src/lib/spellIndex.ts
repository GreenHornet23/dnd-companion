// Legge il testo di un manuale PDF e ne ricava l'elenco degli incantesimi (inglese e italiano, 5e 2014 e 2024).
// Il riconoscimento si basa sul formato standard della scheda di un incantesimo: nome, riga "scuola/livello",
// poi "Tempo di lancio / Gittata / Componenti / Durata". Funziona solo su PDF con testo selezionabile (non scansioni).
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";
import { pdfjs, BlobRange, ASSETS } from "./pdfDoc";

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
  spells: SpellRef[];
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

const CASTING_RE = /^(casting time|tempo di lancio|tempo di esecuzione)\s*:?\s*/i;
const RANGE_RE = /^(range|gittata|raggio)\s*:?\s*/i;
const COMP_RE = /^(components|componenti)\s*:?\s*/i;
const DUR_RE = /^(duration|durata)\s*:?\s*/i;

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
    const m = lower.match(/(\d)\s*(?:st|nd|rd|th|°|º|ª|a)?[\s-]*(?:level|livello)/) ?? lower.match(/(?:level|livello)\s*(\d)/);
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

/** Estrae il testo di tutte le pagine, riga per riga */
export async function extractLines(blob: Blob, onProgress?: (done: number, total: number) => void, signal?: { cancelled: boolean }): Promise<{ lines: Line[]; pages: number }> {
  const task = pdfjs.getDocument({ range: new BlobRange(blob), rangeChunkSize: 1 << 20, disableAutoFetch: true, ...ASSETS });
  const pdf = await task.promise;
  const lines: Line[] = [];
  try {
    for (let p = 1; p <= pdf.numPages; p++) {
      if (signal?.cancelled) break;
      const page = await pdf.getPage(p);
      const tc = await page.getTextContent();
      let buf = "";
      let lastY: number | undefined;
      const flush = () => { if (buf.trim()) lines.push({ text: buf, page: p }); buf = ""; };
      for (const it of tc.items) {
        if (!("str" in it)) continue;
        const y = it.transform[5] as number;
        if (lastY !== undefined && Math.abs(y - lastY) > 2) flush();
        buf += it.str;
        lastY = y;
        if (it.hasEOL) { flush(); lastY = undefined; }
      }
      flush();
      page.cleanup();
      onProgress?.(p, pdf.numPages);
      if (p % 10 === 0) await new Promise((r) => setTimeout(r));
    }
  } finally {
    await task.destroy();
  }
  return { lines, pages: pdf.numPages };
}

export async function indexBook(blob: Blob, bookId: string, onProgress?: (done: number, total: number) => void, signal?: { cancelled: boolean }): Promise<SpellIndex> {
  const { lines, pages } = await extractLines(blob, onProgress, signal);
  return { bookId, indexedAt: Date.now(), pages, spells: parseSpellLines(lines) };
}

const key = (cid: string, slotId: string) => `spells:${cid}:${slotId}`;
export const saveIndex = (cid: string, slotId: string, idx: SpellIndex) => idbSet(key(cid, slotId), idx);
export const loadIndex = async (cid: string, slotId: string) => (await idbGet(key(cid, slotId))) as SpellIndex | undefined;
export const deleteIndex = (cid: string, slotId: string) => idbDel(key(cid, slotId));
