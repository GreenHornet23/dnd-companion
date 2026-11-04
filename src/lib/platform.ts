/** Rilevamento della piattaforma (app Tauri, Android, iOS, browser). */
export const isTauri = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
const ua = () => (typeof navigator !== "undefined" ? navigator.userAgent.toLowerCase() : "");
export const isAndroid = () => ua().includes("android");
export const isIos = () => /iphone|ipad|ipod/.test(ua()) || (ua().includes("macintosh") && typeof navigator !== "undefined" && navigator.maxTouchPoints > 1);

/** Apre un indirizzo web nel browser di sistema (nell'app Tauri serve il plugin; nel browser basta window.open). */
export async function openExternal(url: string): Promise<void> {
  if (isTauri()) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
  } else {
    window.open(url, "_blank", "noopener");
  }
}

/** Versione e cartella dell'app che sta davvero girando (solo app nativa): serve a capire se esistono più copie installate */
export async function runtimeInfo(): Promise<{ version?: string; dir?: string }> {
  if (!isTauri()) return {};
  try {
    const { getVersion } = await import("@tauri-apps/api/app");
    const { resourceDir } = await import("@tauri-apps/api/path");
    const [version, dir] = await Promise.all([getVersion(), resourceDir().catch(() => undefined)]);
    return { version, dir };
  } catch {
    return {};
  }
}

/** Pagina delle release (per scaricare a mano l'installer) */
export const releasesPageUrl = () =>
  (import.meta.env.VITE_UPDATE_MANIFEST_URL as string | undefined)?.replace(/\/download\/latest\.json$/, "") || undefined;
