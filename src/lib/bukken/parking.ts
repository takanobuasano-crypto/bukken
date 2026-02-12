import * as cheerio from "cheerio";
import type { ParkingLot } from "./types";
import { haversineDistance } from "./elevation";

const AT_PARKING_BASE = "https://at-parking.jp";

const PREFECTURE_SLUGS: Record<string, string> = {
  北海道: "hokkaido",
  青森県: "aomori", 岩手県: "iwate", 宮城県: "miyagi", 秋田県: "akita",
  山形県: "yamagata", 福島県: "fukushima",
  茨城県: "ibaraki", 栃木県: "tochigi", 群馬県: "gunma", 埼玉県: "saitama",
  千葉県: "chiba", 東京都: "tokyo", 神奈川県: "kanagawa",
  新潟県: "niigata", 富山県: "toyama", 石川県: "ishikawa", 福井県: "fukui",
  山梨県: "yamanashi", 長野県: "nagano",
  岐阜県: "gifu", 静岡県: "shizuoka", 愛知県: "aichi", 三重県: "mie",
  滋賀県: "shiga", 京都府: "kyoto", 大阪府: "osaka", 兵庫県: "hyogo",
  奈良県: "nara", 和歌山県: "wakayama",
  鳥取県: "tottori", 島根県: "shimane", 岡山県: "okayama", 広島県: "hiroshima",
  山口県: "yamaguchi",
  徳島県: "tokushima", 香川県: "kagawa", 愛媛県: "ehime", 高知県: "kochi",
  福岡県: "fukuoka", 佐賀県: "saga", 長崎県: "nagasaki", 熊本県: "kumamoto",
  大分県: "oita", 宮崎県: "miyazaki", 鹿児島県: "kagoshima", 沖縄県: "okinawa",
};

/** 住所から都道府県・市区・町名を分離 */
export function parseAddress(address: string): {
  prefecture: string;
  cityWard: string;
  town: string;
} | null {
  // 例: "神奈川県川崎市宮前区馬絹６丁目" → { prefecture: "神奈川県", cityWard: "川崎市宮前区", town: "馬絹" }
  const match = address.match(
    /^(東京都|北海道|(?:大阪|京都)府|.{2,3}県)((?:.+?市.+?区|.+?[市区町村郡]))([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+)/u
  );
  if (!match) return null;
  return {
    prefecture: match[1],
    cityWard: match[2],
    town: match[3],
  };
}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "BukkenAnalyzer/1.0" },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

/** 都道府県ページから市区のリンクを取得し、住所の市区名でマッチ */
async function findWardUrl(prefSlug: string, cityWard: string): Promise<string | null> {
  const html = await fetchPage(`${AT_PARKING_BASE}/search/${prefSlug}/`);
  const $ = cheerio.load(html);

  let wardUrl: string | null = null;
  $("a").each((_, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().trim();
    // テキストに市区名が含まれるかチェック
    if (href.startsWith(`/search/${prefSlug}/`) && href !== `/search/${prefSlug}/` && text.includes(cityWard)) {
      wardUrl = href;
      return false; // break
    }
  });

  // 部分マッチ: 「宮前区」で「川崎市宮前区」にマッチ
  if (!wardUrl) {
    // 市区名の最後の区/市部分で検索
    const shortName = cityWard.match(/(.+?[区市町村])$/)?.[1] || cityWard;
    $("a").each((_, el) => {
      const href = $(el).attr("href") || "";
      const text = $(el).text().trim();
      if (href.startsWith(`/search/${prefSlug}/`) && href !== `/search/${prefSlug}/` && text.includes(shortName)) {
        wardUrl = href;
        return false;
      }
    });
  }

  return wardUrl;
}

/** 市区ページから町名のリンクを取得し、住所の町名でマッチ */
async function findTownUrl(wardPath: string, town: string): Promise<string | null> {
  const html = await fetchPage(`${AT_PARKING_BASE}${wardPath}`);
  const $ = cheerio.load(html);

  let townUrl: string | null = null;
  $("a").each((_, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().trim();
    if (href.startsWith(wardPath) && href !== wardPath && text.includes(town)) {
      townUrl = href;
      return false;
    }
  });

  return townUrl;
}

/** 町名ページからlatlngList JavaScript配列をパースして駐車場データを取得 */
function parseLatlngList(html: string): Omit<ParkingLot, "distanceM">[] {
  const results: Omit<ParkingLot, "distanceM">[] = [];

  // latlngList[N] = { ... }; パターンをすべて抽出
  const regex = /latlngList\[\d+\]\s*=\s*\{([^}]+)\}/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const block = match[1];
    const get = (key: string): string => {
      const m = block.match(new RegExp(`${key}\\s*:\\s*'([^']*)'`));
      return m ? m[1] : "";
    };

    const lat = parseFloat(get("lat"));
    const lng = parseFloat(get("lng"));
    if (!lat || !lng) continue;

    results.push({
      id: get("no"),
      name: get("name"),
      address: get("address"),
      price: get("list_price_display"),
      lat,
      lng,
      url: `${AT_PARKING_BASE}${get("url")}`,
      is24h: get("icon_24h_display") === "1",
      isIndoor: get("icon_indoor_display") === "1",
      isOutdoor: get("icon_outdoor_display") === "1",
    });
  }

  return results;
}

/** 物件住所と座標から周辺の月極駐車場を検索 */
export async function searchParking(
  address: string,
  propertyLat: number,
  propertyLng: number,
  radiusKm: number = 1,
): Promise<ParkingLot[]> {
  const parsed = parseAddress(address);
  if (!parsed) {
    console.warn("[parking] Failed to parse address:", address);
    return [];
  }

  const prefSlug = PREFECTURE_SLUGS[parsed.prefecture];
  if (!prefSlug) {
    console.warn("[parking] Unknown prefecture:", parsed.prefecture);
    return [];
  }

  console.log(`[parking] Searching: ${parsed.prefecture} / ${parsed.cityWard} / ${parsed.town}`);

  // Step 1: 市区ページのURLを取得
  const wardUrl = await findWardUrl(prefSlug, parsed.cityWard);
  if (!wardUrl) {
    console.warn("[parking] Ward not found for:", parsed.cityWard);
    return [];
  }
  console.log(`[parking] Ward URL: ${wardUrl}`);

  // Step 2: 町名ページのURLを取得
  const townUrl = await findTownUrl(wardUrl, parsed.town);
  if (!townUrl) {
    console.warn("[parking] Town not found for:", parsed.town);
    return [];
  }
  console.log(`[parking] Town URL: ${townUrl}`);

  // Step 3: 町名ページから駐車場データを取得
  const townHtml = await fetchPage(`${AT_PARKING_BASE}${townUrl}`);
  const allParking = parseLatlngList(townHtml);
  console.log(`[parking] Found ${allParking.length} parking lots in ${parsed.town}`);

  // 距離フィルタ & ソート
  const withDistance = allParking.map((p) => ({
    ...p,
    distanceM: Math.round(haversineDistance(propertyLat, propertyLng, p.lat, p.lng) * 1000),
  }));

  return withDistance
    .filter((p) => p.distanceM <= radiusKm * 1000)
    .sort((a, b) => a.distanceM - b.distanceM);
}
