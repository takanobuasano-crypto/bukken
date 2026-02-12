"use client";

import type { StationAccess, StationElevationInfo } from "@/lib/bukken/types";
import {
  SLOPE_LABELS,
  SLOPE_COLORS,
  SLOPE_BG_COLORS,
} from "@/lib/bukken/constants";

function hasElevation(
  st: StationAccess | StationElevationInfo
): st is StationElevationInfo {
  return "slopeCategory" in st && "propertyElevation" in st;
}

function SlopeVisual({ station }: { station: StationElevationInfo }) {
  const absDiff = Math.abs(station.elevationDiff);
  const barPercent = Math.min(100, (absDiff / 30) * 100);
  const isUphill = station.elevationDiff > 0;
  const barColor =
    station.slopeCategory === "flat"
      ? "bg-green-400"
      : station.slopeCategory === "gentle"
      ? "bg-yellow-400"
      : "bg-red-400";

  return (
    <div className="flex items-end gap-1 h-12">
      <div className="flex flex-col items-center w-8">
        <span className="text-[10px] text-gray-400 mb-0.5">駅</span>
        <div
          className={`w-4 rounded-t ${isUphill ? "bg-gray-300" : barColor}`}
          style={{ height: isUphill ? 12 : Math.max(12, barPercent * 0.48) }}
        />
      </div>
      <div className="flex flex-col items-center justify-end flex-1 pb-1">
        <span className="text-[10px] text-gray-500">
          {station.slopeGradient > 0
            ? `勾配${station.slopeGradient.toFixed(1)}%`
            : ""}
        </span>
        <div className="w-full border-t border-dashed border-gray-300 relative">
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-400 text-xs">
            {isUphill ? "↗" : station.elevationDiff < 0 ? "↘" : "→"}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-center w-8">
        <span className="text-[10px] text-blue-500 mb-0.5">物件</span>
        <div
          className={`w-4 rounded-t ${isUphill ? barColor : "bg-blue-300"}`}
          style={{ height: isUphill ? Math.max(12, barPercent * 0.48) : 12 }}
        />
      </div>
    </div>
  );
}

interface Props {
  stations: StationAccess[];
  stationElevations?: StationElevationInfo[];
}

export default function StationInfo({ stations, stationElevations }: Props) {
  if (stations.length === 0) return null;

  // 各駅について、標高データがあればそれを使う
  const elevMap = new Map<string, StationElevationInfo>();
  if (stationElevations) {
    for (const se of stationElevations) {
      elevMap.set(se.station, se);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-bold mb-2">最寄り駅 &amp; 坂道情報</h3>
      <p className="text-xs text-gray-400 mb-4">
        駅から物件までの高低差と坂の度合いを表示しています
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stations.map((st, i) => {
          const elev = elevMap.get(st.station);
          const withElev = elev && hasElevation(elev);

          return (
            <div key={i} className="border rounded-lg p-4">
              {/* 駅名 + 徒歩分数 */}
              <div className="flex items-center justify-between mb-2">
                <div>
                  {st.line && (
                    <span className="text-xs text-gray-500 block">
                      {st.line}
                    </span>
                  )}
                  <span className="font-bold text-lg">{st.station}駅</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    {st.walkMinutes * 80 >= 1000
                      ? `${(st.walkMinutes * 80 / 1000).toFixed(1)}km`
                      : `${st.walkMinutes * 80}m`}
                  </span>
                  <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    徒歩{st.walkMinutes}分
                  </span>
                </div>
              </div>

              {/* 高低差情報 */}
              {withElev ? (
                <div className="mt-3 space-y-3">
                  <SlopeVisual station={elev} />

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-gray-50 rounded p-2">
                      <div className="text-gray-400">駅の標高</div>
                      <div className="font-bold mt-0.5">
                        {elev.elevation.toFixed(1)}m
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <div className="text-gray-400">物件の標高</div>
                      <div className="font-bold mt-0.5">
                        {elev.propertyElevation.toFixed(1)}m
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <div className="text-gray-400">高低差</div>
                      <div className="font-bold mt-0.5">
                        {elev.elevationDiff > 0 ? "+" : ""}
                        {elev.elevationDiff.toFixed(1)}m
                      </div>
                    </div>
                  </div>

                  <div
                    className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
                      SLOPE_BG_COLORS[elev.slopeCategory]
                    }`}
                  >
                    <span className="text-lg">
                      {elev.slopeCategory === "flat"
                        ? "🟢"
                        : elev.slopeCategory === "gentle"
                        ? "🟡"
                        : "🔴"}
                    </span>
                    <div>
                      <span
                        className={`font-bold ${
                          SLOPE_COLORS[elev.slopeCategory]
                        }`}
                      >
                        {SLOPE_LABELS[elev.slopeCategory]}
                      </span>
                      <span className="text-gray-600 ml-1">
                        {elev.slopeCategory === "flat"
                          ? "（ほぼ平坦で歩きやすい）"
                          : elev.slopeCategory === "gentle"
                          ? "（多少の坂あり）"
                          : "（急な坂道あり、自転車は大変）"}
                      </span>
                    </div>
                  </div>
                  {elev.elevationDiff !== 0 && (
                    <p className="text-xs text-gray-400">
                      {elev.elevationDiff > 0
                        ? `駅から物件まで上り坂です（+${elev.elevationDiff.toFixed(
                            1
                          )}m）。帰りは下りになります。`
                        : `駅から物件まで下り坂です（${elev.elevationDiff.toFixed(
                            1
                          )}m）。帰りは上りになります。`}
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-3">
                  <div className="bg-gray-50 rounded-lg px-3 py-3 text-sm text-gray-400 text-center">
                    高低差情報: <span className="font-bold text-gray-500">無</span>
                    <p className="text-xs mt-1">位置情報または標高データを取得できませんでした</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
