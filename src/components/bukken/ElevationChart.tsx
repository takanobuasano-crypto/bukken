"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts";
import type { StationElevationProfile } from "@/lib/bukken/types";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b"];

interface Props {
  profiles: StationElevationProfile[];
}

export default function ElevationChart({ profiles }: Props) {
  if (profiles.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-bold mb-2">標高断面図</h3>
      <p className="text-xs text-gray-400 mb-4">
        各駅から物件までの直線上の標高変化
      </p>
      <div className="space-y-6">
        {profiles.map((profile, idx) => {
          const data = profile.points.map((p, i) => ({
            name: p.label,
            elevation: p.elevation,
            index: i,
          }));
          const elevations = data.map((d) => d.elevation);
          const minElev = Math.floor(Math.min(...elevations) - 2);
          const maxElev = Math.ceil(Math.max(...elevations) + 2);

          return (
            <div key={profile.stationName}>
              <div className="text-sm font-medium text-gray-700 mb-2">
                {profile.stationName}駅 → 物件
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id={`gradient-${idx}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS[idx % COLORS.length]} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS[idx % COLORS.length]} stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      interval={0}
                      angle={-30}
                      textAnchor="end"
                      height={40}
                    />
                    <YAxis
                      domain={[minElev, maxElev]}
                      tick={{ fontSize: 11 }}
                      label={{ value: "m", position: "top", offset: 10, fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value.toFixed(1)}m`, "標高"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="elevation"
                      stroke={COLORS[idx % COLORS.length]}
                      strokeWidth={2}
                      fill={`url(#gradient-${idx})`}
                    />
                    <ReferenceDot
                      x={data[0].name}
                      y={data[0].elevation}
                      r={5}
                      fill={COLORS[idx % COLORS.length]}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                    <ReferenceDot
                      x={data[data.length - 1].name}
                      y={data[data.length - 1].elevation}
                      r={5}
                      fill="#e53e3e"
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
