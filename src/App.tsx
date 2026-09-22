import { useRentalData } from '@/hooks/use-rental-data';
import { useRoute } from '@/hooks/use-route';
import { ROUTES } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { Header } from '@/sections/Header';
import { HomePage } from '@/sections/HomePage';
import { FamilySchedule } from '@/sections/FamilySchedule';
import { SiteNav } from '@/sections/SiteNav';
import { StatsOverview } from '@/sections/StatsOverview';
import { RentChart } from '@/sections/RentChart';
import { RentTrendChart } from '@/sections/RentTrendChart';
import { TransactionTable } from '@/sections/TransactionTable';
import { StudyResources } from '@/sections/StudyResources';
import { TripSchedule } from '@/sections/TripSchedule';

function App() {
  const { path, exam, navigate } = useRoute();

  const {
    txType,
    setTxType,
    selectedDistrict,
    setSelectedDistrict,
    districtEstateNames,
    selectedMonth,
    setSelectedMonth,
    selectedEstate,
    setSelectedEstate,
    selectedLayout,
    setSelectedLayout,
    availableMonths,
    filteredTransactions,
    stats,
    estateAvgPrices,
    monthLabel,
    trendEstate,
    setTrendEstate,
    priceTrendData,
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
      <SiteNav path={path} navigate={navigate} />

      {path === ROUTES.home && <HomePage navigate={navigate} />}

      {/* 三个子页面保持挂载，来回切换不重置筛选 */}
      <div className={cn(path === ROUTES.property ? 'block' : 'hidden')}>
        <Header
          txType={txType}
          setTxType={setTxType}
          selectedDistrict={selectedDistrict}
          setSelectedDistrict={setSelectedDistrict}
          districtEstateNames={districtEstateNames}
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
          <StatsOverview txType={txType} stats={stats} monthLabel={monthLabel} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <RentChart txType={txType} estateAvgPrices={estateAvgPrices} monthLabel={monthLabel} />
            <RentTrendChart
              txType={txType}
              trendEstate={trendEstate}
              setTrendEstate={setTrendEstate}
              priceTrendData={priceTrendData}
              districtEstateNames={districtEstateNames}
            />
          </div>
          <TransactionTable txType={txType} transactions={filteredTransactions} monthLabel={monthLabel} />
        </main>

        <footer className="border-t bg-white/60 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <p className="text-center text-xs text-[#94A3B8]">
              {sourceText}
            </p>
          </div>
        </footer>
      </div>

      <div className={cn(path === ROUTES.trip ? 'block' : 'hidden')}>
        <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <TripSchedule />
        </main>
      </div>

      <div className={cn(path === ROUTES.family ? 'block' : 'hidden')}>
        <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <FamilySchedule />
        </main>
      </div>

      {path === ROUTES.learn && <StudyResources exam={exam} navigate={navigate} />}
    </div>
  );
}

export default App;
