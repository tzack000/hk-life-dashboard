import { useEffect, useMemo, useState } from 'react';
import stationFile from '../../scraper/kai-tak-mtr-30.json';
import { mockNewLaunches } from '@/data/mock-new-launches';
import type {
  LaunchEvent,
  LaunchStatus,
  LaunchStatusFilter,
  NewLaunch,
  NewLaunchFile,
} from '@/types/new-launch';

export const LAUNCH_STATUSES: LaunchStatus[] = ['即将推售', '发售中', '已售罄'];

const STATUS_RANK: Record<LaunchStatus, number> = {
  发售中: 0,
  即将推售: 1,
  已售罄: 2,
};

const stationNames = new Set(stationFile.stations.map((station) => station.name));

export function isInCatchment(launch: NewLaunch): boolean {
  return stationNames.has(launch.nearestStation)
    && Number.isFinite(launch.minutesToKaiTak)
    && launch.minutesToKaiTak >= 0
    && launch.minutesToKaiTak <= stationFile.maxMinutes;
}

function sortLaunches(launches: NewLaunch[]): NewLaunch[] {
  return [...launches].sort((a, b) => {
    const byStatus = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (byStatus !== 0) return byStatus;
    if (a.minutesToKaiTak !== b.minutesToKaiTak) return a.minutesToKaiTak - b.minutesToKaiTak;
    if (a.keyDate && b.keyDate) return a.keyDate.localeCompare(b.keyDate);
    if (a.keyDate) return -1;
    if (b.keyDate) return 1;
    return a.name.localeCompare(b.name, 'zh-HK');
  });
}

function groupEvents(events: LaunchEvent[]): Map<string, LaunchEvent[]> {
  const grouped = new Map<string, LaunchEvent[]>();
  const ordered = [...events].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  for (const event of ordered) {
    const list = grouped.get(event.launchId) ?? [];
    list.push(event);
    grouped.set(event.launchId, list);
  }
  return grouped;
}

async function fetchServerData(): Promise<NewLaunchFile | null> {
  try {
    const resp = await fetch('./data/new-launches.json', { cache: 'no-cache' });
    if (!resp.ok) return null;
    const data: NewLaunchFile = await resp.json();
    if (!Array.isArray(data.launches) || data.launches.length === 0) return null;
    return data;
  } catch {
    return null;
  }
}

export function useNewLaunches() {
  const [statusFilter, setStatusFilter] = useState<LaunchStatusFilter>('全部');
  const [file, setFile] = useState<NewLaunchFile | null>(null);
  const [dataSource, setDataSource] = useState<'loading' | 'server' | 'mock'>('loading');

  useEffect(() => {
    fetchServerData().then((data) => {
      if (data) {
        setFile(data);
        setDataSource('server');
      } else {
        setFile(mockNewLaunches);
        setDataSource('mock');
      }
    });
  }, []);

  const inCatchment = useMemo(
    () => (file?.launches ?? []).filter(isInCatchment),
    [file],
  );

  const launches = useMemo(() => {
    const filtered = statusFilter === '全部'
      ? inCatchment
      : inCatchment.filter((launch) => launch.status === statusFilter);
    return sortLaunches(filtered);
  }, [inCatchment, statusFilter]);

  const eventsByLaunch = useMemo(() => groupEvents(file?.events ?? []), [file]);

  return {
    statusFilter,
    setStatusFilter,
    launches,
    catchmentCount: inCatchment.length,
    eventsByLaunch,
    dataSource,
    lastUpdated: file?.lastUpdated,
    sourceName: dataSource === 'server' ? (file?.source || '中原地产') : '模拟生成',
  };
}
