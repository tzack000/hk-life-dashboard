import type { RentalTransaction } from '@/types/rental';
import { estates } from './estates';

// 确定性伪随机数生成器（基于字符串哈希种子）
function hashSeed(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };
}

// 房型配置：房型名称、面积范围(sqft)、租金基准范围(HK$)
const layoutConfigs = [
  { layout: '开放式', areaMin: 200, areaMax: 320, rentMin: 11000, rentMax: 16000 },
  { layout: '1房', areaMin: 300, areaMax: 450, rentMin: 15000, rentMax: 22000 },
  { layout: '2房', areaMin: 450, areaMax: 650, rentMin: 22000, rentMax: 35000 },
  { layout: '3房', areaMin: 650, areaMax: 950, rentMin: 35000, rentMax: 55000 },
  { layout: '4房', areaMin: 900, areaMax: 1300, rentMin: 50000, rentMax: 75000 },
];

// 小区租金溢价系数（基于实际市场定位）
const estatePremiums: Record<string, number> = {
  'Oasis Kai Tak': 1.0,
  'K.CITY': 1.05,
  'K.Summit': 1.12,
  'Monaco One': 1.06,
  'Monaco Marine': 1.08,
  'VIBE': 0.95,
  'One Kai Tak': 0.93,
  'AIRSIDE': 1.15,
  'The Henley': 1.10,
  'Upper RiverBank': 1.03,
};

// 房型权重分布（更多1房和2房）
const layoutWeights = [0.1, 0.3, 0.35, 0.2, 0.05];

function pickLayout(rand: () => number): number {
  const r = rand();
  let cumulative = 0;
  for (let i = 0; i < layoutWeights.length; i++) {
    cumulative += layoutWeights[i];
    if (r < cumulative) return i;
  }
  return layoutWeights.length - 1;
}

export function generateTransactions(year: number, month: number): RentalTransaction[] {
  const transactions: RentalTransaction[] = [];

  for (const estate of estates) {
    const seed = hashSeed(`${estate.name}-${year}-${month}`);
    const rand = seededRandom(seed);
    const premium = estatePremiums[estate.name] ?? 1.0;

    // 每个小区每月 3-8 笔成交
    const count = 3 + Math.floor(rand() * 6);
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let i = 0; i < count; i++) {
      const layoutIdx = pickLayout(rand);
      const config = layoutConfigs[layoutIdx];

      const area = Math.round(config.areaMin + rand() * (config.areaMax - config.areaMin));
      const floor = 1 + Math.floor(rand() * (estate.propertyType === '商住' ? 40 : 35));
      const totalFloors = estate.propertyType === '商住' ? 42 : 36;

      // 高层溢价 + 小区溢价
      const floorPremium = 1 + (floor / totalFloors) * 0.08;
      const baseRent = config.rentMin + rand() * (config.rentMax - config.rentMin);
      const monthlyRent = Math.round(baseRent * premium * floorPremium / 100) * 100;
      const rentPerSqft = Math.round((monthlyRent / area) * 10) / 10;

      const day = 1 + Math.floor(rand() * daysInMonth);
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      transactions.push({
        id: `${estate.id}-${year}${month}-${i}`,
        estateName: estate.name,
        address: estate.address,
        layout: config.layout,
        area,
        floor,
        totalFloors,
        monthlyRent,
        rentPerSqft,
        transactionDate: dateStr,
        propertyType: estate.propertyType,
      });
    }
  }

  // 按成交日期排序
  transactions.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
  return transactions;
}

// 获取可用月份列表（最近12个月）
export function getAvailableMonths(): { year: number; month: number; label: string }[] {
  const months: { year: number; month: number; label: string }[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  for (let i = 1; i <= 12; i++) {
    let y = currentYear;
    let m = currentMonth - i;
    if (m <= 0) {
      m += 12;
      y -= 1;
    }
    months.push({
      year: y,
      month: m,
      label: `${y}年${m}月`,
    });
  }
  return months;
}
