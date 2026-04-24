import { useState, useMemo, useEffect } from 'react';
import { generateTransactions, getAvailableMonths } from '@/data/mock-transactions';
import type { RentalTransaction } from '@/types/rental';

// 所有可选房型
export const allLayouts = ['开放式', '1房', '2房', '3房', '4房'] as const;

/** 服务器返回的 JSON 结构 */
interface ServerData {
  lastUpdated: string;
  totalCount: number;
  transactions: RentalTransaction[];
}

/** 尝试从服务器加载真实数据 */
async function fetchServerData(): Promise<ServerData | null> {
  try {
    const resp = await fetch('./data/transactions.json', { cache: 'no-cache' });
    if (!resp.ok) return null;
    const data: ServerData = await resp.json();
    if (data.transactions && data.transactions.length > 0) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

export function useRentalData() {
  const availableMonths = useMemo(() => getAvailableMonths(), []);

  // 默认上一个月
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    let y = now.getFullYear();
    let m = now.getMonth(); // 0-based, so getMonth() gives previous month
    if (m === 0) {
      m = 12;
      y -= 1;
    }
    return { year: y, month: m };
  });

  const [selectedEstate, setSelectedEstate] = useState<string>('all');
  const [selectedLayout, setSelectedLayout] = useState<string>('all');

  // 服务器真实数据
  const [serverData, setServerData] = useState<ServerData | null>(null);
  const [dataSource, setDataSource] = useState<'loading' | 'server' | 'mock'>('loading');

  useEffect(() => {
    fetchServerData().then((data) => {
      if (data) {
        setServerData(data);
        setDataSource('server');
      } else {
        setDataSource('mock');
      }
    });
  }, []);

  // 获取当前月份的交易数据
  const allTransactions = useMemo(() => {
    if (dataSource === 'server' && serverData) {
      // 从服务器数据中按月份筛选
      const monthStr = `${selectedMonth.year}-${String(selectedMonth.month).padStart(2, '0')}`;
      const filtered = serverData.transactions.filter((t) =>
        t.transactionDate.startsWith(monthStr)
      );
      // 如果该月有数据用真实数据，否则 fallback
      if (filtered.length > 0) return filtered;
    }
    // fallback 到模拟数据
    return generateTransactions(selectedMonth.year, selectedMonth.month);
  }, [selectedMonth.year, selectedMonth.month, serverData, dataSource]);

  const filteredTransactions = useMemo(() => {
    let txns = allTransactions;
    if (selectedEstate !== 'all') {
      txns = txns.filter((t) => t.estateName === selectedEstate);
    }
    if (selectedLayout !== 'all') {
      txns = txns.filter((t) => t.layout === selectedLayout);
    }
    return txns;
  }, [allTransactions, selectedEstate, selectedLayout]);

  const stats = useMemo(() => {
    const txns = filteredTransactions;
    if (txns.length === 0) {
      return {
        totalCount: 0,
        avgRent: 0,
        avgRentPerSqft: 0,
        maxRent: 0,
        minRent: 0,
      };
    }
    const rents = txns.map((t) => t.monthlyRent);
    const sqfts = txns.map((t) => t.rentPerSqft);
    return {
      totalCount: txns.length,
      avgRent: Math.round(rents.reduce((a, b) => a + b, 0) / rents.length),
      avgRentPerSqft: Math.round((sqfts.reduce((a, b) => a + b, 0) / sqfts.length) * 10) / 10,
      maxRent: Math.max(...rents),
      minRent: Math.min(...rents),
    };
  }, [filteredTransactions]);

  // 各小区平均租金（用于图表）
  const estateAvgRents = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const t of allTransactions) {
      if (!map.has(t.estateName)) map.set(t.estateName, []);
      map.get(t.estateName)!.push(t.monthlyRent);
    }
    return Array.from(map.entries())
      .map(([name, rents]) => ({
        name,
        avgRent: Math.round(rents.reduce((a, b) => a + b, 0) / rents.length),
        count: rents.length,
      }))
      .sort((a, b) => b.avgRent - a.avgRent);
  }, [allTransactions]);

  const monthLabel = `${selectedMonth.year}年${selectedMonth.month}月`;

  // --- 过去12个月某小区平均尺价趋势 ---
  const [trendEstate, setTrendEstate] = useState<string>('K.CITY');

  const rentTrendData = useMemo(() => {
    return availableMonths
      .map((m) => {
        let txns: RentalTransaction[];

        // 优先从服务器数据获取
        if (dataSource === 'server' && serverData) {
          const monthStr = `${m.year}-${String(m.month).padStart(2, '0')}`;
          const serverTxns = serverData.transactions.filter(
            (t) => t.transactionDate.startsWith(monthStr) && t.estateName === trendEstate
          );
          if (serverTxns.length > 0) {
            txns = serverTxns;
          } else {
            txns = generateTransactions(m.year, m.month).filter(
              (t) => t.estateName === trendEstate
            );
          }
        } else {
          txns = generateTransactions(m.year, m.month).filter(
            (t) => t.estateName === trendEstate
          );
        }

        if (txns.length === 0) return { month: m.label, avgRentPerSqft: 0, count: 0 };
        const sqfts = txns.map((t) => t.rentPerSqft);
        return {
          month: m.label,
          avgRentPerSqft:
            Math.round((sqfts.reduce((a, b) => a + b, 0) / sqfts.length) * 10) / 10,
          count: txns.length,
        };
      })
      .reverse();
  }, [availableMonths, trendEstate, serverData, dataSource]);

  return {
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
    estateAvgRents,
    monthLabel,
    trendEstate,
    setTrendEstate,
    rentTrendData,
    dataSource,
    lastUpdated: serverData?.lastUpdated,
  };
}
