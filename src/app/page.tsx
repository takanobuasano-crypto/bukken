"use client";

import { useState, useCallback } from "react";
import type {
  PropertyData,
  InitialCostBreakdown,
  ElevationData,
  StationElevationInfo,
  ParkingLot,
  StationElevationProfile,
} from "@/lib/bukken/types";
import { calculateInitialCosts } from "@/lib/bukken/cost-calculator";
import { classifySlope } from "@/lib/bukken/elevation";
import PropertySummary from "@/components/bukken/PropertySummary";
import PhotoGallery from "@/components/bukken/PhotoGallery";
import CostBreakdown from "@/components/bukken/CostBreakdown";
import PropertyDetails from "@/components/bukken/PropertyDetails";
import StationInfo from "@/components/bukken/StationInfo";
import ElevationChart from "@/components/bukken/ElevationChart";
import PropertyMap from "@/components/bukken/PropertyMap";
import ParkingList from "@/components/bukken/ParkingList";

type LoadingStep = "idle" | "scraping" | "geocoding" | "elevation" | "parking" | "done" | "error";

const STEP_LABELS: Record<LoadingStep, string> = {
  idle: "",
  scraping: "物件情報を取得中...",
  geocoding: "位置情報を計算中...",
  elevation: "標高データを取得中...",
  parking: "周辺の駐車場を検索中...",
  done: "",
  error: "",
};

export default function Home() {
  const [url, setUrl] = useState("");
  const [step, setStep] = useState<LoadingStep>("idle");
  const [error, setError] = useState("");

  const [property, setProperty] = useState<PropertyData | null>(null);
  const [costs, setCosts] = useState<InitialCostBreakdown | null>(null);
  const [stationElevations, setStationElevations] = useState<StationElevationInfo[]>([]);
  const [propertyElevation, setPropertyElevation] = useState<ElevationData | null>(null);
  const [stationElevationData, setStationElevationData] = useState<ElevationData[]>([]);
  const [hasGeoData, setHasGeoData] = useState(false);
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [elevationProfiles, setElevationProfiles] = useState<StationElevationProfile[]>([]);

  const analyze = useCallback(async () => {
    if (!url.trim()) return;
    setStep("scraping");
    setError("");
    setProperty(null);
    setCosts(null);
    setStationElevations([]);
    setPropertyElevation(null);
    setStationElevationData([]);
    setHasGeoData(false);
    setParkingLots([]);
    setElevationProfiles([]);

    try {
      // Step 1: Scrape
      const scrapeRes = await fetch("/api/bukken/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const scrapeData = await scrapeRes.json();
      if (!scrapeRes.ok) {
        throw new Error(scrapeData.error || "スクレイピングに失敗しました");
      }
      const prop: PropertyData = scrapeData;
      setProperty(prop);
      setCosts(calculateInitialCosts(prop));

      // Step 2: Geocode
      if (!prop.address && prop.stations.length === 0) {
        setStep("done");
        return;
      }

      setStep("geocoding");
      const stationNames = prop.stations.map((s) => s.station);
      const geoRes = await fetch("/api/bukken/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: prop.address, stations: stationNames }),
      });
      const geoData = await geoRes.json();

      if (!geoRes.ok || !geoData.property) {
        setStep("done");
        return;
      }

      // Step 3: Elevation
      setStep("elevation");
      const elevationPoints = [
        { label: "物件", lat: geoData.property.lat, lng: geoData.property.lng },
        ...geoData.stations.map((s: { name: string; lat: number; lng: number }) => ({
          label: `${s.name}駅`,
          lat: s.lat,
          lng: s.lng,
        })),
      ];

      const elevRes = await fetch("/api/bukken/elevation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points: elevationPoints }),
      });
      const elevData = await elevRes.json();

      if (elevRes.ok && elevData.elevations) {
        const elev: ElevationData[] = elevData.elevations;
        const propElev = elev[0];
        const stElev = elev.slice(1);

        setPropertyElevation(propElev);
        setStationElevationData(stElev);

        // Build station elevation info
        const stInfos: StationElevationInfo[] = prop.stations.map((st) => {
          const stGeo = geoData.stations.find(
            (g: { name: string }) => g.name === st.station
          );
          const stElevData = stElev.find(
            (e: ElevationData) => e.label === `${st.station}駅`
          );
          const elevation = stElevData?.elevation ?? 0;
          const diff = propElev.elevation - elevation;
          // 勾配: 高低差 / 水平距離(概算: 徒歩1分 ≈ 80m)
          const walkDistance = st.walkMinutes * 80;
          const slopeGradient = walkDistance > 0 ? (Math.abs(diff) / walkDistance) * 100 : 0;
          return {
            ...st,
            lat: stGeo?.lat ?? 0,
            lng: stGeo?.lng ?? 0,
            elevation,
            propertyElevation: propElev.elevation,
            elevationDiff: diff,
            slopeCategory: classifySlope(diff),
            slopeGradient,
          };
        });
        setStationElevations(stInfos);
        setHasGeoData(true);

        // 各駅→物件の標高断面図を取得（並列）
        const profilePromises = geoData.stations.map(
          async (stGeo: { name: string; lat: number; lng: number }) => {
            try {
              const res = await fetch("/api/bukken/elevation-profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  stationLat: stGeo.lat,
                  stationLng: stGeo.lng,
                  propertyLat: geoData.property.lat,
                  propertyLng: geoData.property.lng,
                  stationName: stGeo.name,
                }),
              });
              const data = await res.json();
              if (res.ok && data.profile) {
                return { stationName: stGeo.name, points: data.profile } as StationElevationProfile;
              }
            } catch {
              // ignore
            }
            return null;
          },
        );
        const profiles = (await Promise.all(profilePromises)).filter(
          (p): p is StationElevationProfile => p !== null,
        );
        setElevationProfiles(profiles);
      }

      // Step 4: Parking
      setStep("parking");
      try {
        const parkRes = await fetch("/api/bukken/parking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: prop.address,
            lat: geoData.property.lat,
            lng: geoData.property.lng,
          }),
        });
        const parkData = await parkRes.json();
        if (parkRes.ok && parkData.parkingLots) {
          setParkingLots(parkData.parkingLots);
        }
      } catch {
        // 駐車場検索の失敗は無視して続行
        console.warn("Parking search failed");
      }

      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
      setStep("error");
    }
  }, [url]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    analyze();
  };

  const isLoading = step !== "idle" && step !== "done" && step !== "error";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">
            賃貸物件分析ツール
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            SUUMOのURLを入力して、物件の詳細・初期費用・高低差を分析
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* URL入力フォーム */}
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex gap-3">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://suumo.jp/chintai/jnc_..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "分析中..." : "分析する"}
            </button>
          </div>
        </form>

        {/* ローディング表示 */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600 mb-4" />
            <p className="text-gray-600">{STEP_LABELS[step]}</p>
          </div>
        )}

        {/* エラー表示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* 結果表示 */}
        {property && step === "done" && (
          <div className="space-y-6">
            <PropertySummary property={property} />

            {property.images && property.images.length > 0 && (
              <PhotoGallery images={property.images} propertyName={property.name} />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {costs && <CostBreakdown costs={costs} />}
              <PropertyDetails property={property} />
            </div>

            {property.stations.length > 0 && (
              <StationInfo
                stations={property.stations}
                stationElevations={stationElevations.length > 0 ? stationElevations : undefined}
              />
            )}

            {hasGeoData && propertyElevation && stationElevationData.length > 0 && (
              <>
                {elevationProfiles.length > 0 && (
                  <ElevationChart profiles={elevationProfiles} />
                )}
                <PropertyMap
                  property={propertyElevation}
                  stations={stationElevationData}
                  parkingLots={parkingLots}
                />
              </>
            )}

            {parkingLots.length > 0 && (
              <ParkingList parkingLots={parkingLots} />
            )}

            <div className="text-center pt-4 pb-8">
              <a
                href={property.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                SUUMOで物件を見る →
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
