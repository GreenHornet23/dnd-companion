import { COLLECTIONS, emptyData, type Campaign, type CollectionName } from "./types";
import { getLocalBlob, useStore } from "./store";
import { callSync, createRemote, decodeInvite, uploadBlob, type SyncCfg, type WireMeta, type WireRow } from "./server";

type AnyRow = { id: string; updatedAt: number; deleted?: boolean };

/** Merge per id: vince l'updatedAt più recente; le cancellazioni restano come tombstone. */
export function mergeById<T extends AnyRow>(local: T[], remote: T[]): T[] {
  const map = new Map<string, T>();
  for (const r of remote) map.set(r.id, r);
  for (const l of local) {
    const r = map.get(l.id);
    if (!r || l.updatedAt >= r.updatedAt) map.set(l.id, l);
  }
  return [...map.values()].sort((a, b) => a.id.localeCompare(b.id));
}

const CHUNK = 40; // limite del server (piano gratuito Cloudflare)
const markKey = (cid: string) => `dndc:pushmark:${cid}`;
const sinceKey = (cid: string) => `dndc:since:${cid}`;

const metaOf = (c: Campaign): WireMeta => ({
  name: c.name, description: c.description, editionId: c.editionId, bookIds: c.bookIds, updatedAt: c.updatedAt,
});

function applyRows(cid: string, rows: WireRow[]) {
  const byCol = new Map<CollectionName, AnyRow[]>();
  for (const r of rows) {
    if (!COLLECTIONS.includes(r.col)) continue;
    const list = byCol.get(r.col) ?? [];
    list.push(r.data as AnyRow);
    byCol.set(r.col, list);
  }
  for (const [col, list] of byCol) {
    // si rilegge lo stato ad ogni colonna: eventuali modifiche fatte durante la rete non vanno perse
    const local = (useStore.getState().data[cid]?.[col] ?? []) as unknown as AnyRow[];
    useStore.getState().setCollection(cid, col, mergeById(local, list) as never);
  }
}

export interface SyncResult {
  at: number;
  pushed: number;
  pulled: number;
  uploadedFiles: number;
}

/** Sincronizza una campagna con il server del party: carica i file nuovi, invia le modifiche locali, scarica quelle degli altri. */
export async function syncCampaign(cid: string, onProgress?: (text: string) => void): Promise<SyncResult> {
  const camp0 = useStore.getState().campaigns.find((c) => c.id === cid);
  if (!camp0?.sync) throw new Error("Questa campagna non è collegata a un server");
  const cfg = camp0.sync;

  // 1) file (PDF, mappe, ritratti) presenti solo su questo dispositivo
  let uploadedFiles = 0;
  for (const a of [...(useStore.getState().data[cid]?.assets ?? [])]) {
    if (a.deleted || a.synced) continue;
    const blob = await getLocalBlob(cid, a.id);
    if (!blob) continue;
    onProgress?.(`Carico ${a.name}…`);
    await uploadBlob(cfg, cid, a.id, blob, (d, t) => t > 1 && onProgress?.(`Carico ${a.name} (${d}/${t})`));
    const cur = useStore.getState().data[cid].assets.find((x) => x.id === a.id);
    if (cur) useStore.getState().upsert(cid, "assets", { ...cur, synced: true });
    uploadedFiles++;
  }

  onProgress?.("Sincronizzo…");
  // 2) righe modificate qui dall'ultimo invio riuscito
  const mark = Number(localStorage.getItem(markKey(cid)) || 0);
  const data = useStore.getState().data[cid] ?? emptyData();
  const pending: WireRow[] = [];
  let newMark = mark;
  for (const col of COLLECTIONS) {
    for (const row of data[col] as unknown as AnyRow[]) {
      if (row.updatedAt > mark) {
        pending.push({ col, id: row.id, updatedAt: row.updatedAt, deleted: !!row.deleted, data: row });
        newMark = Math.max(newMark, row.updatedAt);
      }
    }
  }
  let metaToSend: WireMeta | undefined = metaOf(useStore.getState().campaigns.find((c) => c.id === cid)!);
  for (let i = 0; i < pending.length; i += CHUNK) {
    await callSync(cfg, cid, { pull: false, rows: pending.slice(i, i + CHUNK), meta: metaToSend });
    metaToSend = undefined;
  }

  // 3) novità degli altri giocatori
  let since = Number(localStorage.getItem(sinceKey(cid)) || 0);
  let pulled = 0;
  let truncated = true;
  let lastNow = Date.now();
  while (truncated) {
    const res = await callSync(cfg, cid, { since, pull: true, rows: [], meta: metaToSend });
    metaToSend = undefined;
    applyRows(cid, res.rows);
    pulled += res.rows.length;
    const cur = useStore.getState().campaigns.find((c) => c.id === cid);
    if (res.meta && cur && res.meta.updatedAt > cur.updatedAt) {
      useStore.getState().applyMeta(cid, {
        name: res.meta.name, description: res.meta.description, editionId: res.meta.editionId,
        bookIds: res.meta.bookIds, updatedAt: res.meta.updatedAt,
      });
    }
    truncated = res.truncated && res.next !== null;
    since = truncated ? (res.next as number) : Math.max(0, res.now - 5000); // margine contro piccole differenze di orologio
    lastNow = res.now;
  }

  localStorage.setItem(markKey(cid), String(newMark));
  localStorage.setItem(sinceKey(cid), String(since));
  return { at: lastNow, pushed: pending.length, pulled, uploadedFiles };
}

/** Attiva la sincronizzazione per una campagna esistente (chi gestisce il server conosce la chiave di creazione). */
export async function enableSync(cid: string, url: string, createKey: string): Promise<SyncCfg> {
  const camp = useStore.getState().campaigns.find((c) => c.id === cid);
  if (!camp) throw new Error("Campagna non trovata");
  const key = await createRemote(url, createKey, cid, metaOf(camp));
  const cfg = { url: url.trim().replace(/\/+$/, ""), key };
  localStorage.removeItem(markKey(cid));
  localStorage.removeItem(sinceKey(cid));
  useStore.getState().updateCampaign(cid, { sync: cfg });
  await syncCampaign(cid);
  return cfg;
}

/** Entra in una campagna esistente con il codice d'invito. Ritorna l'id locale della campagna. */
export async function joinCampaign(code: string): Promise<string> {
  const { cfg, id } = decodeInvite(code);
  const st = useStore.getState();
  if (st.campaigns.some((c) => c.id === id)) {
    st.setActive(id);
    return id;
  }
  const first = await callSync(cfg, id, { since: 0, pull: false, rows: [] });
  if (!first.meta) throw new Error("Campagna non trovata sul server");
  const camp: Campaign = {
    id, name: first.meta.name, description: first.meta.description, editionId: first.meta.editionId,
    bookIds: first.meta.bookIds, sync: cfg, createdAt: Date.now(), updatedAt: first.meta.updatedAt,
  };
  await st.importCampaign(camp, emptyData());
  await syncCampaign(id);
  // quello che è arrivato dal server non va rimandato indietro
  const all = useStore.getState().data[id];
  let max = 0;
  for (const col of COLLECTIONS) for (const r of all[col] as unknown as AnyRow[]) max = Math.max(max, r.updatedAt);
  localStorage.setItem(markKey(id), String(max));
  return id;
}
