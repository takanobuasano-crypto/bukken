import * as cheerio from "cheerio";
import type { PropertyData, StationAccess } from "./types";

function parseJapaneseNumber(text: string): number {
  if (!text) return 0;
  const cleaned = text.replace(/,/g, "").replace(/円/g, "").trim();

  // 「5.5万円」のようなパターン
  const manMatch = cleaned.match(/([\d.]+)\s*万/);
  if (manMatch) {
    return Math.round(parseFloat(manMatch[1]) * 10000);
  }

  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

function parseMonths(text: string, rent: number): number {
  if (!text) return 0;
  const trimmed = text.trim();
  if (trimmed === "-" || trimmed === "なし" || trimmed === "") return 0;

  const monthMatch = trimmed.match(/([\d.]+)\s*ヶ?月/);
  if (monthMatch) {
    return Math.round(parseFloat(monthMatch[1]) * rent);
  }

  return parseJapaneseNumber(trimmed);
}

function parseArea(text: string): number {
  const match = text.match(/([\d.]+)\s*m/);
  return match ? parseFloat(match[1]) : 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractGapData(html: string): Record<string, any> | null {
  const match = html.match(/gapSuumoPcForFr\s*=\s*(\{[\s\S]*?\});/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debugSuumoHtml(html: string): any {
  const $ = cheerio.load(html);

  const allTableRows: { th: string; td: string }[] = [];
  $("table tr").each((_, row) => {
    const th = $(row).find("th").text().trim().substring(0, 80);
    const td = $(row).find("td").text().trim().substring(0, 120);
    if (th) allTableRows.push({ th, td });
  });

  const allDlItems: { dt: string; dd: string }[] = [];
  $("dl").each((_, dl) => {
    const dt = $(dl).find("dt").text().trim().substring(0, 80);
    const dd = $(dl).find("dd").text().trim().substring(0, 120);
    if (dt) allDlItems.push({ dt, dd });
  });

  const stationTexts: string[] = [];
  $("*").each((_, el) => {
    const text = $(el).clone().children().remove().end().text().trim();
    if (text.includes("駅") && text.length < 200 && text.length > 3) {
      stationTexts.push(text.substring(0, 150));
    }
  });

  const trafficElements: { tag: string; classes: string; text: string }[] = [];
  $("*").each((_, el) => {
    const cls = $(el).attr("class") || "";
    const text = $(el).text().trim();
    if (
      (cls.includes("traffic") || cls.includes("access") || cls.includes("station") || cls.includes("ekiten")) &&
      text.length > 3 &&
      text.length < 300
    ) {
      trafficElements.push({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tag: (el as any).tagName || "",
        classes: cls.substring(0, 100),
        text: text.substring(0, 200),
      });
    }
  });

  return {
    title: $("title").text().trim(),
    h1: $("h1").first().text().trim().substring(0, 100),
    imgCount: $("img").length,
    tableRowCount: allTableRows.length,
    allTableRows: allTableRows.slice(0, 40),
    dlItemCount: allDlItems.length,
    allDlItems: allDlItems.slice(0, 30),
    stationTexts: [...new Set(stationTexts)].slice(0, 20),
    trafficElements: trafficElements.slice(0, 10),
  };
}

/**
 * 駅テキストをパース: "東急田園都市線/宮崎台駅 歩9分" 等
 */
function parseStationText(text: string, stations: StationAccess[]) {
  // バス路線は除外
  if (text.includes("バス")) return;

  const patterns = [
    // 「東急田園都市線/宮崎台駅 歩9分」「ＪＲ南武線/武蔵中原駅 歩2分」
    /(.+?線)\s*[/／]\s*(.+?)駅\s*歩(\d+)分/,
    // 「東急田園都市線/宮崎台駅 徒歩9分」
    /(.+?線)\s*[/／]\s*(.+?)駅\s*徒歩(\d+)分/,
    // 「東急田園都市線 宮崎台駅 歩9分」
    /(.+?線)\s+(.+?)駅\s*歩(\d+)分/,
    // 「東急田園都市線 宮崎台駅 徒歩9分」
    /(.+?線)\s+(.+?)駅\s+徒歩(\d+)分/,
    // 「小田急線/百合ヶ丘駅 歩9分」(線がキーワード末尾)
    /(.+?)\s*[/／]\s*(.+?)駅\s*歩(\d+)分/,
    // フォールバック: 何か/駅名 徒歩N分
    /(.+?)\s*[/／]\s*(.+?)駅\s+徒歩(\d+)分/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      stations.push({
        line: match[1].trim(),
        station: match[2].trim(),
        walkMinutes: parseInt(match[3], 10),
      });
      return;
    }
  }

  // 最終フォールバック: 「〇〇駅」+「N分」
  // 駅名直前の部分のみ取得（、や学区などの無関係な文字を含めない）
  const simpleMatch = text.match(/([^\s、,（）()／/]+?)駅.*?(\d+)分/);
  if (simpleMatch) {
    const stationName = simpleMatch[1].replace(/.*[線]\s*[/／]?\s*/, "").trim();
    // 学区名など駅名でないものを除外
    if (stationName && !stationName.includes("学区") && stationName.length <= 10) {
      stations.push({
        line: "",
        station: stationName,
        walkMinutes: parseInt(simpleMatch[2], 10),
      });
    }
  }
}

export function parseSuumoHtml(html: string, url: string): PropertyData {
  const $ = cheerio.load(html);
  const gapData = extractGapData(html);

  // ── 物件名 ──
  let name = "";
  const titleEl = $(".section_h1-header-title");
  if (titleEl.length) {
    name = titleEl.text().trim();
  }
  if (!name) {
    // h1 から「- 〇〇提供」部分を除去
    const h1Text = $("h1").first().text().trim();
    name = h1Text.replace(/\s*-\s*.+提供.*$/, "").trim();
  }

  // ── テーブルから全データ抽出 ──
  // SUUMO は th に複数項目を結合（例: "間取り詳細構造"）するので、
  // 個別の th を取り出すために th ごとに処理する
  const rawTableData: { th: string; td: string }[] = [];
  $("table tr").each((_, row) => {
    // 1行に複数の th/td ペアがある場合がある
    const ths = $(row).find("th");
    const tds = $(row).find("td");
    ths.each((j, thEl) => {
      const th = $(thEl).text().trim();
      const td = tds.eq(j).text().trim();
      if (th && td) {
        rawTableData.push({ th, td });
      }
    });
    // th/td が1対1でない場合(結合セル)のフォールバック
    if (ths.length === 1 && tds.length === 1) {
      const th = ths.text().trim();
      const td = tds.text().trim();
      if (th && td && !rawTableData.find((r) => r.th === th && r.td === td)) {
        rawTableData.push({ th, td });
      }
    }
  });

  // テーブルデータを検索するヘルパー (部分一致)
  function findTableValue(...keywords: string[]): string {
    for (const kw of keywords) {
      const found = rawTableData.find((r) => r.th.includes(kw));
      if (found) return found.td;
    }
    return "";
  }

  // ── 賃料 ──
  // SUUMOの物件詳細ページでは賃料はページ上部の大きな表示にある
  let rent = 0;
  // HTMLテキスト全体から「N.N万円」パターンを探す（賃料表示部分）
  $("span, div, p").each((_, el) => {
    if (rent) return;
    const text = $(el).text().trim();
    // 「8.5万円」のような単独の賃料表示を探す
    const match = text.match(/^([\d.]+)\s*万円$/);
    if (match) {
      rent = Math.round(parseFloat(match[1]) * 10000);
    }
  });
  // gapData から補完
  if (!rent && gapData?.rent) {
    rent = parseJapaneseNumber(String(gapData.rent));
  }
  // title タグから: "...／宮崎台駅の賃貸" にはないが、ページ全体から探す
  if (!rent) {
    const htmlRentMatch = html.match(/賃料[：:]\s*([\d.]+)\s*万/);
    if (htmlRentMatch) {
      rent = Math.round(parseFloat(htmlRentMatch[1]) * 10000);
    }
  }

  // ── 管理費 ──
  let managementFee = 0;
  const mgmtText = findTableValue("管理費", "共益費");
  if (mgmtText) {
    managementFee = parseJapaneseNumber(mgmtText);
  }
  // 「管理費 N円」パターン
  if (!managementFee) {
    $("span, div").each((_, el) => {
      if (managementFee) return;
      const text = $(el).text().trim();
      const match = text.match(/管理費[・共益費]*\s*([\d,]+)\s*円/);
      if (match) {
        managementFee = parseJapaneseNumber(match[1]);
      }
    });
  }

  // ── 敷金・礼金 ──
  let deposit = 0;
  let keyMoney = 0;
  const depositText = findTableValue("敷金");
  const keyMoneyText = findTableValue("礼金");
  if (depositText) {
    deposit = parseMonths(depositText, rent) || parseJapaneseNumber(depositText);
  }
  if (keyMoneyText) {
    deposit = parseMonths(keyMoneyText, rent) || parseJapaneseNumber(keyMoneyText);
  }
  // 「敷/礼」 や 「敷金N万円/礼金N万円」 パターン
  if (!deposit && !keyMoney) {
    $("span, div, td").each((_, el) => {
      const text = $(el).text().trim();
      const dMatch = text.match(/敷金?\s*([\d.]+万|なし|-)/);
      if (dMatch && !deposit) {
        deposit = parseJapaneseNumber(dMatch[1]);
      }
      const kMatch = text.match(/礼金?\s*([\d.]+万|なし|-)/);
      if (kMatch && !keyMoney) {
        keyMoney = parseJapaneseNumber(kMatch[1]);
      }
    });
  }

  // ── 間取り ──
  let layout = findTableValue("間取り");
  if (layout) {
    // 結合セルから間取り部分を抽出 ("和6 洋6 洋5 LDK12.8 鉄筋コン" → "3LDK")
    const layoutMatch = layout.match(/(\d*[LDK]+\d*[\d.]*)/);
    if (layoutMatch) {
      // 部屋数を数える
      const roomCount = (layout.match(/[和洋]\d/g) || []).length;
      layout = roomCount > 0 ? `${roomCount}${layoutMatch[1].replace(/[\d.]+$/, "")}` : layoutMatch[1];
    }
  }

  // ── 面積 ──
  const areaText = findTableValue("専有面積", "面積");
  const area = parseArea(areaText);

  // ── 階数 ──
  let floor = "";
  const floorText = findTableValue("階建", "階");
  if (floorText) {
    const floorMatch = floorText.match(/(\d+階\s*\/\s*\d+階建|\d+階\/地下?\d+階建|\d+階建)/);
    if (floorMatch) {
      floor = floorMatch[1];
    } else {
      floor = floorText.substring(0, 20);
    }
  }

  // ── 建物種別・構造 ──
  let buildingType = findTableValue("建物種別", "種別", "構造");
  // 結合データ "和6 洋6 洋5 LDK12.8 鉄筋コン" から構造部分抽出
  if (!buildingType) {
    const structText = findTableValue("間取り詳細構造", "間取り");
    const structMatch = structText.match(/(鉄筋コン|鉄骨|木造|RC|SRC|S造|軽量鉄骨)/);
    if (structMatch) {
      buildingType = structMatch[1];
    }
  }

  // ── 築年数 ──
  let age = findTableValue("築年月", "築年数");
  if (!age) {
    const floorData = findTableValue("階建築年月", "階建");
    const ageMatch = floorData.match(/(\d{4}年\d{1,2}月)/);
    if (ageMatch) {
      age = ageMatch[1];
    }
  }
  // 「1階/5階建1997年9月」のような結合データから階数も取得
  if (!floor) {
    const combinedText = findTableValue("階建築年月", "階建");
    const floorMatch = combinedText.match(/(\d+階\s*[/／]\s*\d+階建)/);
    if (floorMatch) {
      floor = floorMatch[1];
    }
  }

  // ── 住所 ──
  let address = findTableValue("所在地", "住所");
  if (!address) {
    // title タグから: 「／神奈川県川崎市宮前区馬絹６／」
    const titleText = $("title").text();
    const addrMatch = titleText.match(/／((?:東京都|北海道|(?:大阪|京都)府|.{2,3}県).+?)／/);
    if (addrMatch) {
      address = addrMatch[1];
    }
  }

  // ── 向き ──
  const direction = findTableValue("向き", "方角");

  // ── 契約期間 ──
  const contractType = findTableValue("契約期間");

  // ── 駅情報 ──
  // SUUMO ではページ内テキストノードに「〇〇線/〇〇駅 歩N分」がある
  const stations: StationAccess[] = [];
  const seenStations = new Set<string>();

  // まずセレクタベースで試行
  $(".property_view_detail-station li, .property_view_traffic li").each((_, li) => {
    parseStationText($(li).text().trim(), stations);
  });

  // テーブルの「交通」フィールド
  const trafficText = findTableValue("交通", "アクセス");
  if (trafficText && stations.length === 0) {
    const lines = trafficText.split(/\n/).filter(Boolean);
    for (const line of lines) {
      parseStationText(line.trim(), stations);
    }
  }

  // 全テキストノードから駅情報をスキャン（最も確実な方法）
  if (stations.length === 0) {
    $("*").each((_, el) => {
      const text = $(el).clone().children().remove().end().text().trim();
      // 「〇〇線/〇〇駅 歩N分」パターン
      if (text.includes("駅") && text.includes("分") && text.length < 100 && text.length > 5) {
        const beforeCount = stations.length;
        parseStationText(text, stations);
        // 重複除去
        if (stations.length > beforeCount) {
          const last = stations[stations.length - 1];
          const key = `${last.station}-${last.walkMinutes}`;
          if (seenStations.has(key)) {
            stations.pop();
          } else {
            seenStations.add(key);
          }
        }
      }
    });
  }

  // 最初の3駅のみ（物件の最寄り駅として表示されるもの）
  // ページ下部の他物件の駅情報を除外するため、最初に見つかった3つに限定
  const propertyStations = stations.slice(0, 3);

  // ── 設備 ──
  const features: string[] = [];
  $(".property_view_detail-features li, .property_data-features li").each((_, li) => {
    const text = $(li).text().trim();
    if (text) features.push(text);
  });
  const featuresText = findTableValue("設備", "条件・設備", "条件");
  if (featuresText) {
    featuresText.split(/[、,／\n]/).forEach((f) => {
      const t = f.trim();
      if (t && !features.includes(t)) features.push(t);
    });
  }
  // 「条件取り扱い店舗物件コード」のような結合テーブルから条件を抽出
  const condText = findTableValue("条件取り扱い");
  if (condText) {
    const condPart = condText.split(/\d{5,}/)[0]; // 物件コード以前
    condPart.split(/[/／\n]/).forEach((f) => {
      const t = f.trim();
      if (t && !features.includes(t) && t.length < 30) features.push(t);
    });
  }

  // ── 画像URL取得 ──
  const images: string[] = [];
  const seenUrls = new Set<string>();

  $("img").each((_, img) => {
    const src = $(img).attr("src") || $(img).attr("data-src") || $(img).attr("data-lazy") || "";
    if (
      src &&
      !seenUrls.has(src) &&
      !src.includes("spacer") &&
      !src.includes("icon") &&
      !src.includes("logo") &&
      !src.includes("common") &&
      !src.includes("btn_") &&
      !src.includes("arrow") &&
      (src.includes("suumo") || src.includes("img0")) &&
      (src.includes("/bukken/") || src.includes("/chintai/") || src.includes("/jnc/") || src.includes("resize"))
    ) {
      const largeSrc = src
        .replace(/\/s\//g, "/l/")
        .replace(/_s\./, "_l.")
        .replace(/\/resize\/\d+x\d+/, "/resize/640x480");
      seenUrls.add(largeSrc);
      images.push(largeSrc);
    }
  });

  // og:image
  const ogImage = $('meta[property="og:image"]').attr("content");
  if (ogImage && !seenUrls.has(ogImage)) {
    images.unshift(ogImage);
  }

  // ── 保険・損保情報から管理費や追加費用を取得 ──
  const insuranceText = findTableValue("損保", "保険");
  const parkingText = findTableValue("駐車場");

  // 損保テーブルの「2万円2年」のようなパターンから敷金/礼金を抽出
  if (!deposit && !keyMoney) {
    const dkText = findTableValue("損保駐車場");
    if (dkText) {
      const costMatch = dkText.match(/([\d.]+)万円/);
      if (costMatch) {
        // これは損保費用なので敷金ではない
      }
    }
  }

  // ── 仲介手数料 ──
  const brokerageText = findTableValue("仲介手数料");

  return {
    name,
    rent,
    managementFee,
    deposit,
    keyMoney,
    layout,
    area,
    floor,
    buildingType,
    age,
    address,
    stations: propertyStations,
    features,
    direction,
    contractType,
    images,
    url,
    // デバッグ用に追加情報をログ
    ...(process.env.NODE_ENV === "development"
      ? {
          _debug: {
            insuranceText,
            parkingText,
            brokerageText,
            rawStationCount: stations.length,
          },
        }
      : {}),
  } as PropertyData;
}
