import { useEffect, useState } from 'react';
import { DICTATION_MANIFEST_URL, type DictationFile, type DictationManifest } from '@/data/primary-english';

function readFiles(value: unknown): DictationFile[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is DictationFile =>
      typeof item?.file === 'string' && item.file !== '' && typeof item?.title === 'string',
  );
}

async function fetchManifest(): Promise<DictationManifest | null> {
  try {
    const resp = await fetch(DICTATION_MANIFEST_URL, { cache: 'no-cache' });
    if (!resp.ok) return null;
    const raw = await resp.json();
    const manifest: DictationManifest = {
      updated: typeof raw?.updated === 'string' ? raw.updated : undefined,
      documents: readFiles(raw?.documents),
      recordings: readFiles(raw?.recordings),
    };
    if (manifest.documents.length === 0 && manifest.recordings.length === 0) return null;
    return manifest;
  } catch {
    return null;
  }
}

/** undefined：读取中；null：服务器上还没有材料 */
export function useDictationMaterials() {
  const [manifest, setManifest] = useState<DictationManifest | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetchManifest().then((result) => {
      if (!cancelled) setManifest(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return manifest;
}
