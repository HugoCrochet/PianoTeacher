"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { Button } from "@/components/ui/button";
import { useScreenWakeLock } from "@/features/practice/session-stage";

const ZOOMS = [0.75, 1, 1.25, 1.5, 2] as const;
/** Plafond de pixels par page : au-delà, Safari iPad refuse de dessiner le canvas. */
const MAX_CANVAS_PIXELS = 12_000_000;

function PdfPage({ doc, number, width }: { doc: PDFDocumentProxy; number: number; width: number }) {
  const wrapper = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ratio, setRatio] = useState(1.414);
  const [near, setNear] = useState(number <= 2);

  // Ne dessine que les pages proches de l'écran, et libère la mémoire des autres.
  useEffect(() => {
    const el = wrapper.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), { rootMargin: "1500px 0px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const c = canvas.current;
    if (!c || width <= 0) return;
    if (!near) {
      c.width = 0;
      c.height = 0;
      return;
    }
    let task: RenderTask | null = null;
    let cancelled = false;
    void doc.getPage(number).then((page) => {
      if (cancelled) return;
      const base = page.getViewport({ scale: 1 });
      setRatio(base.height / base.width);
      const wanted = (width / base.width) * Math.min(2, window.devicePixelRatio || 1);
      const cap = Math.sqrt(MAX_CANVAS_PIXELS / (base.width * base.height));
      const viewport = page.getViewport({ scale: Math.min(wanted, cap) });
      c.width = Math.floor(viewport.width);
      c.height = Math.floor(viewport.height);
      task = page.render({ canvas: c, viewport });
      task.promise.catch(() => {
        // Rendu annulé (défilement, zoom) : la page sera redessinée.
      });
    });
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, number, width, near]);

  return (
    <div
      ref={wrapper}
      className="mx-auto overflow-hidden rounded-md bg-white shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
      style={{ width, aspectRatio: `1 / ${ratio}` }}
    >
      <canvas ref={canvas} role="img" aria-label={`Page ${number}`} className="block h-full w-full" />
    </div>
  );
}

/**
 * Lecteur de partition intégré (PDF.js) : toutes les pages à la suite, ajustées à la largeur,
 * avec zoom. Le fichier est téléchargé en une fois depuis une URL signée de courte durée.
 */
export function ScoreReader({ url, fallbackHref }: { url: string; fallbackHref: string }) {
  const area = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [failed, setFailed] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(1);
  const [width, setWidth] = useState(0);
  useScreenWakeLock();

  useEffect(() => {
    let cancelled = false;
    let task: { destroy: () => Promise<void> } | null = null;
    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
        // Téléchargement complet : l'URL signée expire vite, pas de requêtes partielles plus tard.
        const loading = pdfjs.getDocument({ url, disableRange: true, disableStream: true });
        task = loading;
        const loaded = await loading.promise;
        if (!cancelled) setDoc(loaded);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      void task?.destroy();
    };
  }, [url]);

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const zoom = ZOOMS[zoomIndex];
  const pageWidth = Math.min(1100, width) * zoom;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-11 px-0"
          aria-label="Dézoomer"
          disabled={zoomIndex === 0}
          onClick={() => setZoomIndex((z) => Math.max(0, z - 1))}
        >
          <Minus size={18} aria-hidden />
        </Button>
        <span className="min-w-14 text-center text-[17px] tabular-nums" aria-live="polite">
          {Math.round(zoom * 100)} %
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-11 px-0"
          aria-label="Zoomer"
          disabled={zoomIndex === ZOOMS.length - 1}
          onClick={() => setZoomIndex((z) => Math.min(ZOOMS.length - 1, z + 1))}
        >
          <Plus size={18} aria-hidden />
        </Button>
        <span className="text-[15px] text-ink-2">
          {doc ? `${doc.numPages} page${doc.numPages > 1 ? "s" : ""}` : failed ? "" : "Chargement…"}
        </span>
        <a href={fallbackHref} target="_blank" rel="noreferrer" className="ml-auto text-[15px] text-ink-2 underline underline-offset-4">
          Ouvrir dans un nouvel onglet
        </a>
      </div>

      <div ref={area} className="overflow-x-auto">
        {failed ? (
          <p role="alert" className="max-w-[760px] text-[17px]">
            La partition n’a pas pu s’afficher ici.{" "}
            <a href={fallbackHref} target="_blank" rel="noreferrer" className="underline underline-offset-4">
              Ouvre-la dans un nouvel onglet
            </a>
            .
          </p>
        ) : doc && pageWidth > 0 ? (
          <div className="flex flex-col gap-4 pb-10" style={{ width: Math.max(pageWidth, width) }}>
            {Array.from({ length: doc.numPages }, (_, i) => (
              <PdfPage key={i} doc={doc} number={i + 1} width={pageWidth} />
            ))}
          </div>
        ) : (
          <div className="h-[60vh] max-w-[760px] animate-pulse rounded-md bg-line/60 motion-reduce:animate-none" aria-hidden />
        )}
      </div>
    </div>
  );
}
