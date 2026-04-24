import { useRentalData } from '@/hooks/use-rental-data';
import { Header } from '@/sections/Header';
import { StatsOverview } from '@/sections/StatsOverview';
import { RentChart } from '@/sections/RentChart';
import { RentTrendChart } from '@/sections/RentTrendChart';
import { TransactionTable } from '@/sections/TransactionTable';

function App() {
  const {
    selectedMonth,
    setSelectedMonth,
    selectedEstate,
    setSelectedEstate,
    selectedLayout,
    setSelectedLayout,
    availableMonths,
    filteredTransactions,
    stats,
    estateAvgRents,
    monthLabel,
    trendEstate,
    setTrendEstate,
    rentTrendData,
    dataSource,
    lastUpdated,
  } = useRentalData();

  const sourceText = dataSource === 'server'
    ? `数据来源：中原地产 · 最后更新：${lastUpdated ? new Date(lastUpdated).toLocaleString('zh-CN') : '未知'}`
    : dataSource === 'loading'
      ? '数据加载中...'
      : '数据仅供参考，不构成任何投资或租赁建议 · 数据来源为模拟生成';

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        selectedEstate={selectedEstate}
        setSelectedEstate={setSelectedEstate}
        selectedLayout={selectedLayout}
        setSelectedLayout={setSelectedLayout}
        availableMonths={availableMonths}
        dataSource={dataSource}
        lastUpdated={lastUpdated}
      />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <StatsOverview stats={stats} monthLabel={monthLabel} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <RentChart estateAvgRents={estateAvgRents} monthLabel={monthLabel} />
          <RentTrendChart
            trendEstate={trendEstate}
            setTrendEstate={setTrendEstate}
            rentTrendData={rentTrendData}
          />
        </div>
        <TransactionTable transactions={filteredTransactions} monthLabel={monthLabel} />
      </main>

      <footer className="border-t bg-white/60 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs text-[#94A3B8]">
            {sourceText}
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
