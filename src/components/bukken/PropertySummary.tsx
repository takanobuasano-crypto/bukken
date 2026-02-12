"use client";

import type { PropertyData } from "@/lib/bukken/types";

function formatYen(amount: number): string {
  if (amount >= 10000) {
    const man = amount / 10000;
    return `${man % 1 === 0 ? man.toFixed(0) : man.toFixed(1)}万円`;
  }
  return `${amount.toLocaleString()}円`;
}

export default function PropertySummary({ property }: { property: PropertyData }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">{property.name || "物件名不明"}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 col-span-2">
          <p className="text-sm text-blue-600 font-medium">家賃</p>
          <p className="text-3xl font-bold text-blue-700">
            {formatYen(property.rent)}
          </p>
          {property.managementFee > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              管理費・共益費: {formatYen(property.managementFee)}
            </p>
          )}
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-500">間取り</p>
          <p className="text-xl font-bold">{property.layout || "-"}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-500">面積</p>
          <p className="text-xl font-bold">
            {property.area > 0 ? `${property.area}m²` : "-"}
          </p>
        </div>
        {property.age && (
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">築年数</p>
            <p className="text-lg font-semibold">{property.age}</p>
          </div>
        )}
        {property.buildingType && (
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">建物種別</p>
            <p className="text-lg font-semibold">{property.buildingType}</p>
          </div>
        )}
        {property.floor && (
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">階数</p>
            <p className="text-lg font-semibold">{property.floor}</p>
          </div>
        )}
        {property.direction && (
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">向き</p>
            <p className="text-lg font-semibold">{property.direction}</p>
          </div>
        )}
      </div>
    </div>
  );
}
