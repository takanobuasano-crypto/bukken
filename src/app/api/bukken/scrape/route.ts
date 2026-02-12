import { NextRequest, NextResponse } from "next/server";
import { parseSuumoHtml, debugSuumoHtml } from "@/lib/bukken/scraper";

export async function POST(request: NextRequest) {
  try {
    const { url, debug } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URLが必要です" }, { status: 400 });
    }

    // SUUMO URLバリデーション
    const parsed = new URL(url);
    if (!parsed.hostname.includes("suumo.jp")) {
      return NextResponse.json(
        { error: "SUUMOのURLを入力してください" },
        { status: 400 }
      );
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "ja,en;q=0.9",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `SUUMOページの取得に失敗しました (${response.status})` },
        { status: 502 }
      );
    }

    const html = await response.text();

    if (debug) {
      const debugInfo = debugSuumoHtml(html);
      return NextResponse.json(debugInfo);
    }

    const propertyData = parseSuumoHtml(html, url);

    if (!propertyData.rent && !propertyData.name) {
      return NextResponse.json(
        { error: "物件情報を解析できませんでした。URLを確認してください。" },
        { status: 422 }
      );
    }

    return NextResponse.json(propertyData);
  } catch (error) {
    console.error("Scrape error:", error);
    return NextResponse.json(
      { error: "物件情報の取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
