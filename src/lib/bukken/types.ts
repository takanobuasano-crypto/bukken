export interface StationAccess {
  line: string;
  station: string;
  walkMinutes: number;
  lat?: number;
  lng?: number;
  elevation?: number;
}

export interface PropertyData {
  name: string;
  rent: number; // 月額家賃（円）
  managementFee: number; // 管理費・共益費（円）
  deposit: number; // 敷金（円）
  keyMoney: number; // 礼金（円）
  layout: string; // 間取り（例: "1LDK"）
  area: number; // 専有面積（m²）
  floor: string; // 階数（例: "3階/5階建"）
  buildingType: string; // 建物種別（例: "マンション"）
  age: string; // 築年数（例: "築5年"）
  address: string; // 住所
  stations: StationAccess[];
  features: string[]; // 設備・特徴
  direction: string; // 向き
  contractType: string; // 契約期間
  images: string[]; // 物件画像URL
  url: string;
}

export interface InitialCostItem {
  label: string;
  amount: number;
  isEstimate: boolean;
  note?: string;
}

export interface InitialCostBreakdown {
  items: InitialCostItem[];
  total: number;
  estimatedTotal: number;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface ElevationData {
  label: string;
  elevation: number;
  lat: number;
  lng: number;
}

export interface ElevationComparison {
  property: ElevationData;
  stations: ElevationData[];
}

export type SlopeCategory = "flat" | "gentle" | "steep";

export interface ParkingLot {
  id: string;
  name: string;
  address: string;
  price: string;
  lat: number;
  lng: number;
  url: string;
  distanceM: number; // 物件からの距離（m）
  is24h: boolean;
  isIndoor: boolean;
  isOutdoor: boolean;
}

export interface ElevationProfilePoint {
  label: string;
  elevation: number;
}

export interface StationElevationProfile {
  stationName: string;
  points: ElevationProfilePoint[];
}

export interface StationElevationInfo extends StationAccess {
  elevation: number;
  propertyElevation: number;
  elevationDiff: number;
  slopeCategory: SlopeCategory;
  slopeGradient: number; // 勾配（%）: 高低差 / 徒歩距離(概算80m/分)
}
