import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { TxType } from '@/types/rental';

interface RentChartProps {
  txType: TxType;
  estateAvgPrices: { name: string; avgPricePerSqft: number; count: number }[];
  monthLabel: string;
}

export function RentChart({ txType, estateAvgPrices, monthLabel }: RentChartProps) {
  const isRental = txType === 'rental';

  const chartConfig: ChartConfig = {
    avgPricePerSqft: {
      label: isRental ? '平均尺租' : '平均尺价',
      color: '#3B82F6',
    },
  };

  const data = estateAvgPrices.map((item) => ({
    name: item.name,
    avgPricePerSqft: item.avgPricePerSqft,
    count: item.count,
  }));

  return (
    <Card className="transition-shadow duration-200 hover:shadow-md">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-[#0F172A]">
          各小区平均每尺{isRental ? '租金' : '售价'}对比
        </CardTitle>
        <CardDescription className="text-xs text-[#94A3B8]">
          {monthLabel} · 单位：HK$/sqft
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full sm:h-[380px]">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis
              type="number"
              tickFormatter={(v: number) => isRental ? `${v}` : `${(v / 1000).toFixed(0)}k`}
              tick={{ fill: '#94A3B8', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={90}
              tick={{ fill: '#475569', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => `HK$${Number(value).toLocaleString()}/sqft`}
                />
              }
            />
            <Bar
              dataKey="avgPricePerSqft"
              fill="#3B82F6"
              radius={[0, 6, 6, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
