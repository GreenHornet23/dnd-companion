import { create } from "zustand";
import { syncCampaign } from "./sync";
import { AuthError } from "./server";
import { useStore } from "./store";

interface S {
  busy: boolean;
  error?: string;
  lastAt?: number;
  detail?: string;
  run(cid: string, opts?: { silent?: boolean }): Promise<void>;
}

let lock: Promise<void> | null = null;

export const useSync = create<S>((set) => ({
  busy: false,
  async run(cid) {
    const camp = useStore.getState().campaigns.find((c) => c.id === cid);
    if (!camp?.sync) return;
    if (lock) return lock;
    set({ busy: true, error: undefined, detail: undefined });
    lock = (async () => {
      try {
        const r = await syncCampaign(cid, (detail) => set({ detail }));
        set({ lastAt: r.at });
      } catch (e) {
        set({ error: e instanceof AuthError ? e.message : (e as Error).message });
      } finally {
        set({ busy: false, detail: undefined });
        lock = null;
      }
    })();
    return lock;
  },
}));
