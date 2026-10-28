/**
 * Controllo aggiornamenti.
 *  - Desktop (Windows/macOS/Linux): plugin updater di Tauri → scarica, installa e riavvia dall'avviso.
 *  - Android: confronta la versione con il manifest remoto e apre il download dell'APK
 *    (Android chiede di consentire l'installazione da questa origine).
 *  - iOS: non è possibile installare fuori da App Store/TestFlight: l'avviso porta al link di distribuzione.
 */
import { isAndroid, isIos, isTauri, openExternal } from "./platform";

export interface UpdateInfo {
  version: string;
  notes?: string;
  mode: "tauri" | "link";
  url?: string;
  install(onProgress?: (pct: number | null) => void): Promise<void>;
}


function newer(remote: string, current: string): boolean {
  const p = (v: string) => v.replace(/^v/, "").split(/[.-]/).map((n) => parseInt(n, 10) || 0);
  const a = p(remote), b = p(current);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] ?? 0) > (b[i] ?? 0)) return true;
    if ((a[i] ?? 0) < (b[i] ?? 0)) return false;
  }
  return false;
}

export async function checkForUpdate(): Promise<UpdateInfo | null> {
  try {
    if (isTauri() && !isAndroid() && !isIos()) {
      const { check } = await import("@tauri-apps/plugin-updater");
      const upd = await check();
      if (!upd) return null;
      return {
        version: upd.version,
        notes: upd.body ?? undefined,
        mode: "tauri",
        async install(onProgress) {
          let total = 0, done = 0;
          await upd.downloadAndInstall((ev) => {
            if (ev.event === "Started") total = ev.data.contentLength ?? 0;
            if (ev.event === "Progress") {
              done += ev.data.chunkLength;
              onProgress?.(total ? Math.round((done / total) * 100) : null);
            }
          });
          const { relaunch } = await import("@tauri-apps/plugin-process");
          await relaunch();
        },
      };
    }

    // Nel browser la versione web si aggiorna da sola: nessun avviso
    if (!isTauri()) return null;
    const url = import.meta.env.VITE_UPDATE_MANIFEST_URL;
    if (!url) return null;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const m = (await res.json()) as {
      version?: string; notes?: string; android_apk_url?: string; ios_url?: string; web_url?: string;
      platforms?: Record<string, { url?: string }>;
    };
    if (!m.version || !newer(m.version, __APP_VERSION__)) return null;
    const link = isAndroid()
      ? m.android_apk_url ?? m.platforms?.["android-aarch64"]?.url
      : isIos()
        ? m.ios_url
        : m.web_url;
    return {
      version: m.version,
      notes: m.notes,
      mode: "link",
      url: link,
      async install() {
        if (link) await openExternal(link);
      },
    };
  } catch {
    return null; // offline o manifest non raggiungibile: nessun avviso
  }
}
