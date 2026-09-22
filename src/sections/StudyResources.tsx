import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, FileText, Pause, Play } from 'lucide-react';
import {
  EXAM_SETS,
  STUDY_CONTACT,
  STUDY_OFFICIAL,
  STUDY_SOURCE,
  examAssetUrl,
  findExamSet,
} from '@/data/study-resources';
import { listZipAudio, readZipAudio, type ZipAudio } from '@/lib/zip-audio';
import { ROUTES } from '@/lib/routes';
import { ExamPdf } from '@/sections/ExamPdf';

function ExamList({ navigate }: { navigate: (to: string) => void }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <p className="text-sm font-medium text-[#1E40AF]">英语</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#0F172A] sm:text-3xl">
        学习资源
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
        剑桥雅思 4–21。每套真题单独打开，听力音频和 PDF 放在一起。
      </p>
      <ul className="mt-6 space-y-2">
        {EXAM_SETS.map((exam) => (
          <li key={exam.book}>
            <a
              href={`/learn/${exam.book}`}
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
                event.preventDefault();
                navigate(`/learn/${exam.book}`);
              }}
              className="flex items-center justify-between gap-4 rounded-xl bg-white px-4 py-3 shadow-[0_4px_16px_rgba(15,23,42,0.04)] transition hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
            >
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[#0F172A]">剑桥雅思 {exam.book}</span>
                <span className="mt-0.5 block text-xs text-[#64748B]">{exam.note}</span>
              </span>
              <span className="shrink-0 text-xs font-medium text-[#1E40AF]">打开</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-xs leading-relaxed text-[#94A3B8]">
        资料仅供个人学习，版权归剑桥大学出版社所有。内容来自
        <a href={STUDY_SOURCE} className="underline underline-offset-2" target="_blank" rel="noreferrer">
          Frosty Rhymes
        </a>
        。有条件请购买
        <a href={STUDY_OFFICIAL} className="underline underline-offset-2" target="_blank" rel="noreferrer">
          正版教材
        </a>
        。问题请联系
        <a href={STUDY_CONTACT} className="underline underline-offset-2">contact@frostyrhymes.com</a>
        。
      </p>
    </main>
  );
}

function ExamDetail({
  book,
  navigate,
}: {
  book: number;
  navigate: (to: string) => void;
}) {
  const exam = findExamSet(book);
  const audioUrl = exam ? examAssetUrl(exam.audioPath) : '';
  const pdfUrl = exam ? examAssetUrl(exam.pdfPath) : '';
  const [tracks, setTracks] = useState<ZipAudio[] | null>(null);
  const [catalogError, setCatalogError] = useState('');
  const [loadingTrack, setLoadingTrack] = useState<string | null>(null);
  const [activeName, setActiveName] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [playError, setPlayError] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!exam) return;
    let cancelled = false;
    setTracks(null);
    setCatalogError('');
    listZipAudio(audioUrl)
      .then((items) => {
        if (!cancelled) setTracks(items);
      })
      .catch((error: unknown) => {
        if (!cancelled) setCatalogError(error instanceof Error ? error.message : '读取听力目录失败');
      });
    return () => {
      cancelled = true;
    };
  }, [audioUrl, exam]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    };
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, ZipAudio[]>();
    for (const track of tracks ?? []) {
      const list = map.get(track.group) ?? [];
      list.push(track);
      map.set(track.group, list);
    }
    return [...map.entries()];
  }, [tracks]);

  async function playTrack(track: ZipAudio, queue?: ZipAudio[]) {
    const audio = audioRef.current;
    if (!audio) return;
    if (activeName === track.name && audio.src) {
      if (audio.paused) {
        await audio.play();
        setPlaying(true);
      } else {
        audio.pause();
        setPlaying(false);
      }
      return;
    }
    setPlayError('');
    setLoadingTrack(track.name);
    try {
      const blob = await readZipAudio(audioUrl, track);
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      const url = URL.createObjectURL(blob);
      objectUrl.current = url;
      audio.src = url;
      audio.onended = () => {
        const list = queue ?? tracks ?? [];
        const index = list.findIndex((item) => item.name === track.name);
        const next = list[index + 1];
        if (next) {
          void playTrack(next, list);
        } else {
          setPlaying(false);
        }
      };
      await audio.play();
      setActiveName(track.name);
      setPlaying(true);
    } catch (error) {
      setPlayError(error instanceof Error ? error.message : '播放失败');
      setPlaying(false);
    } finally {
      setLoadingTrack(null);
    }
  }

  if (!exam) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm text-[#64748B]">没有这一套真题。</p>
        <button type="button" className="mt-4 text-sm text-[#1E40AF]" onClick={() => navigate(ROUTES.learn)}>
          返回列表
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <button
        type="button"
        onClick={() => navigate(ROUTES.learn)}
        className="inline-flex items-center gap-1 text-sm text-[#64748B] hover:text-[#0F172A]"
      >
        <ArrowLeft className="h-4 w-4" />
        全部套题
      </button>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#0F172A]">剑桥雅思 {exam.book}</h1>
      <p className="mt-2 text-sm text-[#64748B]">{exam.note}</p>
      {exam.detail && <p className="mt-2 text-sm leading-relaxed text-[#64748B]">{exam.detail}</p>}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!tracks?.length || loadingTrack !== null}
          onClick={() => {
            const track = tracks?.find((item) => item.name === activeName) ?? tracks?.[0];
            if (track && tracks) void playTrack(track, tracks);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E40AF] px-3 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-50"
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {loadingTrack ? '正在载入…' : playing ? '播放中' : '播放听力'}
        </button>
        <label className="inline-flex items-center gap-2 text-sm text-[#64748B]">
          段落
          <select
            value={activeName ?? tracks?.[0]?.name ?? ''}
            disabled={!tracks?.length}
            onChange={(event) => setActiveName(event.target.value)}
            className="rounded-lg bg-white px-2 py-2 text-sm text-[#0F172A] shadow-sm disabled:opacity-50"
          >
            {groups.map(([group, items]) => (
              <optgroup key={group} label={group}>
                {items.map((track) => (
                  <option key={track.name} value={track.name}>
                    {track.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      </div>
      {catalogError && <p className="mt-3 text-sm text-[#B45309]">{catalogError}</p>}
      {playError && <p className="mt-3 text-sm text-[#B45309]">{playError}</p>}
      {tracks && tracks.length === 0 && (
        <p className="mt-3 text-sm text-[#64748B]">这个压缩包里没有可播放的音频。</p>
      )}

      <audio ref={audioRef} className="mt-4 w-full" controls />

      <div className="mt-5 overflow-hidden rounded-xl bg-white shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between gap-3 border-b border-[#E2E8F0] px-4 py-2">
          <span className="text-xs text-[#64748B]">真题 PDF · {exam.pdfSize}</span>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-[#1E40AF]"
          >
            <FileText className="h-3.5 w-3.5" />
            新窗口打开
          </a>
        </div>
        <ExamPdf url={pdfUrl} />
      </div>
    </main>
  );
}

export function StudyResources({
  exam,
  navigate,
}: {
  exam: number | null;
  navigate: (to: string) => void;
}) {
  if (exam == null) return <ExamList navigate={navigate} />;
  return <ExamDetail key={exam} book={exam} navigate={navigate} />;
}
