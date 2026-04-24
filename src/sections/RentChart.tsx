import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface RentChartProps {
  estateAvgRents: { name: string; avgRent: number; count: number }[];
  monthLabel: string;
}

const chartConfig: ChartConfig = {
  avgRent: {
    label: '平均月租',
    color: '#3B82F6',
  },
};

export function RentChart({ estateAvgRents, monthLabel }: RentChartProps) {
  const data = estateAvgRents.map((item) => ({
    name: item.name,
    avgRent: item.avgRent,
    count: item.count,
  }));

  return (
    <Card className="transition-shadow duration-200 hover:shadow-md">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-[#0F172A]">
          各小区平均月租对比
        </CardTitle>
        <CardDescription className="text-xs text-[#94A3B8]">
          {monthLabel} · 单位：港币(HK$)
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
              tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
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
                  formatter={(value) => `HK$${Number(value).toLocaleString()}`}
                />
              }
            />
            <Bar
              dataKey="avgRent"
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
