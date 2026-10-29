// Riconoscimento del testo (OCR) per i manuali scansionati. Tutto in locale: nessun file esce dal dispositivo.
import type { Worker as TessWorker } from "tesseract.js";

export type OcrLang = "ita" | "eng";

const abs = (p: string) => new URL(import.meta.env.BASE_URL + p, location.href).href;

export interface Ocr {
  /** Legge un'immagine e ritorna le righe di testo */
  read(canvas: HTMLCanvasElement): Promise<string[]>;
  close(): Promise<void>;
}

export async function createOcr(lang: OcrLang): Promise<Ocr> {
  const { createWorker } = await import("tesseract.js");
  const worker: TessWorker = await createWorker(lang, 1, {
    workerPath: abs("tesseract/worker.min.js"),
    corePath: abs("tesseract/"),
    langPath: abs("tesseract/lang/"),
    workerBlobURL: false,
    gzip: true,
  });
  return {
    async read(canvas) {
      const { data } = await worker.recognize(canvas);
      return data.text.split("\n").map((l) => l.trim()).filter(Boolean);
    },
    close: async () => { await worker.terminate(); },
  };
}
