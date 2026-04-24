import type { RentalTransaction } from '@/types/rental';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface TransactionTableProps {
  transactions: RentalTransaction[];
  monthLabel: string;
}

const layoutColors: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  '开放式': 'outline',
  '1房': 'secondary',
  '2房': 'default',
  '3房': 'destructive',
  '4房': 'destructive',
};

/** 移动端单笔交易卡片 */
function MobileTransactionCard({ tx }: { tx: RentalTransaction }) {
  return (
    <div className="rounded-lg border bg-white p-3 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[#0F172A]">{tx.estateName}</span>
        <Badge variant={layoutColors[tx.layout] ?? 'secondary'} className="text-[10px]">
          {tx.layout}
        </Badge>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-[#94A3B8]">月租</span>
          <span className="font-semibold tabular-nums text-[#0F172A]">
            HK${tx.monthlyRent.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#94A3B8]">尺价</span>
          <span className="tabular-nums text-[#475569]">
            ${tx.rentPerSqft}/sqft
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#94A3B8]">面积</span>
          <span className="tabular-nums text-[#475569]">{tx.area} sqft</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#94A3B8]">楼层</span>
          <span className="tabular-nums text-[#475569]">
            {tx.floor}F/{tx.totalFloors}F
          </span>
        </div>
      </div>
      <div className="mt-1.5 text-right text-[10px] text-[#94A3B8]">{tx.transactionDate}</div>
    </div>
  );
}

export function TransactionTable({ transactions, monthLabel }: TransactionTableProps) {
  return (
    <Card className="transition-shadow duration-200 hover:shadow-md">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-[#0F172A]">
          交易明细
        </CardTitle>
        <CardDescription className="text-xs text-[#94A3B8]">
          {monthLabel} · 共 {transactions.length} 宗成交
        </CardDescription>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        {/* 移动端：卡片列表 */}
        <div className="flex flex-col gap-2 sm:hidden">
          {transactions.map((tx) => (
            <MobileTransactionCard key={tx.id} tx={tx} />
          ))}
        </div>

        {/* 桌面端：表格 */}
        <div className="hidden overflow-x-auto sm:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F8FAFC] hover:bg-[#F8FAFC]">
                <TableHead className="text-[#475569]">小区</TableHead>
                <TableHead className="text-[#475569]">房型</TableHead>
                <TableHead className="text-right text-[#475569]">面积(sqft)</TableHead>
                <TableHead className="text-right text-[#475569]">楼层</TableHead>
                <TableHead className="text-right text-[#475569]">月租(HK$)</TableHead>
                <TableHead className="text-right text-[#475569]">尺价(HK$/sqft)</TableHead>
                <TableHead className="text-[#475569]">成交日期</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id} className="transition-colors">
                  <TableCell className="font-medium text-[#0F172A]">
                    {tx.estateName}
                  </TableCell>
                  <TableCell>
                    <Badge variant={layoutColors[tx.layout] ?? 'secondary'}>
                      {tx.layout}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-[#475569]">
                    {tx.area.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-[#475569]">
                    {tx.floor}F/{tx.totalFloors}F
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-[#0F172A]">
                    {tx.monthlyRent.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-[#475569]">
                    {tx.rentPerSqft}
                  </TableCell>
                  <TableCell className="text-[#475569]">{tx.transactionDate}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
