import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// Versione "legacy": gira anche sui WebView Android meno recenti
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist/legacy/build/pdf.mjs";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const BASE = import.meta.env.BASE_URL;
const ASSETS = {
  cMapUrl: `${BASE}pdfjs/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `${BASE}pdfjs/standard_fonts/`,
  wasmUrl: `${BASE}pdfjs/wasm/`,
  iccUrl: `${BASE}pdfjs/iccs/`,
};

/** Legge il file a blocchi dal Blob invece di caricarlo tutto in memoria: i manuali possono pesare centinaia di MB. */
class BlobRange extends pdfjs.PDFDataRangeTransport {
  constructor(private blob: Blob) {
    super(blob.size, null);
  }
  requestDataRange(begin: number, end: number) {
    this.blob.slice(begin, end).arrayBuffer().then((b) => this.onDataRange(begin, new Uint8Array(b)));
  }
}

interface OutlineRow { title: string; depth: number; dest: unknown }
type RawOutline = { title: string; dest: unknown; items?: RawOutline[] }
const flatten = (items: RawOutline[], depth = 0): OutlineRow[] =>
  items.flatMap((i) => [{ title: i.title, depth, dest: i.dest }, ...flatten(i.items ?? [], depth + 1)]);

const GAP = 10;
const pageKey = (id: string) => `dndc:pdfpage:${id}`;

function Page({ pdf, n, width, ratio, onRatio, setRef }: {
  pdf: PDFDocumentProxy; n: number; width: number; ratio: number; onRatio: (n: number, r: number) => void; setRef: (n: number, el: HTMLDivElement | null) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => setNear(e[0].isIntersecting), { rootMargin: "1400px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    if (!near) {
      cv.width = 0;
      cv.height = 0;
      return;
    }
    let task: RenderTask | undefined;
    let dead = false;
    (async () => {
      const page = await pdf.getPage(n);
      if (dead) return;
      const base = page.getViewport({ scale: 1 });
      onRatio(n, base.height / base.width);
      const scale = width / base.width;
      let dpr = Math.min(2, window.devicePixelRatio || 1);
      while (width * dpr * (width * dpr * (base.height / base.width)) > 16_000_000 && dpr > 1) dpr -= 0.25;
      const vp = page.getViewport({ scale: scale * dpr });
      cv.width = Math.floor(vp.width);
      cv.height = Math.floor(vp.height);
      task = page.render({ canvas: cv, viewport: vp });
      try {
        await task.promise;
      } catch {
        /* rendering annullato */
      }
    })().catch(() => {});
    return () => {
      dead = true;
      task?.cancel();
    };
  }, [near, pdf, n, width, onRatio]);

  return (
    <div ref={(el) => { box.current = el; setRef(n, el); }} className="pdfv-page" style={{ width, height: Math.round(width * ratio) }} data-page={n}>
      <canvas ref={canvas} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

export function PdfViewer({ blob, title, id, onClose }: { blob: Blob; title: string; id: string; onClose: () => void }) {
  const [pdf, setPdf] = useState<PDFDocumentProxy>();
  const [error, setError] = useState<string>();
  const [pct, setPct] = useState<number>();
  const [zoom, setZoom] = useState(1);
  const [cur, setCur] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [outline, setOutline] = useState<OutlineRow[]>();
  const [showOutline, setShowOutline] = useState(false);
  const [ratios, setRatios] = useState<Record<number, number>>({});
  const scroller = useRef<HTMLDivElement>(null);
  const slots = useRef(new Map<number, HTMLDivElement>());
  const [boxW, setBoxW] = useState(0);

  useEffect(() => {
    let dead = false;
    const task = pdfjs.getDocument({
      range: new BlobRange(blob),
      rangeChunkSize: 1 << 20,
      disableAutoFetch: true,
      ...ASSETS,
    });
    task.onProgress = ({ loaded, total }: { loaded: number; total: number }) => !dead && total && setPct(Math.round((loaded / total) * 100));
    task.promise.then(
      async (doc) => {
        if (dead) return;
        setPdf(doc);
        const o = (await doc.getOutline().catch(() => null)) as RawOutline[] | null;
        if (!dead && o?.length) setOutline(flatten(o));
      },
      (e: Error) => !dead && setError(e.name === "PasswordException" ? "Il PDF è protetto da password." : "Impossibile aprire il PDF: " + e.message),
    );
    return () => {
      dead = true;
      task.destroy();
    };
  }, [blob]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBoxW(el.clientWidth));
    ro.observe(el);
    setBoxW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const width = Math.max(120, Math.round((boxW - 2 * GAP) * zoom));
  const total = pdf?.numPages ?? 0;
  const firstRatio = ratios[1] ?? 1.3;
  const onRatio = useCallback((n: number, r: number) => setRatios((x) => (Math.abs((x[n] ?? 0) - r) < 0.001 ? x : { ...x, [n]: r })), []);
  const setRef = useCallback((n: number, el: HTMLDivElement | null) => { if (el) slots.current.set(n, el); else slots.current.delete(n); }, []);

  const goTo = useCallback((n: number, smooth = false) => {
    const el = slots.current.get(n), sc = scroller.current;
    if (!el || !sc) return;
    sc.scrollTo({ top: el.offsetTop - GAP, behavior: smooth ? "smooth" : "auto" });
  }, []);

  // riprende dall'ultima pagina letta
  const restored = useRef(false);
  useEffect(() => {
    if (!pdf || !boxW || restored.current) return;
    restored.current = true;
    let n = 1;
    try { n = Math.min(pdf.numPages, Math.max(1, Number(localStorage.getItem(pageKey(id))) || 1)); } catch { /* ignore */ }
    requestAnimationFrame(() => goTo(n));
  }, [pdf, boxW, id, goTo]);

  const raf = useRef(0);
  const onScroll = () => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const sc = scroller.current;
      if (!sc) return;
      let found = 1;
      for (const [n, el] of slots.current) {
        if (el.offsetTop - GAP + el.offsetHeight * 0.5 <= sc.scrollTop + 1 && n >= found) found = n + 1;
      }
      found = Math.min(found, total || 1);
      setCur(found);
      setPageInput(String(found));
      try { localStorage.setItem(pageKey(id), String(found)); } catch { /* ignore */ }
    });
  };

  const jump = async (dest: unknown) => {
    if (!pdf) return;
    try {
      const d = typeof dest === "string" ? await pdf.getDestination(dest) : (dest as unknown[] | null);
      if (!d) return;
      const idx = await pdf.getPageIndex(d[0] as never);
      setShowOutline(false);
      goTo(idx + 1);
    } catch { /* destinazione non valida */ }
  };

  const pages = useMemo(() => Array.from({ length: total }, (_, i) => i + 1), [total]);

  return (
    <div className="pdfv" role="dialog" aria-label={title}>
      <div className="pdfv-bar">
        <button className="ghost" onClick={onClose} aria-label="Chiudi">✕</button>
        <b className="pdfv-title">{title}</b>
        {outline && <button onClick={() => setShowOutline((v) => !v)} aria-pressed={showOutline}>☰ Indice</button>}
        <span className="row gap">
          <button aria-label="Pagina precedente" disabled={cur <= 1} onClick={() => goTo(cur - 1, true)}>‹</button>
          <input className="pdfv-page-input" inputMode="numeric" aria-label="Numero di pagina" value={pageInput}
            onChange={(e) => setPageInput(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => { if (e.key === "Enter") { const n = Math.min(total, Math.max(1, Number(pageInput) || 1)); goTo(n); (e.target as HTMLInputElement).blur(); } }} />
          <span className="muted">/ {total || "…"}</span>
          <button aria-label="Pagina successiva" disabled={cur >= total} onClick={() => goTo(cur + 1, true)}>›</button>
        </span>
        <span className="row gap">
          <button aria-label="Riduci" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}>−</button>
          <span className="muted pdfv-zoom">{Math.round(zoom * 100)}%</span>
          <button aria-label="Ingrandisci" onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))}>＋</button>
        </span>
      </div>
      <div className="pdfv-body">
        {showOutline && outline && (
          <nav className="pdfv-outline" aria-label="Indice del manuale">
            {outline.map((o, i) => (
              <button key={i} className="ghost" style={{ paddingLeft: 10 + o.depth * 14 }} onClick={() => jump(o.dest)}>{o.title}</button>
            ))}
          </nav>
        )}
        <div className="pdfv-scroll" ref={scroller} onScroll={onScroll}>
          {error && <p className="error" style={{ padding: 16 }}>{error}</p>}
          {!pdf && !error && <p className="muted" style={{ padding: 16 }}>Apro il manuale…{pct != null ? ` ${pct}%` : ""}</p>}
          {pdf && boxW > 0 && (
            <div className="pdfv-pages" style={{ width: Math.max(width + 2 * GAP, boxW) }}>
              {pages.map((n) => (
                <Page key={n} pdf={pdf} n={n} width={width} ratio={ratios[n] ?? firstRatio} onRatio={onRatio} setRef={setRef} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
