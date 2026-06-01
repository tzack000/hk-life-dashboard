import { BarChart3, TrendingUp, DollarSign, ArrowUpDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { TxType } from '@/types/rental';

interface StatsOverviewProps {
  txType: TxType;
  stats: {
    totalCount: number;
    avgPrice: number;
    avgPricePerSqft: number;
    maxPrice: number;
    minPrice: number;
  };
  monthLabel: string;
}

function formatHKD(val: number): string {
  if (val >= 10000000) return `HK$${(val / 10000000).toFixed(1)}千万`;
  if (val >= 10000) return `HK$${(val / 10000).toFixed(0)}万`;
  return `HK$${val.toLocaleString()}`;
}

function formatHKDShort(val: number): string {
  return `HK$${val.toLocaleString()}`;
}

export function StatsOverview({ txType, stats, monthLabel }: StatsOverviewProps) {
  const isRental = txType === 'rental';

  const statCards = [
    {
      key: 'totalCount',
      label: '成交宗数',
      icon: BarChart3,
      value: `${stats.totalCount} 宗`,
      accent: true,
    },
    {
      key: 'avgPrice',
      label: isRental ? '平均月租' : '平均成交价',
      icon: DollarSign,
      value: isRental ? formatHKDShort(stats.avgPrice) : formatHKD(stats.avgPrice),
      accent: false,
    },
    {
      key: 'avgPricePerSqft',
      label: isRental ? '平均尺租' : '平均尺价',
      icon: TrendingUp,
      value: `HK$${stats.avgPricePerSqft.toLocaleString()}/sqft`,
      accent: false,
    },
    {
      key: 'range',
      label: isRental ? '租金区间' : '价格区间',
      icon: ArrowUpDown,
      value: isRental
        ? `${formatHKDShort(stats.minPrice)} - ${formatHKDShort(stats.maxPrice)}`
        : `${formatHKD(stats.minPrice)} - ${formatHKD(stats.maxPrice)}`,
      accent: false,
    },
  ];

  return (
    <section>
      <h2 className="mb-4 text-sm font-semibold text-[#475569]">
        {monthLabel} {isRental ? '租赁' : '买卖'}数据概览
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.key}
              className="relative overflow-hidden transition-shadow duration-200 hover:shadow-md"
            >
              <CardContent className="flex items-start justify-between p-3 sm:p-4 sm:pt-0">
                <div className="min-w-0 space-y-0.5 sm:space-y-1">
                  <p className="text-[10px] font-medium text-[#94A3B8] sm:text-xs">{card.label}</p>
                  <p className="truncate text-sm font-bold tabular-nums text-[#0F172A] sm:text-xl">
                    {card.value}
                  </p>
                </div>
                <div className="ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F1F5F9] text-[#475569] sm:h-9 sm:w-9">
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
