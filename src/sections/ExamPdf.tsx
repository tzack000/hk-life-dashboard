import { useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy, type RenderTask } from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = `${workerSrc}?v=1`;

function PdfPage({ pdf, pageNumber }: { pdf: PDFDocumentProxy; pageNumber: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(pageNumber <= 2);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setVisible(true);
      },
      { root: el.parentElement, rootMargin: '600px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    let cancelled = false;
    let task: RenderTask | null = null;
    (async () => {
      const page = await pdf.getPage(pageNumber);
      if (cancelled) return;
      const width = wrap.clientWidth || 720;
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: width / base.width });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      task = page.render({
        canvas,
        viewport,
        transform: dpr === 1 ? undefined : [dpr, 0, 0, dpr, 0, 0],
      });
      await task.promise;
      if (!cancelled) setReady(true);
    })().catch((reason: unknown) => {
      if (cancelled) return;
      const message = reason instanceof Error ? reason.message : '这一页无法显示';
      if (/cancel/i.test(message)) return;
      setError(message);
    });
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [visible, pdf, pageNumber]);

  return (
    <div ref={wrapRef} className="relative mb-3 bg-white shadow-sm">
      {!ready && <div className="aspect-[210/297] w-full" />}
      {error && <p className="p-3 text-sm text-[#B45309]">{error}</p>}
      <canvas ref={canvasRef} className={ready ? 'block w-full' : 'absolute h-px w-px opacity-0'} />
    </div>
  );
}

export function ExamPdf({ url }: { url: string }) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let doc: PDFDocumentProxy | null = null;
    setPdf(null);
    setError('');
    (async () => {
      const response = await fetch(url);
      if (!response.ok) throw new Error('真题 PDF 加载失败');
      const data = await response.arrayBuffer();
      doc = await getDocument({ data }).promise;
      if (cancelled) {
        await doc.destroy();
        return;
      }
      setPdf(doc);
    })().catch((reason: unknown) => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : '真题 PDF 加载失败');
    });
    return () => {
      cancelled = true;
      void doc?.destroy();
    };
  }, [url]);

  return (
    <div className="h-[calc(100vh-16rem)] min-h-[36rem] overflow-auto bg-[#E2E8F0] px-3 py-4">
      {error && <p className="text-sm text-[#B45309]">{error}</p>}
      {!pdf && !error && <p className="text-sm text-[#64748B]">正在打开真题…</p>}
      {pdf &&
        Array.from({ length: pdf.numPages }, (_, index) => (
          <PdfPage key={`${url}-${index + 1}`} pdf={pdf} pageNumber={index + 1} />
        ))}
    </div>
  );
}
