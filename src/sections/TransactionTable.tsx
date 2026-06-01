import type { RentalTransaction, SaleTransaction, TxType } from '@/types/rental';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface TransactionTableProps {
  txType: TxType;
  transactions: (RentalTransaction | SaleTransaction)[];
  monthLabel: string;
}

const layoutColors: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  '开放式': 'outline', '1房': 'secondary', '2房': 'default', '3房': 'destructive', '4房': 'destructive',
};

function formatPrice(val: number, isSale: boolean): string {
  if (isSale) {
    if (val >= 10000000) return `${(val / 10000000).toFixed(2)}千万`;
    if (val >= 10000) return `${(val / 10000).toFixed(0)}万`;
  }
  return val.toLocaleString();
}

function MobileCard({ tx, isSale }: { tx: RentalTransaction | SaleTransaction; isSale: boolean }) {
  const price = isSale ? (tx as SaleTransaction).totalPrice : (tx as RentalTransaction).monthlyRent;
  const perSqft = isSale ? (tx as SaleTransaction).pricePerSqft : (tx as RentalTransaction).rentPerSqft;

  return (
    <div className="rounded-lg border bg-white p-3 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[#0F172A]">{tx.estateName}</span>
        <Badge variant={layoutColors[tx.layout] ?? 'secondary'} className="text-[10px]">{tx.layout}</Badge>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-[#94A3B8]">{isSale ? '成交价' : '月租'}</span>
          <span className="font-semibold tabular-nums text-[#0F172A]">
            HK${formatPrice(price, isSale)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#94A3B8]">尺价</span>
          <span className="tabular-nums text-[#475569]">${perSqft.toLocaleString()}/sqft</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#94A3B8]">面积</span>
          <span className="tabular-nums text-[#475569]">{tx.area} sqft</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#94A3B8]">楼层</span>
          <span className="tabular-nums text-[#475569]">{tx.floor}F/{tx.totalFloors}F</span>
        </div>
      </div>
      <div className="mt-1.5 text-right text-[10px] text-[#94A3B8]">{tx.transactionDate}</div>
    </div>
  );
}

export function TransactionTable({ txType, transactions, monthLabel }: TransactionTableProps) {
  const isSale = txType === 'sale';

  return (
    <Card className="transition-shadow duration-200 hover:shadow-md">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-[#0F172A]">
          {isSale ? '买卖' : '租赁'}交易明细
        </CardTitle>
        <CardDescription className="text-xs text-[#94A3B8]">
          {monthLabel} · 共 {transactions.length} 宗成交
        </CardDescription>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <div className="flex flex-col gap-2 sm:hidden">
          {transactions.map((tx) => (
            <MobileCard key={tx.id} tx={tx} isSale={isSale} />
          ))}
        </div>

        <div className="hidden overflow-x-auto sm:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F8FAFC] hover:bg-[#F8FAFC]">
                <TableHead className="text-[#475569]">小区</TableHead>
                <TableHead className="text-[#475569]">房型</TableHead>
                <TableHead className="text-right text-[#475569]">面积(sqft)</TableHead>
                <TableHead className="text-right text-[#475569]">楼层</TableHead>
                <TableHead className="text-right text-[#475569]">
                  {isSale ? '成交价(HK$)' : '月租(HK$)'}
                </TableHead>
                <TableHead className="text-right text-[#475569]">尺价(HK$/sqft)</TableHead>
                <TableHead className="text-[#475569]">成交日期</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => {
                const price = isSale ? (tx as SaleTransaction).totalPrice : (tx as RentalTransaction).monthlyRent;
                const perSqft = isSale ? (tx as SaleTransaction).pricePerSqft : (tx as RentalTransaction).rentPerSqft;

                return (
                  <TableRow key={tx.id} className="transition-colors">
                    <TableCell className="font-medium text-[#0F172A]">{tx.estateName}</TableCell>
                    <TableCell>
                      <Badge variant={layoutColors[tx.layout] ?? 'secondary'}>{tx.layout}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-[#475569]">{tx.area.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums text-[#475569]">{tx.floor}F/{tx.totalFloors}F</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-[#0F172A]">
                      {formatPrice(price, isSale)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-[#475569]">{perSqft.toLocaleString()}</TableCell>
                    <TableCell className="text-[#475569]">{tx.transactionDate}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
