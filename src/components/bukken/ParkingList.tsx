"use client";

import type { ParkingLot } from "@/lib/bukken/types";

interface Props {
  parkingLots: ParkingLot[];
}

export default function ParkingList({ parkingLots }: Props) {
  if (parkingLots.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-bold mb-2">周辺の月極駐車場</h3>
      <p className="text-xs text-gray-400 mb-4">
        at-parking.jp のデータ（物件から1km以内・{parkingLots.length}件）
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {parkingLots.map((p) => (
          <a
            key={p.id}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="border rounded-lg p-4 hover:bg-gray-50 transition-colors block"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="font-bold text-sm">{p.name}</div>
              <span className="text-sm font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded whitespace-nowrap">
                {p.price}
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-2">{p.address}</p>
            <div className="flex items-center gap-2 text-xs">
              <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                {p.distanceM}m
              </span>
              {p.is24h && (
                <span className="bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">24h</span>
              )}
              {p.isIndoor && (
                <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">屋内</span>
              )}
              {p.isOutdoor && (
                <span className="bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded">屋外</span>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
