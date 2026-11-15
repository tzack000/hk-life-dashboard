import type { LaunchEvent, NewLaunch, NewLaunchFile } from '@/types/new-launch';

const launches: NewLaunch[] = [
  {
    id: 'mock-kt-marina',
    name: '启德海湾 2',
    nearestStation: '启德',
    minutesToKaiTak: 0,
    developer: '中国海外发展有限公司',
    address: '启德承丰道15号',
    status: '发售中',
    keyDate: '2026-10-18',
    unitCount: 648,
    priceFrom: 5600000,
    sourceUrl: 'https://hk.centanet.com/findproperty/list/new-property',
  },
  {
    id: 'mock-to-kwa-wan',
    name: '沐宁里',
    nearestStation: '土瓜湾',
    minutesToKaiTak: 8,
    developer: '',
    address: '土瓜湾宋皇台道',
    status: '即将推售',
    keyDate: '2026-12-01',
    unitCount: null,
    priceFrom: null,
    sourceUrl: '',
  },
  {
    id: 'mock-mong-kok',
    name: '太子壹号',
    nearestStation: '旺角',
    minutesToKaiTak: 23,
    developer: '会德丰地产有限公司',
    address: '旺角基隆街1号',
    status: '发售中',
    keyDate: null,
    unitCount: 120,
    priceFrom: 8200000,
    sourceUrl: '',
  },
  {
    id: 'mock-mei-foo',
    name: '美孚湾',
    nearestStation: '美孚',
    minutesToKaiTak: 25,
    developer: '新鸿基地产发展有限公司',
    address: '美孚百老汇街',
    status: '已售罄',
    keyDate: '2026-06-30',
    unitCount: 300,
    priceFrom: 9800000,
    sourceUrl: '',
  },
];

const events: LaunchEvent[] = [
  {
    id: 'mock-kt-marina-2',
    launchId: 'mock-kt-marina',
    date: '2026-10-02',
    kind: 'price',
    summary: '最低售价调整为 $560万',
  },
  {
    id: 'mock-kt-marina-1',
    launchId: 'mock-kt-marina',
    date: '2026-09-12',
    kind: 'appeared',
    summary: '首次收录，状态为发售中',
  },
  {
    id: 'mock-to-kwa-wan-1',
    launchId: 'mock-to-kwa-wan',
    date: '2026-10-05',
    kind: 'date',
    summary: '下一关键日期定为 2026-12-01',
  },
  {
    id: 'mock-mei-foo-1',
    launchId: 'mock-mei-foo',
    date: '2026-08-20',
    kind: 'status',
    summary: '销售状态由「发售中」变为「已售罄」',
  },
];

export const mockNewLaunches: NewLaunchFile = {
  lastUpdated: '2026-10-08T09:00:00+08:00',
  source: '模拟生成',
  launches,
  events,
};
