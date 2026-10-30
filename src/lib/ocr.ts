// Riconoscimento del testo (OCR) per i manuali scansionati. Tutto in locale: nessun file esce dal dispositivo.
import type { Worker as TessWorker } from "tesseract.js";

export type OcrLang = "ita" | "eng";

const abs = (p: string) => new URL(import.meta.env.BASE_URL + p, location.href).href;

export interface Ocr {
  /** Legge un'immagine (una colonna di testo, già in bianco e nero) e ritorna le righe */
  read(canvas: HTMLCanvasElement): Promise<string[]>;
  readonly size: number;
  close(): Promise<void>;
}

/** Più worker in parallelo: l'OCR di più pagine procede insieme, in base ai processori disponibili */
export async function createOcr(lang: OcrLang, size = 2): Promise<Ocr> {
  const { createWorker, PSM } = await import("tesseract.js");
  const workers: TessWorker[] = [];
  for (let i = 0; i < size; i++) {
    const w = await createWorker(lang, 1, {
      workerPath: abs("tesseract/worker.min.js"),
      corePath: abs("tesseract/"),
      langPath: abs("tesseract/lang/"),
      workerBlobURL: false,
      gzip: true,
    });
    // Una colonna di testo con titoli e blocchi di dimensioni diverse; l'immagine è già a ~300 dpi
    await w.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_COLUMN, preserve_interword_spaces: "1", user_defined_dpi: "300" });
    workers.push(w);
  }
  const free = [...workers];
  const waiting: ((w: TessWorker) => void)[] = [];
  const take = () => new Promise<TessWorker>((res) => { const w = free.pop(); if (w) res(w); else waiting.push(res); });
  const give = (w: TessWorker) => { const n = waiting.shift(); if (n) n(w); else free.push(w); };
  return {
    size,
    async read(canvas) {
      const w = await take();
      try {
        const { data } = await w.recognize(canvas);
        return data.text.split("\n").map((l) => l.trim()).filter(Boolean);
      } finally {
        give(w);
      }
    },
    close: async () => { await Promise.all(workers.map((w) => w.terminate())); },
  };
}

/** Quanti worker usare: pochi sul telefono (poca memoria), di più sul computer */
export function ocrWorkers(mobile: boolean): number {
  const cores = navigator.hardwareConcurrency || 2;
  return mobile ? Math.min(2, Math.max(1, Math.floor(cores / 3))) : Math.min(4, Math.max(1, Math.floor(cores / 2)));
}
