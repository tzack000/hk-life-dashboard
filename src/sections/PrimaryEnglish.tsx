import { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, Eye, EyeOff, Volume2 } from 'lucide-react';
import { DICTATION_TERM, PRIMARY_RESOURCE_GROUPS, type Dictation } from '@/data/primary-english';
import { ROUTES } from '@/lib/routes';
import { cn } from '@/lib/utils';

const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

function speak(text: string) {
  if (!canSpeak) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-GB';
  utterance.rate = 0.8;
  window.speechSynthesis.speak(utterance);
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

function SpeakButton({ text }: { text: string }) {
  if (!canSpeak) return null;
  return (
    <button
      type="button"
      onClick={() => speak(text)}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E40AF]"
      aria-label={`朗读 ${text}`}
    >
      <Volume2 className="h-4 w-4" />
    </button>
  );
}

function Hidden({ text }: { text: string }) {
  return (
    <span
      className="inline-block h-4 rounded bg-[#E2E8F0] align-middle"
      style={{ width: `${Math.min(Math.max(text.length, 3), 40) * 0.55}em` }}
      aria-label="已遮住"
    />
  );
}

function DictationCard({ dictation, hidden }: { dictation: Dictation; hidden: boolean }) {
  return (
    <li className="rounded-xl border border-[#E2E8F0] p-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-sm font-semibold text-[#0F172A]">第 {dictation.no} 次</span>
        {dictation.date && <span className="text-xs text-[#64748B]">{formatDate(dictation.date)}</span>}
        {dictation.unit && <span className="text-xs text-[#94A3B8]">{dictation.unit}</span>}
      </div>
      <ul className="mt-3 grid grid-cols-1 gap-1 sm:grid-cols-2">
        {dictation.words.map((word) => (
          <li key={word.en} className="flex items-center gap-2 rounded-lg bg-[#F8FAFC] py-1 pl-3 pr-1">
            <span className="min-w-0 flex-1">
              {hidden ? (
                <Hidden text={word.en} />
              ) : (
                <span className="text-sm font-medium text-[#0F172A]">{word.en}</span>
              )}
              {word.zh && <span className="ml-2 text-xs text-[#64748B]">{word.zh}</span>}
            </span>
            <SpeakButton text={word.en} />
          </li>
        ))}
      </ul>
      {dictation.sentences && dictation.sentences.length > 0 && (
        <ol className="mt-3 space-y-1">
          {dictation.sentences.map((sentence, index) => (
            <li key={sentence} className="flex items-center gap-2 text-sm text-[#0F172A]">
              <span className="w-5 shrink-0 text-xs text-[#94A3B8]">{index + 1}.</span>
              <span className="min-w-0 flex-1">{hidden ? <Hidden text={sentence} /> : sentence}</span>
              <SpeakButton text={sentence} />
            </li>
          ))}
        </ol>
      )}
    </li>
  );
}

export function PrimaryEnglish({ navigate }: { navigate: (to: string) => void }) {
  const [hidden, setHidden] = useState(false);
  const { dictations } = DICTATION_TERM;

  useEffect(() => {
    return () => {
      if (canSpeak) window.speechSynthesis.cancel();
    };
  }, []);

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
        学校默书，加上适合小学生的免费英语网站。
      </p>

      <section className="mt-6 rounded-2xl bg-white p-4 shadow-[0_8px_28px_rgba(15,23,42,0.06)] sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-[#0F172A]">{DICTATION_TERM.title}</h2>
          {dictations.length > 0 && (
            <button
              type="button"
              onClick={() => setHidden((value) => !value)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition',
                hidden ? 'bg-[#1E40AF] text-white' : 'bg-[#F1F5F9] text-[#0F172A] hover:bg-[#E2E8F0]',
              )}
              aria-pressed={hidden}
            >
              {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              遮住单词
            </button>
          )}
        </div>
        {dictations.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-[#CBD5E1] px-4 py-6 text-center">
            <p className="text-sm font-medium text-[#0F172A]">{DICTATION_TERM.pendingNote}</p>
            <p className="mt-1 text-xs leading-relaxed text-[#64748B]">
              导入学校的默书表后，这里按次列出单词和句子，可以遮住单词、点读练听写。
            </p>
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            {dictations.map((dictation) => (
              <DictationCard key={dictation.no} dictation={dictation} hidden={hidden} />
            ))}
          </ul>
        )}
      </section>

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
