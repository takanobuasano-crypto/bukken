"use client";

import type { InitialCostBreakdown } from "@/lib/bukken/types";

export default function CostBreakdown({
  costs,
}: {
  costs: InitialCostBreakdown;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-bold mb-4">初期費用の目安</h3>
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-gray-200">
            <th className="text-left py-2 text-sm text-gray-500">項目</th>
            <th className="text-right py-2 text-sm text-gray-500">金額</th>
          </tr>
        </thead>
        <tbody>
          {costs.items.map((item, i) => (
            <tr key={i} className="border-b border-gray-100">
              <td className="py-3">
                <span className="text-sm">{item.label}</span>
                {item.isEstimate && (
                  <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">
                    推定
                  </span>
                )}
                {item.note && (
                  <span className="block text-xs text-gray-400 mt-0.5">
                    {item.note}
                  </span>
                )}
              </td>
              <td className="py-3 text-right font-mono text-sm">
                {item.amount > 0
                  ? `¥${item.amount.toLocaleString()}`
                  : item.note === "なし"
                  ? "¥0"
                  : `¥${item.amount.toLocaleString()}`}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-300">
            <td className="py-3 font-bold">合計</td>
            <td className="py-3 text-right font-bold font-mono text-lg text-blue-700">
              ¥{costs.total.toLocaleString()}
            </td>
          </tr>
          <tr>
            <td colSpan={2} className="text-xs text-gray-400 pb-2">
              うち推定額: ¥{costs.estimatedTotal.toLocaleString()}
              （実際の金額は物件により異なります）
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
