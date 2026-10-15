/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo } from "react";
import { CircleMarker, MapContainer, TileLayer, Tooltip } from "react-leaflet";
import { Municipality } from "@/types";
import { fmt, pct } from "@/lib/data";
import { TILE_ATTRIBUTION, TILE_URL } from "@/lib/map";
import geojson from "@/data/sc.json";

/** calcula centroide aproximado (media dos aneis externos) de cada municipio */
function computeCentroids(): Map<number, [number, number]> {
  const map = new Map<number, [number, number]>();
  for (const f of (geojson as any).features) {
    const code = Number(f.properties.codarea);
    let sumLat = 0,
      sumLng = 0,
      n = 0;
    const rings: number[][][] =
      f.geometry.type === "Polygon"
        ? [f.geometry.coordinates[0]]
        : f.geometry.type === "MultiPolygon"
        ? f.geometry.coordinates.map((p: number[][][]) => p[0])
        : [];
    for (const ring of rings) {
      for (const [lng, lat] of ring) {
        sumLng += lng;
        sumLat += lat;
        n++;
      }
    }
    if (n > 0) map.set(code, [sumLat / n, sumLng / n]);
  }
  return map;
}

export function corAbstencao(p: number): string {
  if (p >= 25) return "#dc2626";
  if (p >= 20) return "#f97316";
  if (p >= 16) return "#facc15";
  return "#4ade80";
}

export default function MapaAbstencao({
  municipios,
}: {
  municipios: Municipality[];
}) {
  const centroids = useMemo(computeCentroids, []);
  const maxAbst = Math.max(...municipios.map((m) => m.abst));

  const raio = (abst: number) => 6 + Math.sqrt(abst / maxAbst) * 26;

  return (
    <MapContainer
      center={[-27.2, -50.5]}
      zoom={8}
      minZoom={6}
      maxZoom={12}
      scrollWheelZoom
      className="h-[560px] w-full rounded-xl border border-zinc-700"
      style={{ background: "#0b1220" }}
    >
      <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} />
      {municipios.map((m) => {
        const c = centroids.get(m.ibge);
        if (!c || !m.abst) return null;
        const taxa = pct(m.abst, m.aptos);
        return (
          <CircleMarker
            key={m.ibge}
            center={c}
            radius={raio(m.abst)}
            pathOptions={{
              color: corAbstencao(taxa),
              fillColor: corAbstencao(taxa),
              fillOpacity: 0.55,
              weight: 1,
            }}
          >
            <Tooltip>
              <div style={{ fontFamily: "inherit" }}>
                <b>{m.nome}</b>
                <br />
                {fmt(m.abst)} abstenções ({taxa.toFixed(1)}% dos aptos)
                <br />
                Aptos: {fmt(m.aptos)} · Compareceram: {fmt(m.comp)}
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
