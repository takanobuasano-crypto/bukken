import { NextRequest, NextResponse } from "next/server";
import { geocodeAddress, geocodeStation } from "@/lib/bukken/geocoding";

export async function POST(request: NextRequest) {
  try {
    const { address, stations } = await request.json();

    const results: {
      property: { lat: number; lng: number } | null;
      stations: { name: string; lat: number; lng: number }[];
    } = {
      property: null,
      stations: [],
    };

    // 物件住所をジオコーディング
    if (address) {
      results.property = await geocodeAddress(address);
    }

    // 各駅をジオコーディング（物件座標の近辺に絞る）
    if (stations && Array.isArray(stations)) {
      const stationResults = await Promise.all(
        stations.map(async (name: string) => {
          const coords = await geocodeStation(name, results.property ?? undefined);
          return coords ? { name, ...coords } : null;
        })
      );
      results.stations = stationResults.filter(
        (s): s is { name: string; lat: number; lng: number } => s !== null
      );
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Geocode error:", error);
    return NextResponse.json(
      { error: "ジオコーディングに失敗しました" },
      { status: 500 }
    );
  }
}
