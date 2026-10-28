/**
 * Server di sincronizzazione di Dungeon Companion (Cloudflare Worker + D1 + R2).
 *
 * Nessun account: ogni campagna ha una chiave segreta casuale, contenuta nel "codice d'invito".
 * Chi ha il codice legge e scrive la campagna. Creare una campagna richiede invece CREATE_KEY,
 * un segreto del server che conosce solo chi lo gestisce (evita che estranei riempiano lo spazio).
 */
export interface Env {
  DB: D1Database;
  BLOBS: R2Bucket;
  AI?: Ai;
  CREATE_KEY?: string;
  MAX_CAMPAIGN_BYTES?: string;
}

const COLS = new Set(["characters", "logs", "quests", "npcs", "maps", "pins", "notes", "assets", "books"]);
// Il piano gratuito limita le query D1 per richiesta: i client inviano al massimo 40 righe per volta.
const MAX_ROWS = 40;
const MAX_BODY = 2_000_000;
const MAX_ROW_JSON = 200_000;
const MAX_PART = 50 * 1024 * 1024; // il piano gratuito accetta richieste fino a 100 MB
const MAX_PARTS = 80; // fino a ~4 GB per file
const PULL_LIMIT = 1000;
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Create-Key",
  "Access-Control-Max-Age": "86400",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...CORS } });
const fail = (status: number, error: string) => json({ error }, status);

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const sha256 = async (s: string) => hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
function safeEq(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function authorized(req: Request, env: Env, id: string): Promise<boolean> {
  const m = /^Bearer (.{16,200})$/.exec(req.headers.get("Authorization") ?? "");
  if (!m) return false;
  const row = await env.DB.prepare("SELECT key_hash FROM campaigns WHERE id = ?").bind(id).first<{ key_hash: string }>();
  if (!row) return false;
  return safeEq(row.key_hash, await sha256(m[1]));
}

interface Meta {
  name: string;
  description: string;
  editionId: string;
  bookIds: string[];
  updatedAt: number;
}
function parseMeta(m: any): Meta | null {
  if (!m || typeof m !== "object") return null;
  if (typeof m.name !== "string" || m.name.length > 200) return null;
  if (typeof m.description !== "string" || m.description.length > 5000) return null;
  if (typeof m.editionId !== "string" || m.editionId.length > 50) return null;
  if (!Array.isArray(m.bookIds) || m.bookIds.length > 200 || m.bookIds.some((b: unknown) => typeof b !== "string" || b.length > 100)) return null;
  if (typeof m.updatedAt !== "number" || !Number.isFinite(m.updatedAt)) return null;
  return { name: m.name, description: m.description, editionId: m.editionId, bookIds: m.bookIds, updatedAt: m.updatedAt };
}

async function readJson(req: Request): Promise<any | null> {
  const len = Number(req.headers.get("Content-Length") ?? "0");
  if (len > MAX_BODY) return null;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function randomKey() {
  const b = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// POST /c   { id, meta }  + header X-Create-Key  ->  { key }
async function createCampaign(req: Request, env: Env) {
  if (!env.CREATE_KEY) return fail(503, "CREATE_KEY non configurata sul server");
  const given = req.headers.get("X-Create-Key") ?? "";
  if (!safeEq(await sha256(given), await sha256(env.CREATE_KEY))) return fail(403, "Chiave di creazione errata");
  const body = await readJson(req);
  const meta = parseMeta(body?.meta);
  if (!body || typeof body.id !== "string" || !ID_RE.test(body.id) || !meta) return fail(400, "Richiesta non valida");
  const key = randomKey();
  try {
    await env.DB.prepare("INSERT INTO campaigns (id, key_hash, meta, meta_updated, created_at) VALUES (?, ?, ?, ?, ?)")
      .bind(body.id, await sha256(key), JSON.stringify(meta), meta.updatedAt, Date.now())
      .run();
  } catch {
    return fail(409, "Esiste già una campagna con questo id");
  }
  return json({ key }, 201);
}

// POST /c/:id/sync  { since, pull?, rows[], meta? }
async function syncHandler(req: Request, env: Env, id: string) {
  const body = await readJson(req);
  if (!body) return fail(400, "Corpo non valido o troppo grande");
  const rows: any[] = Array.isArray(body.rows) ? body.rows : [];
  if (rows.length > MAX_ROWS) return fail(413, `Massimo ${MAX_ROWS} righe per richiesta`);

  const now = Date.now();
  const stmts: D1PreparedStatement[] = [];
  for (const r of rows) {
    if (!r || !COLS.has(r.col) || typeof r.id !== "string" || !ID_RE.test(r.id)) return fail(400, "Riga non valida");
    if (typeof r.updatedAt !== "number" || !Number.isFinite(r.updatedAt) || typeof r.data !== "object" || r.data === null) return fail(400, "Riga non valida");
    const data = JSON.stringify(r.data);
    if (data.length > MAX_ROW_JSON) return fail(413, "Riga troppo grande");
    stmts.push(
      env.DB.prepare(
        `INSERT INTO items (campaign_id, col, id, data, updated_at, deleted, server_ts)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (campaign_id, col, id) DO UPDATE SET
           data = excluded.data, updated_at = excluded.updated_at, deleted = excluded.deleted, server_ts = excluded.server_ts
         WHERE excluded.updated_at > items.updated_at`,
      ).bind(id, r.col, r.id, data, r.updatedAt, r.deleted ? 1 : 0, now),
    );
  }
  if (body.meta !== undefined) {
    const meta = parseMeta(body.meta);
    if (!meta) return fail(400, "Metadati non validi");
    stmts.push(
      env.DB.prepare("UPDATE campaigns SET meta = ?, meta_updated = ? WHERE id = ? AND meta_updated < ?").bind(
        JSON.stringify(meta), meta.updatedAt, id, meta.updatedAt,
      ),
    );
  }
  if (stmts.length) await env.DB.batch(stmts);

  let out: unknown[] = [];
  let truncated = false;
  let next: number | null = null;
  if (body.pull !== false) {
    const since = typeof body.since === "number" && Number.isFinite(body.since) ? Math.max(0, body.since) : 0;
    const res = await env.DB.prepare(
      "SELECT col, id, data, updated_at, deleted, server_ts FROM items WHERE campaign_id = ? AND server_ts >= ? ORDER BY server_ts LIMIT ?",
    ).bind(id, since, PULL_LIMIT + 1).all<{ col: string; id: string; data: string; updated_at: number; deleted: number; server_ts: number }>();
    let list = res.results;
    if (list.length > PULL_LIMIT) {
      truncated = true;
      list = list.slice(0, PULL_LIMIT);
      next = list[list.length - 1].server_ts;
    }
    out = list.map((r) => ({ col: r.col, id: r.id, updatedAt: r.updated_at, deleted: !!r.deleted, data: JSON.parse(r.data) }));
  }
  const m = await env.DB.prepare("SELECT meta, meta_updated FROM campaigns WHERE id = ?").bind(id).first<{ meta: string; meta_updated: number }>();
  return json({ now, rows: out, truncated, next, meta: m ? { ...JSON.parse(m.meta), updatedAt: m.meta_updated } : null });
}

// I file (PDF, mappe, ritratti) si caricano a parti da max 50 MB, perché una richiesta sul piano gratuito
// non può superare i 100 MB. Ogni parte è un oggetto R2: `${campagna}/${file}/${n}`.
async function putPart(req: Request, env: Env, id: string, assetId: string, n: number) {
  if (n >= MAX_PARTS) return fail(400, "Parte non valida");
  const len = Number(req.headers.get("Content-Length") ?? "-1");
  if (!Number.isFinite(len) || len < 0) return fail(411, "Content-Length obbligatorio");
  if (len > MAX_PART) return fail(413, "Parte troppo grande (max 50 MB)");
  const body: ReadableStream | Uint8Array | null = len === 0 ? new Uint8Array(0) : req.body;
  if (!body) return fail(411, "Corpo mancante");
  const quota = Number(env.MAX_CAMPAIGN_BYTES ?? "3221225472");
  const used = await env.DB.prepare("SELECT COALESCE(SUM(size), 0) AS s FROM blob_parts WHERE campaign_id = ? AND NOT (id = ? AND n = ?)")
    .bind(id, assetId, n).first<{ s: number }>();
  if ((used?.s ?? 0) + len > quota) return fail(413, "Spazio della campagna esaurito");
  const obj = await env.BLOBS.put(`${id}/${assetId}/${n}`, body, { httpMetadata: { contentType: "application/octet-stream" } });
  await env.DB.prepare("INSERT INTO blob_parts (campaign_id, id, n, size) VALUES (?, ?, ?, ?) ON CONFLICT (campaign_id, id, n) DO UPDATE SET size = excluded.size")
    .bind(id, assetId, n, obj.size).run();
  return json({ ok: true, size: obj.size });
}

// POST /c/:id/blob/:assetId/complete  { parts, size, type }
async function completeBlob(req: Request, env: Env, id: string, assetId: string) {
  const body = await readJson(req);
  const parts = body?.parts, size = body?.size, type = typeof body?.type === "string" ? body.type.slice(0, 100) : "application/octet-stream";
  if (!Number.isInteger(parts) || parts < 1 || parts > MAX_PARTS || !Number.isInteger(size) || size < 0) return fail(400, "Richiesta non valida");
  const rows = await env.DB.prepare("SELECT n, size FROM blob_parts WHERE campaign_id = ? AND id = ? ORDER BY n").bind(id, assetId)
    .all<{ n: number; size: number }>();
  const wanted = rows.results.filter((r) => r.n < parts);
  if (wanted.length !== parts || wanted.reduce((t, r) => t + r.size, 0) !== size) return fail(409, "Parti mancanti o incomplete");
  const stale = rows.results.filter((r) => r.n >= parts);
  if (stale.length) {
    await env.BLOBS.delete(stale.map((r) => `${id}/${assetId}/${r.n}`));
    await env.DB.prepare("DELETE FROM blob_parts WHERE campaign_id = ? AND id = ? AND n >= ?").bind(id, assetId, parts).run();
  }
  await env.DB.prepare(
    "INSERT INTO blob_meta (campaign_id, id, parts, size, type) VALUES (?, ?, ?, ?, ?) ON CONFLICT (campaign_id, id) DO UPDATE SET parts = excluded.parts, size = excluded.size, type = excluded.type",
  ).bind(id, assetId, parts, size, type).run();
  return json({ ok: true });
}

// GET /c/:id/blob/:assetId/info  -> stato del file (serve anche a riprendere un caricamento interrotto)
async function blobInfo(env: Env, id: string, assetId: string) {
  const meta = await env.DB.prepare("SELECT parts, size, type FROM blob_meta WHERE campaign_id = ? AND id = ?").bind(id, assetId)
    .first<{ parts: number; size: number; type: string }>();
  const up = await env.DB.prepare("SELECT n, size FROM blob_parts WHERE campaign_id = ? AND id = ? ORDER BY n").bind(id, assetId)
    .all<{ n: number; size: number }>();
  const uploaded = up.results;
  const complete = !!meta && uploaded.filter((r) => r.n < meta.parts).length === meta.parts;
  return json({ complete, parts: meta?.parts ?? 0, size: meta?.size ?? 0, type: meta?.type ?? null, uploaded });
}

async function getPart(env: Env, id: string, assetId: string, n: number) {
  const obj = await env.BLOBS.get(`${id}/${assetId}/${n}`);
  if (!obj) return fail(404, "File non trovato");
  return new Response(obj.body, {
    headers: { "Content-Type": "application/octet-stream", "Content-Length": String(obj.size), "Cache-Control": "private, max-age=0", ...CORS },
  });
}

// DELETE /c/:id  -> cancella campagna, righe e file
async function deleteCampaign(env: Env, id: string) {
  let cursor: string | undefined;
  do {
    const list = await env.BLOBS.list({ prefix: `${id}/`, cursor, limit: 500 });
    if (list.objects.length) await env.BLOBS.delete(list.objects.map((o) => o.key));
    cursor = list.truncated ? list.cursor : undefined;
  } while (cursor);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM items WHERE campaign_id = ?").bind(id),
    env.DB.prepare("DELETE FROM blob_parts WHERE campaign_id = ?").bind(id),
    env.DB.prepare("DELETE FROM blob_meta WHERE campaign_id = ?").bind(id),
    env.DB.prepare("DELETE FROM campaigns WHERE id = ?").bind(id),
  ]);
  return json({ ok: true });
}

// ---- Generazione ritratti (Cloudflare Workers AI) ----
const IMG_MODEL = "@cf/black-forest-labs/flux-1-schnell";
async function portrait(req: Request, env: Env): Promise<Response> {
  if (!env.AI) return fail(501, "Generazione immagini non attiva sul server (manca il collegamento AI)");
  let body: { prompt?: unknown; seed?: unknown };
  try { body = await req.json(); } catch { return fail(400, "Richiesta non valida"); }
  const raw = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 1200) : "";
  if (raw.length < 5) return fail(400, "Descrizione troppo corta");
  // Il modello capisce meglio l'inglese: traduco dall'italiano, e se fallisce uso il testo originale.
  let prompt = raw;
  try {
    const tr = (await env.AI.run("@cf/meta/m2m100-1.2b" as never, { text: raw, source_lang: "italian", target_lang: "english" } as never)) as { translated_text?: string };
    if (tr?.translated_text && tr.translated_text.length > 10) prompt = tr.translated_text;
  } catch { /* uso il testo originale */ }
  const seed = typeof body.seed === "number" && Number.isFinite(body.seed) ? Math.floor(body.seed) % 2_000_000_000 : Math.floor(Math.random() * 1_000_000_000);
  try {
    const out = (await env.AI.run(IMG_MODEL as never, { prompt: prompt.slice(0, 1800), steps: 6, seed } as never)) as { image?: string };
    if (!out?.image) return fail(502, "Il servizio di immagini non ha risposto");
    const bin = Uint8Array.from(atob(out.image), (c) => c.charCodeAt(0));
    return new Response(bin, { headers: { "Content-Type": "image/jpeg", "Cache-Control": "no-store", ...CORS } });
  } catch (e) {
    console.error(e);
    return fail(502, "Generazione non riuscita (forse hai finito il limite giornaliero gratuito): riprova più tardi");
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    try {
      if (parts.length === 0 || parts[0] === "health") return json({ ok: true, service: "dungeon-companion-sync" });
      if (parts[0] !== "c") return fail(404, "Non trovato");
      if (parts.length === 1 && req.method === "POST") return await createCampaign(req, env);

      const id = parts[1];
      if (!id || !ID_RE.test(id)) return fail(400, "Id non valido");
      if (!(await authorized(req, env, id))) return fail(401, "Non autorizzato");

      if (parts.length === 2 && req.method === "DELETE") return await deleteCampaign(env, id);
      if (parts[2] === "ai" && parts[3] === "portrait" && req.method === "POST") return await portrait(req, env);
      if (parts[2] === "sync" && req.method === "POST") return await syncHandler(req, env, id);
      if (parts[2] === "blob" && parts[3] && ID_RE.test(parts[3])) {
        const asset = parts[3];
        const what = parts[4];
        if (what === "info" && req.method === "GET") return await blobInfo(env, id, asset);
        if (what === "complete" && req.method === "POST") return await completeBlob(req, env, id, asset);
        if (what !== undefined && /^\d{1,3}$/.test(what)) {
          if (req.method === "PUT") return await putPart(req, env, id, asset, Number(what));
          if (req.method === "GET") return await getPart(env, id, asset, Number(what));
        }
      }
      return fail(404, "Non trovato");
    } catch (e) {
      console.error(e);
      return fail(500, "Errore interno");
    }
  },
};
