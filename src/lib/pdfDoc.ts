// Versione "legacy": gira anche sui WebView Android meno recenti
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
export type { PDFDocumentProxy, RenderTask } from "pdfjs-dist/legacy/build/pdf.mjs";

export { pdfjs };

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const BASE = import.meta.env.BASE_URL;
export const ASSETS = {
  cMapUrl: `${BASE}pdfjs/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `${BASE}pdfjs/standard_fonts/`,
  wasmUrl: `${BASE}pdfjs/wasm/`,
  iccUrl: `${BASE}pdfjs/iccs/`,
};

/** Legge il file a blocchi dal Blob invece di caricarlo tutto in memoria: i manuali possono pesare centinaia di MB. */
export class BlobRange extends pdfjs.PDFDataRangeTransport {
  constructor(private blob: Blob) {
    super(blob.size, null);
  }
  requestDataRange(begin: number, end: number) {
    this.blob.slice(begin, end).arrayBuffer().then((b) => this.onDataRange(begin, new Uint8Array(b)));
  }
}

