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
import type { TxType } from '@/types/rental';

interface RentTrendChartProps {
  txType: TxType;
  trendEstate: string;
  setTrendEstate: (e: string) => void;
  priceTrendData: { month: string; avgPricePerSqft: number; count: number }[];
  districtEstateNames: string[];
}

const estateNamesCN: Record<string, string> = {
  // 启德
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
  // 荃湾西
  '城·点 (Citypoint)': '城·点',
  '柏傲湾 (Pavilia Bay)': '柏傲湾',
  '海之恋 (Ocean Pride)': '海之恋',
  '荃湾西站·柏傲湾II': '柏傲湾II',
  '全·城汇 (The Aurora)': '全·城汇',
  '环宇海湾 (Vision City)': '环宇海湾',
  '荃湾花园': '荃湾花园',
  '海湾花园 (Bayview Park)': '海湾花园',
  // 大埔墟
  '八号花园 (Eight Peak)': '八号花园',
  '岚山 (Tai Po Habitat)': '岚山',
  '绿汇·雅轩 (Parc Verso)': '绿汇·雅轩',
  '天钻 (Savana)': '天钻',
  '比华利山别墅 (Monte Vista)': '比华利山别墅',
  '万科·云汇 (Vanke Cloud)': '万科·云汇',
  '大埔中心 (Tai Po Centre)': '大埔中心',
};

export function RentTrendChart({
  txType,
  trendEstate,
  setTrendEstate,
  priceTrendData,
  districtEstateNames,
}: RentTrendChartProps) {
  const isRental = txType === 'rental';
  const cnName = estateNamesCN[trendEstate] || trendEstate;

  const chartConfig: ChartConfig = {
    avgPricePerSqft: {
      label: isRental ? '平均尺租' : '平均尺价',
      color: '#8B5CF6',
    },
  };

  return (
    <Card className="transition-shadow duration-200 hover:shadow-md">
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-[#0F172A]">
              平均每尺{isRental ? '租金' : '售价'}变化趋势
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
              {districtEstateNames.map((name) => (
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
            data={priceTrendData}
            margin={{ top: 8, right: 20, bottom: 0, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis
              dataKey="month"
              tick={{ fill: '#94A3B8', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: string) => {
                const match = v.match(/(\d+)月/);
                return match ? `${match[1]}月` : v;
              }}
            />
            <YAxis
              tick={{ fill: '#94A3B8', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              domain={['auto', 'auto']}
              tickFormatter={(v: number) => isRental ? `${v}` : `${(v / 1000).toFixed(0)}k`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => `HK$${Number(value).toLocaleString()}/sqft`}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="avgPricePerSqft"
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
