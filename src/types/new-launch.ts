export type LaunchStatus = '即将推售' | '发售中' | '已售罄';

export type LaunchStatusFilter = '全部' | LaunchStatus;

export type PropertyView = 'rental' | 'sale' | 'launch';

export interface NewLaunch {
  id: string;
  name: string;
  nearestStation: string;
  minutesToKaiTak: number;
  developer: string;
  address: string;
  status: LaunchStatus;
  keyDate: string | null;
  unitCount: number | null;
  priceFrom: number | null;
  sourceUrl: string;
}

export interface LaunchEvent {
  id: string;
  launchId: string;
  date: string;
  kind: 'appeared' | 'status' | 'price' | 'date';
  summary: string;
}

export interface NewLaunchFile {
  lastUpdated: string;
  source: string;
  launches: NewLaunch[];
  events: LaunchEvent[];
}
