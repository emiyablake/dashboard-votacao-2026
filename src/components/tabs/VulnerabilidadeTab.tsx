"use client";

import { useMemo, useState } from "react";
import ComboBox from "@/components/ui/ComboBox";
import {
  bairrosSocio,
  data,
  data2022,
  fmt,
} from "@/lib/data";
import { slug } from "@/lib/download";
import { axisStyle, ChartPanel, ExportMenu, tooltipProps } from "@/lib/ui";
import {
  CartesianGrid,
  Cell,
  Line,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/** eixo X: indicadores censitarios disponiveis */
const INDICADORES = [
  { id: "pct_alfabetizadas_15", nome: "Alfabetização 15+ (%)", invertido: true },
  { id: "pct_esgoto_rede", nome: "Esgoto em rede (%)", invertido: true },
  { id: "pct_60_mais", nome: "População 60+ (%)", invertido: false },
  { id: "pct_0_14", nome: "População 0–14 (%)", invertido: false },
  { id: "densidade", nome: "Densidade (hab/km²)", invertido: false },
  { id: "populacao", nome: "População (Censo)", invertido: false },
] as const;

type IdIndicador = (typeof INDICADORES)[number]["id"];

interface Ponto {
  ibge: number;
  municipio: string;
  bairro: string;
  x: number;
  y: number;
  aptos: number;
  cobertura: number | null;
  cor: string;
}

function corMun(nome: string) {
  let h = 0;
  for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) % 360;
  return `hsl(${h}, 65%, 58%)`;
}

function pearson(xs: number[], ys: number[]) {
  const n = xs.length;
  if (n < 3) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const ax = xs[i] - mx, ay = ys[i] - my;
    num += ax * ay;
    dx += ax * ax;
    dy += ay * ay;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? null : num / den;
}

function forca(r: number): string {
  const a = Math.abs(r);
  return a >= 0.7 ? "forte" : a >= 0.4 ? "moderada" : a >= 0.2 ? "fraca" : "muito fraca";
}

export default function VulnerabilidadeTab() {
  const [munSel, setMunSel] = useState<string>(""); // "" = todos
  const [idX, setIdX] = useState<IdIndicador>("pct_alfabetizadas_15");
  const [idY, setIdY] = useState<string>("abst26");

  // candidatos a presidente 2026 com representatividade estadual
  const candidatos = useMemo(() => {
    const { validos } = (() => {
      const rows = data.cargoTotals.filter((t) => t.cdCargo === 1);
      const get = (tipo: string) => rows.find((r) => r.tipo === tipo)?.total ?? 0;
      return { validos: get("Nominal") + get("Legenda") };
    })();
    return data.candidates
      .filter((c) => c.cdCargo === 1 && c.tipo === "Nominal" && validos > 0 && (c.total / validos) * 100 >= 0.5)
      .sort((a, b) => b.total - a.total);
  }, []);

  // votos por bairro (2026) para % validos dos candidatos
  const votosBairro = useMemo(() => {
    const mapa = new Map<string, { aptos: number; abst: number; validos: number; porCand: Map<number, number> }>();
    for (const b of data.bairros) {
      let validos = 0;
      const porCand = new Map<number, number>();
      for (const v of b.votos) {
        if (v.c !== 1) continue;
        validos += v.n;
        porCand.set(v.v, v.n);
      }
      mapa.set(`${b.ibge}|${b.bairro}`, { aptos: b.aptos, abst: b.abst, validos, porCand });
    }
    return mapa;
  }, []);

  const abst22 = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const b of data2022.bairros) {
      if (b.aptos > 0) mapa.set(`${b.ibge}|${b.bairro}`, (b.abst / b.aptos) * 100);
    }
    return mapa;
  }, []);

  const muns = useMemo(() => {
    const vistos = new Map<number, string>();
    for (const b of bairrosSocio) vistos.set(b.ibge, b.municipio);
    return [...vistos.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value: String(value), label }));
  }, []);

  const indicadorX = INDICADORES.find((i) => i.id === idX)!;
  const nomeY =
    idY === "abst26"
      ? `Abstenção ${data.meta.ano} (%)`
      : idY === "abst22"
      ? `Abstenção ${data2022.meta.ano} (%)`
      : `% válidos — ${candidatos.find((c) => `cand:${c.id}` === idY)?.nome ?? "candidato"}`;

  const pontos = useMemo<Ponto[]>(() => {
    const pts: Ponto[] = [];
    for (const s of bairrosSocio) {
      if (munSel && String(s.ibge) !== munSel) continue;
      const x = s[idX];
      if (x == null) continue;
      let y: number | null = null;
      if (idY === "abst26") {
        const v = votosBairro.get(`${s.ibge}|${s.bairro}`);
        if (v && v.aptos > 0) y = (v.abst / v.aptos) * 100;
      } else if (idY === "abst22") {
        y = abst22.get(`${s.ibge}|${s.bairro}`) ?? null;
      } else {
        const candId = Number(idY.split(":")[1]);
        const v = votosBairro.get(`${s.ibge}|${s.bairro}`);
        if (v && v.validos > 0) y = ((v.porCand.get(candId) ?? 0) / v.validos) * 100;
      }
      if (y == null) continue;
      pts.push({
        ibge: s.ibge,
        municipio: s.municipio,
        bairro: s.bairro,
        x: Number(x),
        y: Number(y.toFixed(2)),
        aptos: votosBairro.get(`${s.ibge}|${s.bairro}`)?.aptos ?? 0,
        cobertura: s.cobertura_pct,
        cor: corMun(s.municipio),
      });
    }
    return pts;
  }, [munSel, idX, idY, votosBairro, abst22]);

  const r = useMemo(
    () => pearson(pontos.map((p) => p.x), pontos.map((p) => p.y)),
    [pontos]
  );

  const linhaTendencia = useMemo(() => {
    if (pontos.length < 3) return [];
    const xs = pontos.map((p) => p.x);
    const ys = pontos.map((p) => p.y);
    const n = xs.length;
    const mx = xs.reduce((a, b) => a + b, 0) / n;
    const my = ys.reduce((a, b) => a + b, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      num += (xs[i] - mx) * (ys[i] - my);
      den += (xs[i] - mx) ** 2;
    }
    if (den === 0) return [];
    const a = num / den, b0 = my - a * mx;
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    return [
      { x: minX, y: Number((a * minX + b0).toFixed(2)) },
      { x: maxX, y: Number((a * maxX + b0).toFixed(2)) },
    ];
  }, [pontos]);

  const dadosExport = () => ({
    nome: `votacao-sc-vulnerabilidade-${idX}-${slug(idY)}${munSel ? `-${slug(pontos[0]?.municipio ?? "")}` : ""}`,
    titulo: `${indicadorX.nome} × ${nomeY} (Censo 2022 × votação)`,
    linhas: pontos.map((p) => ({
      municipio: p.municipio,
      bairro: p.bairro,
      [indicadorX.nome]: p.x,
      [nomeY]: p.y,
      aptos_2026: p.aptos,
      cobertura_cruzamento_pct: p.cobertura ?? "",
    })),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <ComboBox
          value={munSel}
          onChange={(v) => setMunSel(String(v))}
          options={muns}
          placeholder="Todos os municípios (com bairros oficiais)…"
          width="w-72"
        />
        <select
          value={idX}
          onChange={(e) => setIdX(e.target.value as IdIndicador)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
        >
          {INDICADORES.map((i) => (
            <option key={i.id} value={i.id}>
              X: {i.nome}
            </option>
          ))}
        </select>
        <select
          value={idY}
          onChange={(e) => setIdY(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
        >
          <option value="abst26">Y: Abstenção {data.meta.ano} (%)</option>
          <option value="abst22">Y: Abstenção {data2022.meta.ano} (%)</option>
          {candidatos.map((c) => (
            <option key={c.id} value={`cand:${c.id}`}>
              Y: % válidos — {c.nome} ({data.meta.ano})
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-400">{pontos.length} bairros</span>
        <div className="ml-auto">
          <ExportMenu getDados={dadosExport} />
        </div>
      </div>

      <ChartPanel
        titulo={`${indicadorX.nome} × ${nomeY}`}
        descricao={
          r != null
            ? `Cada bolha é um bairro (cor = município; passe o mouse para ver aptos e cobertura). Correlação de Pearson: r = ${r.toFixed(2)} (${forca(r)}${indicadorX.invertido && r > 0 ? " — lembre que menor valor do indicador = mais vulnerabilidade" : ""}).`
            : "Cada bolha é um bairro (cor = município; passe o mouse para ver aptos e cobertura)."
        }
      >
        <ResponsiveContainer width="100%" height={520}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid stroke="#1e293b" />
            <XAxis
              type="number"
              dataKey="x"
              name={indicadorX.nome}
              tick={axisStyle}
              domain={["auto", "auto"]}
              tickFormatter={(v) => (idX === "populacao" || idX === "densidade" ? fmt(v) : String(v))}
            />
            <YAxis type="number" dataKey="y" name={nomeY} tick={axisStyle} domain={["auto", "auto"]} />
            <Tooltip
              {...tooltipProps}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as Ponto;
                return (
                  <div className="rounded-lg border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs shadow-xl">
                    <p className="mb-1 font-semibold text-slate-100">
                      {p.bairro} <span className="font-normal text-slate-400">· {p.municipio}</span>
                    </p>
                    <p className="text-slate-300">
                      {indicadorX.nome}: <b>{fmt(p.x)}</b>
                    </p>
                    <p className="text-slate-300">
                      {nomeY}: <b>{p.y.toFixed(1)}%</b>
                    </p>
                    <p className="text-slate-400">aptos 2026: {fmt(p.aptos)}</p>
                    {p.cobertura != null && (
                      <p className="text-slate-500">cobertura do cruzamento: {p.cobertura}%</p>
                    )}
                  </div>
                );
              }}
            />
            {linhaTendencia.length === 2 && (
              <Line
                data={linhaTendencia}
                dataKey="y"
                stroke="#64748b"
                strokeDasharray="5 5"
                dot={false}
                isAnimationActive={false}
              />
            )}
            <Scatter data={pontos} isAnimationActive={false}>
              {pontos.map((p) => (
                <Cell key={`${p.ibge}|${p.bairro}`} fill={p.cor} fillOpacity={0.75} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </ChartPanel>

      <p className="text-xs text-slate-500">
        Fontes: Censo Demográfico 2022 (IBGE) por bairro oficial, associado aos bairros eleitorais por
        cruzamento espacial; votação e abstenções de boletins de urna (TSE). Aparecem apenas bairros
        de municípios com bairros oficiais cadastrados no IBGE. A correlação não implica causalidade.
      </p>
    </div>
  );
}
