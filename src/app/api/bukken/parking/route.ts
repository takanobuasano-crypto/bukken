import { NextRequest, NextResponse } from "next/server";
import { searchParking } from "@/lib/bukken/parking";

export async function POST(request: NextRequest) {
  try {
    const { address, lat, lng } = await request.json();

    if (!address || !lat || !lng) {
      return NextResponse.json(
        { error: "address, lat, lng が必要です" },
        { status: 400 },
      );
    }

    const parkingLots = await searchParking(address, lat, lng);

    return NextResponse.json({ parkingLots });
  } catch (error) {
    console.error("Parking search error:", error);
    return NextResponse.json(
      { error: "駐車場情報の取得に失敗しました" },
      { status: 500 },
    );
  }
}
