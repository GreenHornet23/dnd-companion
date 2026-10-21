import { useEffect, useState } from "react";
import { useStore, visible, getAssetBlob } from "./store";
import { getEdition } from "./catalog";
import { emptyData } from "./types";

export function useCampaign() {
  const activeId = useStore((s) => s.activeId);
  const campaign = useStore((s) => s.campaigns.find((c) => c.id === activeId));
  const raw = useStore((s) => (activeId ? s.data[activeId] : undefined));
  const data = raw ?? emptyData();
  const edition = getEdition(campaign?.editionId ?? "5e2014");
  return { cid: activeId as string, campaign, edition, ruleset: edition.ruleset, data, visible };
}

/** URL (object URL) per un asset locale o scaricabile dal server del party */
export function useAssetUrl(cid: string | undefined, assetId: string | undefined) {
  const [url, setUrl] = useState<string>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    let revoked = false;
    let current: string | undefined;
    setUrl(undefined);
    setError(undefined);
    if (!cid || !assetId) return;
    getAssetBlob(cid, assetId)
      .then((b) => {
        if (revoked) return;
        if (!b) return setError("File non ancora disponibile: sincronizza con il party");
        current = URL.createObjectURL(b);
        setUrl(current);
      })
      .catch((e) => !revoked && setError((e as Error).message));
    return () => {
      revoked = true;
      if (current) URL.revokeObjectURL(current);
    };
  }, [cid, assetId]);
  return { url, error };
}

/** Ridimensiona un'immagine (max lato) e la converte in JPEG per risparmiare spazio su Drive */
export async function shrinkImage(file: File, maxSide = 2400, quality = 0.85): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Immagine non valida"))), "image/jpeg", quality));
}
