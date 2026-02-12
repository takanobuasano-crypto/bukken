import { NextRequest, NextResponse } from "next/server";
import { getElevation } from "@/lib/bukken/elevation";

interface ElevationPoint {
  label: string;
  lat: number;
  lng: number;
}

export async function POST(request: NextRequest) {
  try {
    const { points } = (await request.json()) as { points: ElevationPoint[] };

    if (!points || !Array.isArray(points)) {
      return NextResponse.json({ error: "座標データが必要です" }, { status: 400 });
    }

    const results = await Promise.all(
      points.map(async (point) => {
        const elevation = await getElevation(point.lat, point.lng);
        return {
          label: point.label,
          lat: point.lat,
          lng: point.lng,
          elevation: elevation ?? 0,
        };
      })
    );

    return NextResponse.json({ elevations: results });
  } catch (error) {
    console.error("Elevation error:", error);
    return NextResponse.json(
      { error: "標高データの取得に失敗しました" },
      { status: 500 }
    );
  }
}
