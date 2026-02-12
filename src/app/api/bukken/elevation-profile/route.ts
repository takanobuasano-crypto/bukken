import { NextRequest, NextResponse } from "next/server";
import { getElevation } from "@/lib/bukken/elevation";

interface ProfileRequest {
  stationLat: number;
  stationLng: number;
  propertyLat: number;
  propertyLng: number;
  stationName: string;
  steps?: number;
}

export async function POST(request: NextRequest) {
  try {
    const { stationLat, stationLng, propertyLat, propertyLng, stationName, steps = 10 } =
      (await request.json()) as ProfileRequest;

    // 駅→物件の直線上に等間隔のポイントを生成
    const points: { label: string; lat: number; lng: number }[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const lat = stationLat + (propertyLat - stationLat) * t;
      const lng = stationLng + (propertyLng - stationLng) * t;
      let label: string;
      if (i === 0) label = `${stationName}駅`;
      else if (i === steps) label = "物件";
      else label = `${Math.round(t * 100)}%`;
      points.push({ label, lat, lng });
    }

    // 各ポイントの標高を取得
    const results = await Promise.all(
      points.map(async (p) => {
        const elevation = await getElevation(p.lat, p.lng);
        return { label: p.label, elevation: elevation ?? 0 };
      }),
    );

    return NextResponse.json({ profile: results });
  } catch (error) {
    console.error("Elevation profile error:", error);
    return NextResponse.json(
      { error: "標高断面データの取得に失敗しました" },
      { status: 500 },
    );
  }
}
