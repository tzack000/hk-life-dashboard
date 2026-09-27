import { useRef, useState } from 'react';
import { ArrowLeft, ExternalLink, FileText } from 'lucide-react';
import {
  DICTATION_TITLE,
  PRIMARY_RESOURCE_GROUPS,
  dictationFileUrl,
  formatFileSize,
  isImageFile,
  type DictationManifest,
} from '@/data/primary-english';
import { useDictationMaterials } from '@/hooks/use-dictation-materials';
import { ROUTES } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { ExamPdf } from '@/sections/ExamPdf';

function formatUpdated(updated?: string) {
  if (!updated) return '';
  const date = new Date(updated);
  if (Number.isNaN(date.getTime())) return '';
  return `更新于 ${date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}`;
}

function Recordings({ manifest }: { manifest: DictationManifest }) {
  const listRef = useRef<HTMLUListElement>(null);
  if (manifest.recordings.length === 0) return null;
  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium text-[#1E40AF]">录音</h3>
      <ul ref={listRef} className="mt-2 space-y-2">
        {manifest.recordings.map((item) => (
          <li key={item.file} className="rounded-xl bg-[#F8FAFC] px-3 py-2">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-sm font-medium text-[#0F172A]">{item.title}</span>
              <span className="shrink-0 text-xs text-[#94A3B8]">{formatFileSize(item.size)}</span>
            </div>
            <audio
              className="mt-2 w-full"
              controls
              preload="none"
              src={dictationFileUrl(item.file)}
              onPlay={(event) => {
                listRef.current?.querySelectorAll('audio').forEach((audio) => {
                  if (audio !== event.currentTarget) audio.pause();
                });
              }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Documents({ manifest }: { manifest: DictationManifest }) {
  const [activeFile, setActiveFile] = useState(manifest.documents[0]?.file ?? '');
  const active = manifest.documents.find((item) => item.file === activeFile) ?? manifest.documents[0];
  if (!active) return null;
  const url = dictationFileUrl(active.file);
  return (
    <div className="mt-5">
      <h3 className="text-sm font-medium text-[#1E40AF]">练习文档</h3>
      {manifest.documents.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {manifest.documents.map((item) => (
            <button
              key={item.file}
              type="button"
              onClick={() => setActiveFile(item.file)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                item.file === active.file
                  ? 'bg-[#1E40AF] text-white'
                  : 'bg-[#F1F5F9] text-[#0F172A] hover:bg-[#E2E8F0]',
              )}
              aria-pressed={item.file === active.file}
            >
              {item.title}
            </button>
          ))}
        </div>
      )}
      <div className="mt-2 overflow-hidden rounded-xl border border-[#E2E8F0]">
        <div className="flex items-center justify-between gap-3 border-b border-[#E2E8F0] px-4 py-2">
          <span className="min-w-0 truncate text-xs text-[#64748B]">
            {active.title}
            {active.size ? ` · ${formatFileSize(active.size)}` : ''}
          </span>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[#1E40AF]"
          >
            <FileText className="h-3.5 w-3.5" />
            新窗口打开
          </a>
        </div>
        {isImageFile(active.file) ? (
          <div className="max-h-[calc(100vh-12rem)] overflow-auto bg-[#E2E8F0] p-3">
            <img src={url} alt={active.title} className="mx-auto w-full max-w-3xl bg-white shadow-sm" />
          </div>
        ) : (
          <ExamPdf key={url} url={url} label="听写文档" />
        )}
      </div>
    </div>
  );
}

function DictationMaterials() {
  const manifest = useDictationMaterials();
  const updated = manifest ? formatUpdated(manifest.updated) : '';
  return (
    <section className="mt-6 rounded-2xl bg-white p-4 shadow-[0_8px_28px_rgba(15,23,42,0.06)] sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-[#0F172A]">{DICTATION_TITLE}</h2>
        {updated && <span className="text-xs text-[#94A3B8]">{updated}</span>}
      </div>
      {manifest === undefined && <p className="mt-3 text-sm text-[#64748B]">正在读取听写材料…</p>}
      {manifest === null && (
        <div className="mt-3 rounded-xl border border-dashed border-[#CBD5E1] px-4 py-6 text-center">
          <p className="text-sm font-medium text-[#0F172A]">听写材料待上传</p>
          <p className="mt-1 text-xs leading-relaxed text-[#64748B]">
            学校的听写文档和录音上传后，在这里查看和播放。
          </p>
        </div>
      )}
      {manifest && (
        <>
          <Recordings manifest={manifest} />
          <Documents manifest={manifest} />
        </>
      )}
    </section>
  );
}

export function PrimaryEnglish({ navigate }: { navigate: (to: string) => void }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <button
        type="button"
        onClick={() => navigate(ROUTES.learn)}
        className="inline-flex items-center gap-1 text-sm text-[#64748B] hover:text-[#0F172A]"
      >
        <ArrowLeft className="h-4 w-4" />
        学习资源
      </button>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#0F172A] sm:text-3xl">小学英语</h1>
      <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
        学校听写文档和录音，加上适合小学生的免费英语网站。
      </p>

      <DictationMaterials />

      <section className="mt-8">
        <h2 className="text-base font-semibold text-[#0F172A]">免费英语资源</h2>
        <p className="mt-1 text-xs text-[#64748B]">均为官方或出版机构网站，新窗口打开。</p>
        <div className="mt-4 space-y-5">
          {PRIMARY_RESOURCE_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-medium text-[#1E40AF]">{group.title}</h3>
              <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {group.items.map((item) => (
                  <li
                    key={item.url}
                    className="flex flex-col rounded-xl bg-white shadow-[0_4px_16px_rgba(15,23,42,0.04)] transition hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
                  >
                    <a href={item.url} target="_blank" rel="noreferrer" className="flex-1 px-4 pt-3 pb-3">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-[#0F172A]">
                        {item.name}
                        <ExternalLink className="h-3.5 w-3.5 text-[#94A3B8]" />
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-[#64748B]">{item.description}</span>
                    </a>
                    {item.extra && (
                      <a
                        href={item.extra.url}
                        target="_blank"
                        rel="noreferrer"
                        className="-mt-1 px-4 pb-3 text-xs font-medium text-[#1E40AF] underline-offset-2 hover:underline"
                      >
                        {item.extra.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
