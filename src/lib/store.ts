import { create } from "zustand";
import { get as idbGet, set as idbSet, del as idbDel, keys as idbKeys } from "idb-keyval";
import {
  type Campaign, type CampaignData, type CollectionMap, type CollectionName, type Asset, type BookSlot,
  emptyData, COLLECTIONS,
} from "./types";
import { uid } from "./id";
import { getEdition } from "./catalog";
import { downloadBlob } from "./server";

type Row<K extends CollectionName> = CollectionMap[K];

interface State {
  ready: boolean;
  campaigns: Campaign[];
  activeId?: string;
  data: Record<string, CampaignData>;
  init(): Promise<void>;
  setActive(id?: string): void;
  createCampaign(input: { name: string; description: string; editionId: string; bookIds: string[] }): Promise<string>;
  updateCampaign(id: string, patch: Partial<Campaign>): void;
  deleteCampaign(id: string): Promise<void>;
  importCampaign(c: Campaign, d: CampaignData): Promise<void>;
  /** Applica i metadati arrivati dal server senza ricalcolare updatedAt */
  applyMeta(id: string, meta: Pick<Campaign, "name" | "description" | "editionId" | "bookIds" | "updatedAt">): void;
  upsert<K extends CollectionName>(cid: string, col: K, row: Row<K>): void;
  remove(cid: string, col: CollectionName, id: string): void;
  /** Sostituisce una collezione con il risultato di un merge, senza toccare updatedAt */
  setCollection<K extends CollectionName>(cid: string, col: K, rows: Row<K>[]): void;
  addAsset(cid: string, blob: Blob, name: string): Promise<Asset>;
  exportCampaign(cid: string): string;
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();
function debounced(key: string, fn: () => void, ms = 250) {
  clearTimeout(timers.get(key));
  timers.set(key, setTimeout(fn, ms));
}

export const useStore = create<State>((set, get) => {
  const persistCampaigns = () => debounced("campaigns", () => void idbSet("campaigns", get().campaigns));
  const persistData = (cid: string) => debounced("data:" + cid, () => void idbSet("data:" + cid, get().data[cid]));

  return {
    ready: false,
    campaigns: [],
    activeId: localStorage.getItem("dndc:active") || undefined,
    data: {},

    async init() {
      const campaigns = ((await idbGet("campaigns")) as Campaign[] | undefined) ?? [];
      const data: Record<string, CampaignData> = {};
      for (const c of campaigns) {
        const d = ((await idbGet("data:" + c.id)) as Partial<CampaignData> | undefined) ?? {};
        data[c.id] = { ...emptyData(), ...d };
      }
      let activeId = get().activeId;
      if (activeId && !campaigns.some((c) => c.id === activeId)) activeId = undefined;
      set({ campaigns, data, activeId, ready: true });
    },

    setActive(id) {
      if (id) localStorage.setItem("dndc:active", id);
      else localStorage.removeItem("dndc:active");
      set({ activeId: id });
    },

    async createCampaign({ name, description, editionId, bookIds }) {
      const now = Date.now();
      const c: Campaign = { id: uid(), name, description, editionId, bookIds, createdAt: now, updatedAt: now };
      const books: BookSlot[] = bookIds.map((bookId) => {
        const title = getEdition(editionId).books.find((b) => b.id === bookId)?.title ?? bookId;
        return { id: `slot-${bookId}`, bookId, title, updatedAt: now };
      });
      const d = { ...emptyData(), books };
      set((s) => ({ campaigns: [...s.campaigns, c], data: { ...s.data, [c.id]: d }, activeId: c.id }));
      localStorage.setItem("dndc:active", c.id);
      persistCampaigns();
      persistData(c.id);
      return c.id;
    },

    updateCampaign(id, patch) {
      set((s) => ({
        campaigns: s.campaigns.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c)),
      }));
      persistCampaigns();
    },

    async deleteCampaign(id) {
      const d = get().data[id];
      for (const a of d?.assets ?? []) await idbDel(`blob:${id}:${a.id}`);
      for (const k of await idbKeys()) if (typeof k === "string" && k.startsWith(`book:${id}:`)) await idbDel(k);
      await idbDel("data:" + id);
      set((s) => {
        const { [id]: _drop, ...rest } = s.data;
        return {
          campaigns: s.campaigns.filter((c) => c.id !== id),
          data: rest,
          activeId: s.activeId === id ? undefined : s.activeId,
        };
      });
      if (get().activeId === undefined) localStorage.removeItem("dndc:active");
      persistCampaigns();
    },

    async importCampaign(c, d) {
      set((s) => ({ campaigns: [...s.campaigns, c], data: { ...s.data, [c.id]: d }, activeId: c.id }));
      localStorage.setItem("dndc:active", c.id);
      await idbSet("campaigns", get().campaigns);
      await idbSet("data:" + c.id, d);
    },

    applyMeta(id, meta) {
      set((s) => ({ campaigns: s.campaigns.map((c) => (c.id === id ? { ...c, ...meta } : c)) }));
      persistCampaigns();
    },

    upsert(cid, col, row) {
      const next = { ...row, updatedAt: Date.now() };
      set((s) => {
        const d = s.data[cid];
        if (!d) return s;
        const list = d[col] as Row<typeof col>[];
        const exists = list.some((x) => x.id === next.id);
        const out = exists ? list.map((x) => (x.id === next.id ? next : x)) : [...list, next];
        return { data: { ...s.data, [cid]: { ...d, [col]: out } } };
      });
      persistData(cid);
    },

    remove(cid, col, id) {
      set((s) => {
        const d = s.data[cid];
        if (!d) return s;
        const list = d[col] as { id: string; updatedAt: number; deleted?: boolean }[];
        const out = list.map((x) => (x.id === id ? { ...x, deleted: true, updatedAt: Date.now() } : x));
        return { data: { ...s.data, [cid]: { ...d, [col]: out } } };
      });
      persistData(cid);
    },

    setCollection(cid, col, rows) {
      set((s) => {
        const d = s.data[cid];
        if (!d) return s;
        return { data: { ...s.data, [cid]: { ...d, [col]: rows } } };
      });
      persistData(cid);
    },

    async addAsset(cid, blob, name) {
      const asset: Asset = {
        id: uid(), name, mime: blob.type || "application/octet-stream", size: blob.size, updatedAt: Date.now(),
      };
      await idbSet(`blob:${cid}:${asset.id}`, blob);
      get().upsert(cid, "assets", asset);
      return asset;
    },

    exportCampaign(cid) {
      const c = get().campaigns.find((x) => x.id === cid);
      const d = get().data[cid];
      return JSON.stringify({ app: "dungeon-companion", version: 1, campaign: c && { ...c, sync: undefined }, data: d }, null, 2);
    },
  };
});

export const visible = <T extends { deleted?: boolean }>(rows: T[] | undefined): T[] => (rows ?? []).filter((r) => !r.deleted);

export const getLocalBlob = async (cid: string, assetId: string) =>
  (await idbGet(`blob:${cid}:${assetId}`)) as Blob | undefined;

export const hasLocalBlob = async (cid: string, assetId: string) => !!(await getLocalBlob(cid, assetId));

export const putLocalBlob = (cid: string, assetId: string, blob: Blob) => idbSet(`blob:${cid}:${assetId}`, blob);

/** Blob locale oppure scaricato dal server (e messo in cache) */
export async function getAssetBlob(cid: string, assetId: string): Promise<Blob | undefined> {
  const local = await getLocalBlob(cid, assetId);
  if (local) return local;
  const asset = useStore.getState().data[cid]?.assets.find((a) => a.id === assetId);
  const camp = useStore.getState().campaigns.find((c) => c.id === cid);
  if (!asset?.synced || !camp?.sync) return undefined;
  const raw = await downloadBlob(camp.sync, cid, assetId);
  const blob = new Blob([raw], { type: asset.mime });
  await putLocalBlob(cid, assetId, blob);
  return blob;
}

/** Manuali non condivisi: restano solo su questo dispositivo */
export interface LocalBook { blob: Blob; name: string }
export const putLocalBook = (cid: string, slotId: string, blob: Blob, name: string) => idbSet(`book:${cid}:${slotId}`, { blob, name } satisfies LocalBook);
export const getLocalBook = async (cid: string, slotId: string) => (await idbGet(`book:${cid}:${slotId}`)) as LocalBook | undefined;
export const delLocalBook = (cid: string, slotId: string) => idbDel(`book:${cid}:${slotId}`);
export async function listLocalBooks(cid: string): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (const k of await idbKeys()) {
    if (typeof k === "string" && k.startsWith(`book:${cid}:`)) {
      const v = (await idbGet(k)) as LocalBook | undefined;
      if (v) out.set(k.slice(`book:${cid}:`.length), v.name);
    }
  }
  return out;
}

export { COLLECTIONS };
