import { useState, useMemo, useEffect } from 'react';
import { generateTransactions, generateSaleTransactions, getAvailableMonths } from '@/data/mock-transactions';
import { estates, getEstateNamesByDistrict, districts } from '@/data/estates';
import type { RentalTransaction, SaleTransaction, TxType, District } from '@/types/rental';

export const allLayouts = ['开放式', '1房', '2房', '3房', '4房'] as const;

interface ServerData {
  lastUpdated: string;
  totalCount: number;
  transactions: RentalTransaction[];
}

async function fetchServerData(): Promise<ServerData | null> {
  try {
    const resp = await fetch('./data/transactions.json', { cache: 'no-cache' });
    if (!resp.ok) return null;
    const data: ServerData = await resp.json();
    if (data.transactions && data.transactions.length > 0) return data;
    return null;
  } catch {
    return null;
  }
}

/** 统一的价格字段提取 */
function getPrice(tx: RentalTransaction | SaleTransaction): number {
  return 'monthlyRent' in tx ? tx.monthlyRent : tx.totalPrice;
}

function getPricePerSqft(tx: RentalTransaction | SaleTransaction): number {
  return 'rentPerSqft' in tx ? tx.rentPerSqft : tx.pricePerSqft;
}

export function useRentalData() {
  const availableMonths = useMemo(() => getAvailableMonths(), []);

  const [txType, setTxType] = useState<TxType>('rental');
  const [selectedDistrict, setSelectedDistrict] = useState<District>('启德');

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    let y = now.getFullYear();
    let m = now.getMonth();
    if (m === 0) { m = 12; y -= 1; }
    return { year: y, month: m };
  });

  const [selectedEstate, setSelectedEstate] = useState<string>('all');
  const [selectedLayout, setSelectedLayout] = useState<string>('all');

  // 切换区域时重置小区选择
  const handleDistrictChange = (district: District) => {
    setSelectedDistrict(district);
    setSelectedEstate('all');
  };

  // 当前区域的楼盘名称列表
  const districtEstateNames = useMemo(() => getEstateNamesByDistrict(selectedDistrict), [selectedDistrict]);

  // 当前区域的楼盘列表
  const districtEstates = useMemo(() => estates.filter((e) => e.district === selectedDistrict), [selectedDistrict]);

  const [serverData, setServerData] = useState<ServerData | null>(null);
  const [dataSource, setDataSource] = useState<'loading' | 'server' | 'mock'>('loading');

  useEffect(() => {
    fetchServerData().then((data) => {
      if (data) { setServerData(data); setDataSource('server'); }
      else { setDataSource('mock'); }
    });
  }, []);

  // 获取当月交易数据
  const allTransactions = useMemo<(RentalTransaction | SaleTransaction)[]>(() => {
    const { year, month } = selectedMonth;

    if (txType === 'sale') {
      return generateSaleTransactions(year, month, districtEstates);
    }

    // 租房：优先服务器数据
    if (dataSource === 'server' && serverData) {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      const filtered = serverData.transactions.filter(
        (t) => t.transactionDate.startsWith(monthStr) && districtEstateNames.includes(t.estateName)
      );
      if (filtered.length > 0) return filtered;
    }
    return generateTransactions(year, month, districtEstates);
  }, [selectedMonth.year, selectedMonth.month, serverData, dataSource, txType, districtEstates]);

  // 筛选
  const filteredTransactions = useMemo(() => {
    let txns = allTransactions;
    if (selectedEstate !== 'all') txns = txns.filter((t) => t.estateName === selectedEstate);
    if (selectedLayout !== 'all') txns = txns.filter((t) => t.layout === selectedLayout);
    return txns;
  }, [allTransactions, selectedEstate, selectedLayout]);

  // 统计
  const stats = useMemo(() => {
    const txns = filteredTransactions;
    if (txns.length === 0) {
      return { totalCount: 0, avgPrice: 0, avgPricePerSqft: 0, maxPrice: 0, minPrice: 0 };
    }
    const prices = txns.map(getPrice);
    const sqfts = txns.map(getPricePerSqft);
    return {
      totalCount: txns.length,
      avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
      avgPricePerSqft: Math.round((sqfts.reduce((a, b) => a + b, 0) / sqfts.length) * 10) / 10,
      maxPrice: Math.max(...prices),
      minPrice: Math.min(...prices),
    };
  }, [filteredTransactions]);

  // 各小区平均尺价（图表）
  const estateAvgPrices = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const t of allTransactions) {
      if (!map.has(t.estateName)) map.set(t.estateName, []);
      map.get(t.estateName)!.push(getPricePerSqft(t));
    }
    return Array.from(map.entries())
      .map(([name, sqfts]) => ({
        name,
        avgPricePerSqft: Math.round((sqfts.reduce((a, b) => a + b, 0) / sqfts.length) * 10) / 10,
        count: sqfts.length,
      }))
      .sort((a, b) => b.avgPricePerSqft - a.avgPricePerSqft);
  }, [allTransactions]);

  const monthLabel = `${selectedMonth.year}年${selectedMonth.month}月`;

  // 尺价趋势
  const [trendEstate, setTrendEstate] = useState<string>('K.CITY');

  // 切换区域时更新默认趋势楼盘
  useEffect(() => {
    setTrendEstate(districtEstateNames[0] ?? 'K.CITY');
  }, [selectedDistrict]);

  const priceTrendData = useMemo(() => {
    return availableMonths
      .map((m) => {
        let txns: (RentalTransaction | SaleTransaction)[];

        if (txType === 'sale') {
          txns = generateSaleTransactions(m.year, m.month, districtEstates).filter((t) => t.estateName === trendEstate);
        } else if (dataSource === 'server' && serverData) {
          const monthStr = `${m.year}-${String(m.month).padStart(2, '0')}`;
          const serverTxns = serverData.transactions.filter(
            (t) => t.transactionDate.startsWith(monthStr) && t.estateName === trendEstate && districtEstateNames.includes(t.estateName)
          );
          txns = serverTxns.length > 0
            ? serverTxns
            : generateTransactions(m.year, m.month, districtEstates).filter((t) => t.estateName === trendEstate);
        } else {
          txns = generateTransactions(m.year, m.month, districtEstates).filter((t) => t.estateName === trendEstate);
        }

        if (txns.length === 0) return { month: m.label, avgPricePerSqft: 0, count: 0 };
        const sqfts = txns.map(getPricePerSqft);
        return {
          month: m.label,
          avgPricePerSqft: Math.round((sqfts.reduce((a, b) => a + b, 0) / sqfts.length) * 10) / 10,
          count: txns.length,
        };
      })
      .reverse();
  }, [availableMonths, trendEstate, serverData, dataSource, txType, districtEstates]);

  return {
    txType,
    setTxType,
    selectedDistrict,
    setSelectedDistrict: handleDistrictChange,
    districts,
    districtEstateNames,
    selectedMonth,
    setSelectedMonth,
    selectedEstate,
    setSelectedEstate,
    selectedLayout,
    setSelectedLayout,
    availableMonths,
    allTransactions,
    filteredTransactions,
    stats,
    estateAvgPrices,
    monthLabel,
    trendEstate,
    setTrendEstate,
    priceTrendData,
    dataSource,
    lastUpdated: serverData?.lastUpdated,
  };
}
