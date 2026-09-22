export type ZipAudio = {
  name: string;
  group: string;
  label: string;
  method: number;
  compSize: number;
  uncompSize: number;
  localOffset: number;
};

const AUDIO_EXT = /\.(mp3|m4a|aac|wav)$/i;

function u16(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function u32(bytes: Uint8Array, offset: number) {
  return (
    (bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24)) >>>
    0
  );
}

function asBlob(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy]);
}

async function fetchRange(url: string, start: number, endInclusive: number) {
  const response = await fetch(url, {
    headers: { Range: `bytes=${start}-${endInclusive}` },
  });
  if (response.status !== 206 && response.status !== 200) {
    throw new Error(`读取音频失败（${response.status}）`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

function trackMeta(name: string) {
  const normalized = name.replace(/\\/g, '/');
  const test = normalized.match(/Test\s*(\d+)/i);
  const section = normalized.match(/Section\s*(\d+)/i);
  const file = normalized.split('/').pop() ?? normalized;
  return {
    group: test ? `Test ${test[1]}` : '听力',
    label: section ? `Section ${section[1]}` : file.replace(AUDIO_EXT, ''),
    order: (test ? Number(test[1]) : 99) * 10 + (section ? Number(section[1]) : 0),
  };
}

function parseCentralDirectory(bytes: Uint8Array, baseOffset: number): ZipAudio[] {
  const eocd = bytes.lastIndexOf(0x50) >= 0
    ? (() => {
        for (let i = bytes.length - 22; i >= 0; i -= 1) {
          if (u32(bytes, i) === 0x06054b50) return i;
        }
        return -1;
      })()
    : -1;
  if (eocd < 0) throw new Error('无法识别音频压缩包');

  const cdSize = u32(bytes, eocd + 12);
  const cdOffset = u32(bytes, eocd + 16);
  if (cdOffset < baseOffset || cdOffset + cdSize > baseOffset + bytes.length) {
    throw new Error('NEED_CD');
  }
  const cd = bytes.subarray(cdOffset - baseOffset, cdOffset - baseOffset + cdSize);
  const tracks: (ZipAudio & { order: number })[] = [];
  let cursor = 0;
  while (cursor + 46 <= cd.length && u32(cd, cursor) === 0x02014b50) {
    const method = u16(cd, cursor + 10);
    const compSize = u32(cd, cursor + 20);
    const uncompSize = u32(cd, cursor + 24);
    const nameLen = u16(cd, cursor + 28);
    const extraLen = u16(cd, cursor + 30);
    const commentLen = u16(cd, cursor + 32);
    const localOffset = u32(cd, cursor + 42);
    const name = new TextDecoder().decode(cd.subarray(cursor + 46, cursor + 46 + nameLen));
    if (AUDIO_EXT.test(name) && compSize > 0) {
      const meta = trackMeta(name);
      tracks.push({
        name,
        group: meta.group,
        label: meta.label,
        method,
        compSize,
        uncompSize,
        localOffset,
        order: meta.order,
      });
    }
    cursor += 46 + nameLen + extraLen + commentLen;
  }
  tracks.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  return tracks.map(({ order: _order, ...track }) => track);
}

export async function listZipAudio(url: string): Promise<ZipAudio[]> {
  const tail = await fetch(url, { headers: { Range: 'bytes=-262144' } });
  if (tail.status !== 206 && tail.status !== 200) {
    throw new Error(`读取音频目录失败（${tail.status}）`);
  }
  const range = tail.headers.get('content-range') ?? '';
  const matched = range.match(/bytes (\d+)-(\d+)\/(\d+)/);
  const bytes = new Uint8Array(await tail.arrayBuffer());
  const base = matched ? Number(matched[1]) : 0;
  try {
    return parseCentralDirectory(bytes, base);
  } catch (error) {
    if (!(error instanceof Error) || error.message !== 'NEED_CD') throw error;
  }

  const eocd = (() => {
    for (let i = bytes.length - 22; i >= 0; i -= 1) {
      if (u32(bytes, i) === 0x06054b50) return i;
    }
    return -1;
  })();
  if (eocd < 0) throw new Error('无法识别音频压缩包');
  const cdSize = u32(bytes, eocd + 12);
  const cdOffset = u32(bytes, eocd + 16);
  const cdBytes = await fetchRange(url, cdOffset, cdOffset + cdSize + 22);
  return parseCentralDirectory(cdBytes, cdOffset);
}

export async function readZipAudio(url: string, entry: ZipAudio): Promise<Blob> {
  const probe = await fetchRange(url, entry.localOffset, entry.localOffset + 30 + 1024);
  if (u32(probe, 0) !== 0x04034b50) throw new Error('音频条目损坏');
  const nameLen = u16(probe, 26);
  const extraLen = u16(probe, 28);
  const dataStart = entry.localOffset + 30 + nameLen + extraLen;
  const compressed = await fetchRange(url, dataStart, dataStart + entry.compSize - 1);

  let raw: Uint8Array;
  if (entry.method === 0) {
    raw = compressed;
  } else if (entry.method === 8) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('当前浏览器不能解压音频');
    }
    const stream = asBlob(compressed).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    raw = new Uint8Array(await new Response(stream).arrayBuffer());
  } else {
    throw new Error('不支持的音频压缩格式');
  }

  const ext = entry.name.split('.').pop()?.toLowerCase();
  const type = ext === 'mp3' ? 'audio/mpeg' : 'audio/mp4';
  return new Blob([asBlob(raw)], { type });
}
