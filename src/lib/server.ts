import type { CollectionName } from "./types";

export interface SyncCfg {
  url: string;
  key: string;
}
export interface WireRow {
  col: CollectionName;
  id: string;
  updatedAt: number;
  deleted: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}
export interface WireMeta {
  name: string;
  description: string;
  editionId: string;
  bookIds: string[];
  updatedAt: number;
}
export interface SyncResponse {
  now: number;
  rows: WireRow[];
  meta: WireMeta | null;
  truncated: boolean;
  next: number | null;
}

export class AuthError extends Error {}

export const normalizeUrl = (u: string) => u.trim().replace(/\/+$/, "");

async function send(url: string, init: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new Error("Server non raggiungibile: controlla la connessione");
  }
  if (res.status === 401) throw new AuthError("Codice d'invito non valido oppure campagna eliminata dal server");
  if (!res.ok) {
    let msg = "";
    try {
      msg = ((await res.json()) as { error?: string }).error ?? "";
    } catch {
      /* ignore */
    }
    throw new Error(msg || `Errore del server (${res.status})`);
  }
  return res;
}

const auth = (cfg: SyncCfg) => ({ Authorization: `Bearer ${cfg.key}` });

/** Crea la campagna sul server (serve la chiave di creazione del server). Ritorna la chiave della campagna. */
export async function createRemote(url: string, createKey: string, id: string, meta: WireMeta): Promise<string> {
  const res = await send(`${normalizeUrl(url)}/c`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Create-Key": createKey },
    body: JSON.stringify({ id, meta }),
  });
  return ((await res.json()) as { key: string }).key;
}

export async function callSync(
  cfg: SyncCfg,
  cid: string,
  body: { since?: number; pull?: boolean; rows: WireRow[]; meta?: WireMeta },
): Promise<SyncResponse> {
  const res = await send(`${normalizeUrl(cfg.url)}/c/${cid}/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...auth(cfg) },
    body: JSON.stringify(body),
  });
  return (await res.json()) as SyncResponse;
}

/** Dimensione delle parti in cui si dividono i file (il server accetta richieste fino a 50 MB per parte). Modificabile solo nei test. */
export const PART = { size: 32 * 1024 * 1024 };

async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof AuthError) throw e;
      last = e;
      await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
  throw last;
}

interface BlobInfo {
  complete: boolean;
  parts: number;
  size: number;
  type: string | null;
  uploaded: { n: number; size: number }[];
}

async function blobInfo(cfg: SyncCfg, cid: string, assetId: string): Promise<BlobInfo> {
  const res = await send(`${normalizeUrl(cfg.url)}/c/${cid}/blob/${assetId}/info`, { headers: auth(cfg) });
  return (await res.json()) as BlobInfo;
}

/** Carica un file a parti. Se un caricamento precedente si era interrotto, riparte dalle parti mancanti. */
export async function uploadBlob(cfg: SyncCfg, cid: string, assetId: string, blob: Blob, onProgress?: (done: number, total: number) => void) {
  const base = `${normalizeUrl(cfg.url)}/c/${cid}/blob/${assetId}`;
  const total = Math.max(1, Math.ceil(blob.size / PART.size));
  const info = await withRetry(() => blobInfo(cfg, cid, assetId));
  if (info.complete && info.size === blob.size) {
    onProgress?.(total, total);
    return;
  }
  const have = new Map(info.uploaded.map((u) => [u.n, u.size]));
  for (let n = 0; n < total; n++) {
    const slice = blob.slice(n * PART.size, Math.min(blob.size, (n + 1) * PART.size));
    if (have.get(n) !== slice.size || slice.size === 0) {
      await withRetry(() => send(`${base}/${n}`, { method: "PUT", headers: { "Content-Type": "application/octet-stream", ...auth(cfg) }, body: slice }));
    }
    onProgress?.(n + 1, total);
  }
  await withRetry(() =>
    send(`${base}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth(cfg) },
      body: JSON.stringify({ parts: total, size: blob.size, type: blob.type || "application/octet-stream" }),
    }),
  );
}

export async function downloadBlob(cfg: SyncCfg, cid: string, assetId: string, onProgress?: (done: number, total: number) => void): Promise<Blob> {
  const base = `${normalizeUrl(cfg.url)}/c/${cid}/blob/${assetId}`;
  const info = await withRetry(() => blobInfo(cfg, cid, assetId));
  if (!info.complete) throw new Error("Il file non è ancora completamente caricato sul server");
  const chunks: Blob[] = [];
  for (let n = 0; n < info.parts; n++) {
    chunks.push(await withRetry(async () => (await send(`${base}/${n}`, { headers: auth(cfg) })).blob()));
    onProgress?.(n + 1, info.parts);
  }
  return new Blob(chunks, { type: info.type ?? "application/octet-stream" });
}

export async function deleteRemote(cfg: SyncCfg, cid: string) {
  await send(`${normalizeUrl(cfg.url)}/c/${cid}`, { method: "DELETE", headers: auth(cfg) });
}

/** Codice d'invito: contiene indirizzo del server, id e chiave della campagna. Chi lo ha accede alla campagna. */
export function encodeInvite(cfg: SyncCfg, cid: string): string {
  const payload = JSON.stringify({ u: normalizeUrl(cfg.url), i: cid, k: cfg.key });
  return "dnd1." + btoa(payload).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeInvite(code: string): { cfg: SyncCfg; id: string } {
  const m = /^dnd1\.([A-Za-z0-9_-]+)$/.exec(code.trim());
  if (!m) throw new Error("Codice d'invito non valido");
  try {
    const b64 = m[1].replace(/-/g, "+").replace(/_/g, "/");
    const j = JSON.parse(atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4)));
    if (typeof j.u !== "string" || typeof j.i !== "string" || typeof j.k !== "string" || !/^https?:\/\//.test(j.u)) throw new Error();
    return { cfg: { url: j.u, key: j.k }, id: j.i };
  } catch {
    throw new Error("Codice d'invito non valido");
  }
}
