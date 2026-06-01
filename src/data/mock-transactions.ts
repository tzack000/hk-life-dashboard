import type { RentalTransaction, SaleTransaction, Estate } from '@/types/rental';
import { estates as allEstates } from './estates';

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

// 购房：每尺价格范围(HK$/sqft)
const salePriceConfigs = [
  { layout: '开放式', priceMin: 14000, priceMax: 20000 },
  { layout: '1房', priceMin: 15000, priceMax: 22000 },
  { layout: '2房', priceMin: 16000, priceMax: 24000 },
  { layout: '3房', priceMin: 17000, priceMax: 26000 },
  { layout: '4房', priceMin: 18000, priceMax: 28000 },
];

// 小区溢价系数
const estatePremiums: Record<string, number> = {
  // 启德
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
  // 荃湾西
  '城·点 (Citypoint)': 1.0,
  '柏傲湾 (Pavilia Bay)': 1.08,
  '海之恋 (Ocean Pride)': 1.05,
  '荃湾西站·柏傲湾II': 1.06,
  '全·城汇 (The Aurora)': 0.98,
  '环宇海湾 (Vision City)': 0.92,
  '荃湾花园': 0.80,
  '海湾花园 (Bayview Park)': 0.85,
  // 大埔墟
  '八号花园 (Eight Peak)': 0.95,
  '岚山 (Tai Po Habitat)': 0.88,
  '绿汇·雅轩 (Parc Verso)': 1.02,
  '天钻 (Savana)': 0.90,
  '比华利山别墅 (Monte Vista)': 0.85,
  '万科·云汇 (Vanke Cloud)': 0.98,
  '大埔中心 (Tai Po Centre)': 0.72,
  // 将军澳
  '日出康城 (LOHAS Park)': 1.05,
  '将军澳中心 (Tseung Kwan O Centre)': 0.82,
  '维景湾畔 (Ocean Shores)': 0.88,
  '都会駅 (Metro Town)': 0.95,
  '将军澳广场 (Tseung Kwan O Plaza)': 0.85,
  '新都城 (Metro City)': 0.80,
  '宝盈花园 (Bauhinia Garden)': 0.78,
  '君傲湾 (Grand Ocean)': 0.90,
  'Capri': 1.08,
  '天晋 (The Wings)': 1.15,
};

// 房型权重分布
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

export function generateTransactions(year: number, month: number, estateList?: Estate[]): RentalTransaction[] {
  const transactions: RentalTransaction[] = [];
  const targetEstates = estateList ?? allEstates;

  for (const estate of targetEstates) {
    const seed = hashSeed(`${estate.name}-${year}-${month}`);
    const rand = seededRandom(seed);
    const premium = estatePremiums[estate.name] ?? 1.0;

    const count = 3 + Math.floor(rand() * 6);
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let i = 0; i < count; i++) {
      const layoutIdx = pickLayout(rand);
      const config = layoutConfigs[layoutIdx];

      const area = Math.round(config.areaMin + rand() * (config.areaMax - config.areaMin));
      const floor = 1 + Math.floor(rand() * (estate.propertyType === '商住' ? 40 : 35));
      const totalFloors = estate.propertyType === '商住' ? 42 : 36;

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

  transactions.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
  return transactions;
}

export function generateSaleTransactions(year: number, month: number, estateList?: Estate[]): SaleTransaction[] {
  const transactions: SaleTransaction[] = [];
  const targetEstates = estateList ?? allEstates;

  for (const estate of targetEstates) {
    // 用不同的种子前缀区分租/售
    const seed = hashSeed(`sale-${estate.name}-${year}-${month}`);
    const rand = seededRandom(seed);
    const premium = estatePremiums[estate.name] ?? 1.0;

    // 购房成交量一般少于租赁
    const count = 2 + Math.floor(rand() * 5);
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let i = 0; i < count; i++) {
      const layoutIdx = pickLayout(rand);
      const areaConfig = layoutConfigs[layoutIdx];
      const priceConfig = salePriceConfigs[layoutIdx];

      const area = Math.round(areaConfig.areaMin + rand() * (areaConfig.areaMax - areaConfig.areaMin));
      const floor = 1 + Math.floor(rand() * (estate.propertyType === '商住' ? 40 : 35));
      const totalFloors = estate.propertyType === '商住' ? 42 : 36;

      const floorPremium = 1 + (floor / totalFloors) * 0.1;
      const basePricePerSqft = priceConfig.priceMin + rand() * (priceConfig.priceMax - priceConfig.priceMin);
      const pricePerSqft = Math.round(basePricePerSqft * premium * floorPremium);
      const totalPrice = Math.round(pricePerSqft * area / 10000) * 10000; // 四舍五入到万

      const day = 1 + Math.floor(rand() * daysInMonth);
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      transactions.push({
        id: `sale-${estate.id}-${year}${month}-${i}`,
        estateName: estate.name,
        address: estate.address,
        layout: areaConfig.layout,
        area,
        floor,
        totalFloors,
        totalPrice,
        pricePerSqft,
        transactionDate: dateStr,
        propertyType: estate.propertyType,
      });
    }
  }

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
    months.push({ year: y, month: m, label: `${y}年${m}月` });
  }
  return months;
}
