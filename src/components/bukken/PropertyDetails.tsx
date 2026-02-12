"use client";

import type { PropertyData } from "@/lib/bukken/types";

export default function PropertyDetails({
  property,
}: {
  property: PropertyData;
}) {
  const details = [
    { label: "住所", value: property.address },
    { label: "間取り", value: property.layout },
    { label: "面積", value: property.area > 0 ? `${property.area}m²` : "" },
    { label: "階数", value: property.floor },
    { label: "建物種別", value: property.buildingType },
    { label: "築年数", value: property.age },
    { label: "向き", value: property.direction },
    { label: "契約期間", value: property.contractType },
  ].filter((d) => d.value);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-bold mb-4">物件詳細</h3>
      <dl className="space-y-2">
        {details.map((d, i) => (
          <div key={i} className="flex">
            <dt className="w-28 shrink-0 text-sm text-gray-500">{d.label}</dt>
            <dd className="text-sm">{d.value}</dd>
          </div>
        ))}
      </dl>
      {property.features.length > 0 && (
        <>
          <h4 className="text-sm font-bold mt-6 mb-2 text-gray-600">
            設備・特徴
          </h4>
          <div className="flex flex-wrap gap-2">
            {property.features.map((f, i) => (
              <span
                key={i}
                className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
              >
                {f}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
