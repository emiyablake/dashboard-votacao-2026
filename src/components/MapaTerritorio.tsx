/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import geojson from "@/data/sc.json";
import { economiaPorIbge, fmt, pct, winnerInOf } from "@/lib/data";
import { TILE_ATTRIBUTION, TILE_URL } from "@/lib/map";
import { Municipality, SocioMun, VotacaoData } from "@/types";

export interface SetorInfo {
  id: string;
  nome: string;
  campo: string;
  cor: string;
}

const SEM_DADOS = "#27272a";

/** escala: quanto maior a cobertura, mais verde; menor, mais vermelho */
function corPresenca(p: number): string {
  if (p >= 90) return "#4ade80";
  if (p >= 75) return "#a3e635";
  if (p >= 50) return "#facc15";
  if (p >= 25) return "#fb923c";
  return "#ef4444";
}

function tooltipMun(votacao: VotacaoData, ano: number, m: Municipality, extra: string) {
  const e = economiaPorIbge(m.ibge);
  const w = winnerInOf(votacao, m.votos, 1);
  const partes = [
    `<p class="tp-titulo">${m.nome}</p>`,
    extra,
    `<p class="tp-linha">Abstenção: <b>${pct(m.abst, m.aptos).toFixed(1)}%</b> (${fmt(m.abst)})</p>`,
    `<p class="tp-linha">Presidente ${ano}: ${
      w ? `${w.cand.nome} (${w.cand.partido ?? "–"}) · ${w.pctValidos.toFixed(1)}% dos válidos` : "—"
    }</p>`,
  ];
  if (e)
    partes.push(
      `<p class="tp-det">Vínculos formais: ${fmt(e.vinculos ?? 0)} · salário médio R$ ${fmt(
        Math.round(e.salario_medio ?? 0)
      )}</p>`
    );
  return partes.join("");
}

/** mapa da geografia economica: municipios coloridos pelo setor predominante (RAIS) */
export function MapaGeografiaEconomica({
  votacao,
  ano,
  perfis,
}: {
  votacao: VotacaoData;
  ano: number;
  perfis: Map<number, SetorInfo | null>;
}) {
  return (
    <MapContainer
      center={[-27.2, -50.5]}
      zoom={7}
      minZoom={6}
      maxZoom={12}
      scrollWheelZoom
      className="h-[480px] w-full rounded-xl border border-zinc-700"
      style={{ background: "#0a0a0a" }}
    >
      <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} />
      <GeoJSON
        key={ano}
        data={geojson as any}
        style={(f: any) => {
          const cod = Number(f?.properties?.codarea);
          return {
            fillColor: perfis.get(cod)?.cor ?? SEM_DADOS,
            fillOpacity: 0.75,
            color: "#18181b",
            weight: 1,
          };
        }}
        onEachFeature={(f: any, layer: any) => {
          const cod = Number(f?.properties?.codarea);
          const mun = votacao.municipalities.find((m) => m.ibge === cod);
          if (!mun) return;
          const setor = perfis.get(cod);
          const e = economiaPorIbge(cod);
          layer.bindTooltip(
            tooltipMun(
              votacao,
              ano,
              mun,
              setor
                ? `<p class="tp-linha">Setor predominante: <b>${setor.nome}</b> (${
                    e ? (e[setor.campo as keyof typeof e] as number)?.toFixed(1) : "—"
                  }% dos vínculos)</p>`
                : `<p class="tp-det">Sem dados de vínculos formais</p>`
            ),
            { className: "tooltip-padrao" }
          );
        }}
      />
    </MapContainer>
  );
}

/** mapa da infraestrutura: municipios coloridos pela cobertura do indicador (Censo) */
export function MapaInfraestrutura({
  votacao,
  ano,
  idInd,
  indicadorNome,
  socioPorIbgeMap,
}: {
  votacao: VotacaoData;
  ano: number;
  idInd: string;
  indicadorNome: string;
  socioPorIbgeMap: Map<string, SocioMun>;
}) {
  const valorDe = (cod: number): number | null =>
    (socioPorIbgeMap.get(String(cod))?.[idInd as keyof SocioMun] as number | null) ?? null;

  return (
    <MapContainer
      center={[-27.2, -50.5]}
      zoom={7}
      minZoom={6}
      maxZoom={12}
      scrollWheelZoom
      className="h-[480px] w-full rounded-xl border border-zinc-700"
      style={{ background: "#0a0a0a" }}
    >
      <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} />
      <GeoJSON
        key={idInd + ano}
        data={geojson as any}
        style={(f: any) => {
          const v = valorDe(Number(f?.properties?.codarea));
          return {
            fillColor: v == null ? SEM_DADOS : corPresenca(v),
            fillOpacity: 0.75,
            color: "#18181b",
            weight: 1,
          };
        }}
        onEachFeature={(f: any, layer: any) => {
          const cod = Number(f?.properties?.codarea);
          const mun = votacao.municipalities.find((m) => m.ibge === cod);
          if (!mun) return;
          const v = valorDe(cod);
          layer.bindTooltip(
            tooltipMun(
              votacao,
              ano,
              mun,
              v == null
                ? `<p class="tp-det">Sem dados de ${indicadorNome}</p>`
                : `<p class="tp-linha">${indicadorNome}: <b>${v.toFixed(1)}%</b> dos domicílios</p>`
            ),
            { className: "tooltip-padrao" }
          );
        }}
      />
    </MapContainer>
  );
}
