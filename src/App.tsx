import { useState } from 'react';
import { Building2, CalendarHeart, Plane } from 'lucide-react';
import { useRentalData } from '@/hooks/use-rental-data';
import { Header } from '@/sections/Header';
import { StatsOverview } from '@/sections/StatsOverview';
import { RentChart } from '@/sections/RentChart';
import { RentTrendChart } from '@/sections/RentTrendChart';
import { TransactionTable } from '@/sections/TransactionTable';
import { FamilySchedule } from '@/sections/FamilySchedule';
import { TripSchedule } from '@/sections/TripSchedule';
import { cn } from '@/lib/utils';

type View = 'property' | 'family' | 'trip';

function App() {
  // 默认视图按 openspec/specs/family-schedule 的「默认首页」需求固定为家庭日程，
  // 「近期行程」仅在导航中居首，不作为默认落点
  const [view, setView] = useState<View>('family');

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

  const navItems: { value: View; label: string; icon: typeof Building2 }[] = [
    { value: 'trip', label: '近期行程', icon: Plane },
    { value: 'family', label: '家庭日程', icon: CalendarHeart },
    { value: 'property', label: '房产看板', icon: Building2 },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* 顶层视图切换导航 */}
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2 sm:px-6 lg:px-8">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = view === item.value;
            return (
              <button
                key={item.value}
                onClick={() => setView(item.value)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all sm:text-sm',
                  active
                    ? 'bg-gradient-to-br from-[#1E40AF] to-[#3B82F6] text-white shadow-sm'
                    : 'text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* 房产看板视图 */}
      <div className={cn(view === 'property' ? 'block' : 'hidden')}>
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

      {/* 近期行程视图（保持挂载，切换不重置筛选状态） */}
      <div className={cn(view === 'trip' ? 'block' : 'hidden')}>
        <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <TripSchedule />
        </main>
      </div>

      {/* 家庭日程视图（保持挂载，切换不重置筛选状态） */}
      <div className={cn(view === 'family' ? 'block' : 'hidden')}>
        <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <FamilySchedule />
        </main>
      </div>
    </div>
  );
}

export default App;
