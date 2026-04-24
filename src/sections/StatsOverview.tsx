import { BarChart3, TrendingUp, DollarSign, ArrowUpDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface StatsOverviewProps {
  stats: {
    totalCount: number;
    avgRent: number;
    avgRentPerSqft: number;
    maxRent: number;
    minRent: number;
  };
  monthLabel: string;
}

function formatHKD(val: number): string {
  return `HK$${val.toLocaleString()}`;
}

const statCards = [
  {
    key: 'totalCount',
    label: '成交宗数',
    icon: BarChart3,
    format: (v: number) => `${v} 宗`,
    accent: true,
  },
  {
    key: 'avgRent',
    label: '平均月租',
    icon: DollarSign,
    format: formatHKD,
    accent: false,
  },
  {
    key: 'avgRentPerSqft',
    label: '平均尺价',
    icon: TrendingUp,
    format: (v: number) => `HK$${v}/sqft`,
    accent: false,
  },
  {
    key: 'range',
    label: '租金区间',
    icon: ArrowUpDown,
    format: (_: number, stats: StatsOverviewProps['stats']) =>
      `${formatHKD(stats.minRent)} - ${formatHKD(stats.maxRent)}`,
    accent: false,
  },
] as const;

export function StatsOverview({ stats, monthLabel }: StatsOverviewProps) {
  return (
    <section>
      <h2 className="mb-4 text-sm font-semibold text-[#475569]">
        {monthLabel} 数据概览
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          const value =
            card.key === 'range'
              ? card.format(0, stats)
              : card.format(stats[card.key as keyof typeof stats] as number, stats);

          return (
            <Card
              key={card.key}
              className={`relative overflow-hidden transition-shadow duration-200 hover:shadow-md ${
                card.accent
                  ? 'border-[#3B82F6]/30 bg-gradient-to-br from-[#1E40AF]/5 to-[#3B82F6]/10'
                  : ''
              }`}
            >
              <CardContent className="flex items-start justify-between p-3 sm:p-4 sm:pt-0">
                <div className="min-w-0 space-y-0.5 sm:space-y-1">
                  <p className="text-[10px] font-medium text-[#94A3B8] sm:text-xs">{card.label}</p>
                  <p
                    className={`truncate text-sm font-bold tabular-nums sm:text-xl ${
                      card.accent ? 'text-[#1E40AF]' : 'text-[#0F172A]'
                    }`}
                  >
                    {value}
                  </p>
                </div>
                <div
                  className={`ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9 ${
                    card.accent
                      ? 'bg-[#1E40AF]/10 text-[#1E40AF]'
                      : 'bg-[#F1F5F9] text-[#475569]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
