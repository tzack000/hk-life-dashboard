export interface RentalTransaction {
  id: string;
  estateName: string;
  address: string;
  layout: string; // 房型
  area: number; // 面积(平方尺)
  floor: number; // 楼层
  totalFloors: number; // 总楼层
  monthlyRent: number; // 月租(港币)
  rentPerSqft: number; // 尺价(港币/平方尺)
  transactionDate: string; // 成交日期
  propertyType: '住宅' | '商住' | '服务式住宅';
}

export interface Estate {
  id: string;
  name: string;
  address: string;
  district: string;
  propertyType: '住宅' | '商住' | '服务式住宅';
  totalUnits: number;
  completionYear: number;
}
