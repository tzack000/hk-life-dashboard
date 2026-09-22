import { Building2, MapPin } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { districts } from '@/data/estates';
import { allLayouts } from '@/hooks/use-rental-data';
import type { TxType, District } from '@/types/rental';

interface HeaderProps {
  txType: TxType;
  setTxType: (t: TxType) => void;
  selectedDistrict: District;
  setSelectedDistrict: (d: District) => void;
  districtEstateNames: string[];
  selectedMonth: { year: number; month: number };
  setSelectedMonth: (m: { year: number; month: number }) => void;
  selectedEstate: string;
  setSelectedEstate: (e: string) => void;
  selectedLayout: string;
  setSelectedLayout: (l: string) => void;
  availableMonths: { year: number; month: number; label: string }[];
  dataSource: 'loading' | 'server' | 'mock';
  lastUpdated?: string;
}

export function Header({
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
  dataSource,
  lastUpdated,
}: HeaderProps) {
  const monthValue = `${selectedMonth.year}-${selectedMonth.month}`;

  return (
    <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#1E40AF] to-[#3B82F6] text-white shadow-md sm:h-10 sm:w-10">
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-[#0F172A] sm:text-xl">
                房产看板
              </h1>
            </div>
          </div>

          <div className="text-right text-[10px] leading-snug text-[#94A3B8] sm:text-xs">
            {dataSource === 'server' ? (
              <>
                <span>数据来源：中原地产</span>
                {lastUpdated && (
                  <span className="block sm:inline sm:before:content-['_·_']">
                    {new Date(lastUpdated).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}更新
                  </span>
                )}
              </>
            ) : dataSource === 'loading' ? (
              <span>数据加载中...</span>
            ) : (
              <span>数据来源：模拟生成（仅供参考）</span>
            )}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 sm:mt-3 sm:gap-3">
          {/* 租房/购房选项卡 */}
          <div className="inline-flex h-8 items-center rounded-lg bg-[#F1F5F9] p-0.5 sm:h-9">
            <button
              onClick={() => setTxType('rental')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-all sm:px-4 sm:text-sm ${
                txType === 'rental'
                  ? 'bg-white text-[#0F172A] shadow-sm'
                  : 'text-[#94A3B8] hover:text-[#475569]'
              }`}
            >
              租房
            </button>
            <button
              onClick={() => setTxType('sale')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-all sm:px-4 sm:text-sm ${
                txType === 'sale'
                  ? 'bg-white text-[#0F172A] shadow-sm'
                  : 'text-[#94A3B8] hover:text-[#475569]'
              }`}
            >
              购房
            </button>
          </div>

          <div className="hidden h-5 w-px bg-[#E2E8F0] sm:block" />

          {/* 区域选择 */}
          <Select value={selectedDistrict} onValueChange={(v) => setSelectedDistrict(v as District)}>
            <SelectTrigger className="h-8 w-[110px] text-xs sm:h-9 sm:w-[130px] sm:text-sm">
              <MapPin className="mr-1 h-3.5 w-3.5 shrink-0 text-[#64748B]" />
              <SelectValue placeholder="选择区域" />
            </SelectTrigger>
            <SelectContent>
              {districts.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="hidden h-5 w-px bg-[#E2E8F0] sm:block" />

          <Select
            value={monthValue}
            onValueChange={(val) => {
              const [y, m] = val.split('-').map(Number);
              setSelectedMonth({ year: y, month: m });
            }}
          >
            <SelectTrigger className="h-8 w-[110px] text-xs sm:h-9 sm:w-[140px] sm:text-sm">
              <SelectValue placeholder="选择月份" />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map((m) => (
                <SelectItem key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedEstate} onValueChange={setSelectedEstate}>
            <SelectTrigger className="h-8 w-[130px] text-xs sm:h-9 sm:w-[160px] sm:text-sm">
              <SelectValue placeholder="选择小区" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部小区</SelectItem>
              {districtEstateNames.map((name) => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedLayout} onValueChange={setSelectedLayout}>
            <SelectTrigger className="h-8 w-[90px] text-xs sm:h-9 sm:w-[120px] sm:text-sm">
              <SelectValue placeholder="房型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部房型</SelectItem>
              {allLayouts.map((layout) => (
                <SelectItem key={layout} value={layout}>{layout}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </header>
  );
}
