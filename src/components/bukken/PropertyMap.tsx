"use client";

import { useEffect, useState } from "react";
import type { ElevationData, ParkingLot } from "@/lib/bukken/types";

interface Props {
  property: ElevationData;
  stations: ElevationData[];
  parkingLots?: ParkingLot[];
}

const HAZARD_LAYERS = [
  {
    id: "flood",
    label: "洪水浸水想定",
    url: "https://disaportaldata.gsi.go.jp/raster/01_flood_l2_shinsuishin_data/{z}/{x}/{y}.png",
  },
  {
    id: "doseki",
    label: "土砂災害警戒",
    url: "https://disaportaldata.gsi.go.jp/raster/05_dosekiryukeikaikuiki/{z}/{x}/{y}.png",
  },
  {
    id: "tsunami",
    label: "津波浸水想定",
    url: "https://disaportaldata.gsi.go.jp/raster/04_tsunami_newlegend_data/{z}/{x}/{y}.png",
  },
  {
    id: "takashio",
    label: "高潮浸水想定",
    url: "https://disaportaldata.gsi.go.jp/raster/03_hightide_l2_shinsuishin_data/{z}/{x}/{y}.png",
  },
];

export default function PropertyMap({ property, stations, parkingLots = [] }: Props) {
  const [mapReady, setMapReady] = useState(false);
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set(["flood"]));
  const [MapContainer, setMapContainer] = useState<React.ComponentType<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any
  > | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [TileLayer, setTileLayer] = useState<React.ComponentType<any> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [MarkerComp, setMarkerComp] = useState<React.ComponentType<any> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [PopupComp, setPopupComp] = useState<React.ComponentType<any> | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [icons, setIcons] = useState<{ property: any; station: any; parking: any } | null>(null);

  useEffect(() => {
    // Dynamic import to avoid SSR issues
    Promise.all([
      import("react-leaflet"),
      import("leaflet"),
      // @ts-expect-error CSS import
      import("leaflet/dist/leaflet.css"),
    ]).then(([rl, L]) => {
      const createIcon = (color: string, label: string) =>
        L.divIcon({
          className: "",
          html: `<div style="
            background:${color};
            width:28px;height:28px;
            border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);
            border:2px solid #fff;
            box-shadow:0 2px 6px rgba(0,0,0,.3);
            display:flex;align-items:center;justify-content:center;
          "><span style="
            transform:rotate(45deg);
            color:#fff;font-size:12px;font-weight:bold;
          ">${label}</span></div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 28],
          popupAnchor: [0, -28],
        });

      setIcons({
        property: createIcon("#e53e3e", "家"),
        station: createIcon("#3182ce", "駅"),
        parking: createIcon("#38a169", "P"),
      });
      setMapContainer(() => rl.MapContainer);
      setTileLayer(() => rl.TileLayer);
      setMarkerComp(() => rl.Marker);
      setPopupComp(() => rl.Popup);
      setMapReady(true);
    });
  }, []);

  if (!mapReady || !MapContainer || !TileLayer || !MarkerComp || !PopupComp || !icons) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold mb-4">地図</h3>
        <div className="h-80 bg-gray-100 rounded flex items-center justify-center text-gray-400">
          地図を読み込み中...
        </div>
      </div>
    );
  }

  const parkingPoints = parkingLots.map((p) => ({ lat: p.lat, lng: p.lng }));
  const allPoints = [property, ...stations, ...parkingPoints];
  const center: [number, number] = [property.lat, property.lng];

  // Compute bounds for auto-zoom
  const lats = allPoints.map((p) => p.lat);
  const lngs = allPoints.map((p) => p.lng);
  const bounds: [[number, number], [number, number]] = [
    [Math.min(...lats) - 0.005, Math.min(...lngs) - 0.005],
    [Math.max(...lats) + 0.005, Math.max(...lngs) + 0.005],
  ];

  const toggleLayer = (id: string) => {
    setActiveLayers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-bold mb-2">地図 &amp; 浸水リスク</h3>
      <div className="flex flex-wrap gap-2 mb-3">
        {HAZARD_LAYERS.map((layer) => (
          <button
            key={layer.id}
            onClick={() => toggleLayer(layer.id)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              activeLayers.has(layer.id)
                ? "bg-red-50 border-red-300 text-red-700"
                : "bg-white border-gray-200 text-gray-500 hover:border-gray-400"
            }`}
          >
            {activeLayers.has(layer.id) ? "ON" : "OFF"} {layer.label}
          </button>
        ))}
      </div>
      <div className="h-96 rounded overflow-hidden">
        <MapContainer
          center={center}
          bounds={bounds}
          zoom={15}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {HAZARD_LAYERS.filter((l) => activeLayers.has(l.id)).map((layer) => (
            <TileLayer
              key={layer.id}
              url={layer.url}
              opacity={0.6}
              maxNativeZoom={17}
            />
          ))}
          <MarkerComp position={[property.lat, property.lng]} icon={icons.property}>
            <PopupComp>
              <strong>{property.label}</strong>
              <br />
              標高: {property.elevation.toFixed(1)}m
            </PopupComp>
          </MarkerComp>
          {stations.map((st, i) => (
            <MarkerComp key={i} position={[st.lat, st.lng]} icon={icons.station}>
              <PopupComp>
                <strong>{st.label}</strong>
                <br />
                標高: {st.elevation.toFixed(1)}m
              </PopupComp>
            </MarkerComp>
          ))}
          {parkingLots.map((p) => (
            <MarkerComp key={`p-${p.id}`} position={[p.lat, p.lng]} icon={icons.parking}>
              <PopupComp>
                <strong>{p.name}</strong>
                <br />
                {p.price} / {p.distanceM}m
                <br />
                <a href={p.url} target="_blank" rel="noopener noreferrer" style={{color:"#3182ce"}}>
                  詳細を見る
                </a>
              </PopupComp>
            </MarkerComp>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
