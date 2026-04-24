import { Line, LineChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { estateNames } from '@/data/estates';

interface RentTrendChartProps {
  trendEstate: string;
  setTrendEstate: (e: string) => void;
  rentTrendData: { month: string; avgRentPerSqft: number; count: number }[];
}

const chartConfig: ChartConfig = {
  avgRentPerSqft: {
    label: '平均尺价',
    color: '#8B5CF6',
  },
};

// 小区中英文映射
const estateNamesCN: Record<string, string> = {
  'Oasis Kai Tak': 'Oasis Kai Tak',
  'K.CITY': '嘉汇',
  'K.Summit': '嘉峯汇',
  'Monaco One': 'Monaco One',
  'Monaco Marine': 'Monaco Marine',
  'VIBE': '啟岸',
  'One Kai Tak': '启德1号',
  'AIRSIDE': 'AIRSIDE',
  'The Henley': 'The Henley',
  'Upper RiverBank': '尚·珒溋',
};

export function RentTrendChart({
  trendEstate,
  setTrendEstate,
  rentTrendData,
}: RentTrendChartProps) {
  const cnName = estateNamesCN[trendEstate] || trendEstate;

  return (
    <Card className="transition-shadow duration-200 hover:shadow-md">
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-[#0F172A]">
              平均每尺租金变化趋势
            </CardTitle>
            <CardDescription className="text-xs text-[#94A3B8]">
              {cnName}（{trendEstate}）· 过去12个月 · 单位：HK$/sqft
            </CardDescription>
          </div>
          <Select value={trendEstate} onValueChange={setTrendEstate}>
            <SelectTrigger className="w-full text-xs sm:w-[160px] sm:text-sm">
              <SelectValue placeholder="选择小区" />
            </SelectTrigger>
            <SelectContent>
              {estateNames.map((name) => (
                <SelectItem key={name} value={name}>
                  {estateNamesCN[name] ? `${estateNamesCN[name]}（${name}）` : name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[240px] w-full sm:h-[300px]">
          <LineChart
            data={rentTrendData}
            margin={{ top: 8, right: 20, bottom: 0, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis
              dataKey="month"
              tick={{ fill: '#94A3B8', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: string) => {
                // "2025年5月" -> "5月"
                const match = v.match(/(\d+)月/);
                return match ? `${match[1]}月` : v;
              }}
            />
            <YAxis
              tick={{ fill: '#94A3B8', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              domain={['auto', 'auto']}
              tickFormatter={(v: number) => `${v}`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => `HK$${Number(value).toFixed(1)}/sqft`}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="avgRentPerSqft"
              stroke="#8B5CF6"
              strokeWidth={2.5}
              dot={{ fill: '#8B5CF6', r: 4, strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
