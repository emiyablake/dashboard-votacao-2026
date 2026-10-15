/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { GeoJSON, MapContainer, TileLayer, Tooltip } from "react-leaflet";
import geojson from "@/data/sc.json";
import { Municipality } from "@/types";
import { fmt, partidoColor, pct, winnerIn } from "@/lib/data";
import { corAbstencao } from "@/lib/ui";
import { TILE_ATTRIBUTION, TILE_URL } from "@/lib/map";

type Metrica = "abstencao" | "comparecimento" | "vencedor";

const METRICAS: { id: Metrica; label: string }[] = [
  { id: "abstencao", label: "Abstenção %" },
  { id: "comparecimento", label: "Comparecimento %" },
  { id: "vencedor", label: "Vencedor (Presidente)" },
];

export default function MapaCoropletico({
  municipalities,
}: {
  municipalities: Municipality[];
}) {
  const [metrica, setMetrica] = useState<Metrica>("abstencao");

  const porCod = useMemo(() => {
    const m = new Map<number, Municipality>();
    for (const mun of municipalities) m.set(Number(mun.ibge), mun);
    return m;
  }, [municipalities]);

  const style = (feature: any) => {
    const cod = Number(feature?.properties?.codarea);
    const mun = porCod.get(cod);
    let fill = "#27272a";
    if (mun) {
      if (metrica === "vencedor") {
        const w = winnerIn(mun.votos, 1);
        fill = partidoColor(w?.cand.partido);
      } else {
        const base = metrica === "abstencao" ? mun.abst : mun.comp;
        fill = corAbstencao(pct(base, mun.aptos));
      }
    }
    return { fillColor: fill, fillOpacity: 0.75, color: "#18181b", weight: 1 };
  };

  const onEach = (feature: any, layer: any) => {
    const cod = Number(feature?.properties?.codarea);
    const mun = porCod.get(cod);
    if (!mun) return;
    const w = winnerIn(mun.votos, 1);
    layer.bindTooltip(
      `<div>
        <p class="tp-titulo">${mun.nome}</p>
        <p class="tp-linha">${fmt(mun.aptos)} aptos · ${fmt(mun.secoes)} seções</p>
        <p class="tp-linha">Comparecimento: ${pct(mun.comp, mun.aptos).toFixed(1)}%</p>
        <p class="tp-linha">Abstenção: <b>${pct(mun.abst, mun.aptos).toFixed(1)}%</b> (${fmt(mun.abst)})</p>
        <p class="tp-linha">Presidente: ${w ? `${w.cand.nome} (${w.cand.partido ?? "–"}) · ${w.pctValidos.toFixed(1)}% dos válidos` : "—"}</p>
      </div>`,
      { className: "tooltip-padrao" }
    );
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {METRICAS.map((mtr) => (
          <button
            key={mtr.id}
            onClick={() => setMetrica(mtr.id)}
            className={`rounded-lg border px-3 py-1.5 text-xs ${
              metrica === mtr.id
                ? "border-zinc-500 bg-zinc-700 text-zinc-100"
                : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {mtr.label}
          </button>
        ))}
        {metrica !== "vencedor" ? (
          <span className="ml-auto flex items-center gap-3 text-xs text-zinc-400">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-green-400" /> &lt;16%
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-yellow-400" /> 16–20%
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-orange-500" /> 20–25%
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-red-600" /> ≥25%
            </span>
          </span>
        ) : (
          <span className="ml-auto flex items-center gap-3 text-xs text-zinc-400">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-blue-700" /> PL
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-red-500" /> PT
            </span>
          </span>
        )}
      </div>
      <MapContainer
        center={[-27.2, -50.5]}
        zoom={7}
        minZoom={6}
        maxZoom={12}
        scrollWheelZoom
        className="h-[560px] w-full rounded-xl border border-zinc-700"
        style={{ background: "#0b1220" }}
      >
        <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} />
        <GeoJSON
          key={metrica}
          data={geojson as any}
          style={style as any}
          onEachFeature={onEach}
        />
      </MapContainer>
    </div>
  );
}
