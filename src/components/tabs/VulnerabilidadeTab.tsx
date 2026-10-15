"use client";

import { useMemo, useState } from "react";
import ComboBox from "@/components/ui/ComboBox";
import { bairrosSocio, data, data2022, fmt } from "@/lib/data";
import { slug } from "@/lib/download";
import { axisStyle, ChartPanel, ExportMenu } from "@/lib/ui";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/** indicadores censitarios disponiveis (Censo 2022, por bairro oficial IBGE) */
const INDICADORES = [
  { id: "pct_alfabetizadas_15", nome: "Alfabetização 15+ (%)", invertido: true },
  { id: "pct_esgoto_rede", nome: "Esgoto em rede (%)", invertido: true },
  { id: "pct_60_mais", nome: "População 60+ (%)", invertido: false },
  { id: "pct_0_14", nome: "População 0–14 (%)", invertido: false },
  { id: "densidade", nome: "Densidade (hab/km²)", invertido: false },
  { id: "populacao", nome: "População (Censo)", invertido: false },
] as const;

type IdIndicador = (typeof INDICADORES)[number]["id"];

const TOP_N = 15;

interface Registro {
  ibge: number;
  municipio: string;
  bairro: string;
  indicador: number;
  abstencao: number;
  aptos: number;
  cobertura: number | null;
  rotulo: string;
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

function truncarRotulo(v: string) {
  return v.length > 24 ? `${v.slice(0, 23)}…` : v;
}

export default function VulnerabilidadeTab() {
  const [munSel, setMunSel] = useState<string>(""); // "" = todos
  const [idX, setIdX] = useState<IdIndicador>("pct_alfabetizadas_15");
  const [anoAbst, setAnoAbst] = useState<"2026" | "2022">("2026");
  const [ordenarPor, setOrdenarPor] = useState<"indicador" | "abstencao">("indicador");

  const abst26 = useMemo(() => {
    const mapa = new Map<string, { aptos: number; pct: number }>();
    for (const b of data.bairros) {
      if (b.aptos > 0)
        mapa.set(`${b.ibge}|${b.bairro}`, { aptos: b.aptos, pct: (b.abst / b.aptos) * 100 });
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
  const nomeAbst =
    anoAbst === "2026" ? `Abstenção ${data.meta.ano} (%)` : `Abstenção ${data2022.meta.ano} (%)`;

  const rows = useMemo<Registro[]>(() => {
    const pts: Registro[] = [];
    for (const s of bairrosSocio) {
      if (munSel && String(s.ibge) !== munSel) continue;
      const ind = s[idX];
      if (ind == null) continue;
      let abst: number | null = null;
      let aptos = 0;
      if (anoAbst === "2026") {
        const v = abst26.get(`${s.ibge}|${s.bairro}`);
        if (v) {
          abst = v.pct;
          aptos = v.aptos;
        }
      } else {
        abst = abst22.get(`${s.ibge}|${s.bairro}`) ?? null;
      }
      if (abst == null) continue;
      pts.push({
        ibge: s.ibge,
        municipio: s.municipio,
        bairro: s.bairro,
        indicador: Number(ind),
        abstencao: Number(abst.toFixed(2)),
        aptos,
        cobertura: s.cobertura_pct,
        rotulo: `${s.bairro} · ${s.municipio}`,
      });
    }
    return pts;
  }, [munSel, idX, anoAbst, abst26, abst22]);

  const top = useMemo(() => {
    const dir = ordenarPor === "indicador" && indicadorX.invertido ? 1 : -1;
    const chave = ordenarPor === "indicador" ? "indicador" : "abstencao";
    return [...rows].sort((a, b) => dir * (a[chave] - b[chave])).slice(0, TOP_N);
  }, [rows, ordenarPor, indicadorX]);

  const r = useMemo(
    () => pearson(rows.map((p) => p.indicador), rows.map((p) => p.abstencao)),
    [rows]
  );

  const dadosExport = () => ({
    nome: `votacao-sc-vulnerabilidade-${idX}-abstencao-${anoAbst}${munSel ? `-${slug(rows[0]?.municipio ?? "")}` : ""}`,
    titulo: `${indicadorX.nome} × ${nomeAbst} (Censo 2022 × votação)`,
    linhas: rows.map((p) => ({
      municipio: p.municipio,
      bairro: p.bairro,
      [indicadorX.nome]: p.indicador,
      [nomeAbst]: p.abstencao,
      aptos_2026: p.aptos,
      cobertura_cruzamento_pct: p.cobertura ?? "",
    })),
  });

  const fmtIndicador = (v: number) =>
    idX === "populacao" || idX === "densidade" ? fmt(v) : String(v);

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
              Indicador: {i.nome}
            </option>
          ))}
        </select>
        <select
          value={anoAbst}
          onChange={(e) => setAnoAbst(e.target.value as "2026" | "2022")}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
        >
          <option value="2026">Abstenção: {data.meta.ano}</option>
          <option value="2022">Abstenção: {data2022.meta.ano}</option>
        </select>
        <select
          value={ordenarPor}
          onChange={(e) => setOrdenarPor(e.target.value as "indicador" | "abstencao")}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
        >
          <option value="indicador">
            Ordenar por: indicador{indicadorX.invertido ? " (menor = mais vulnerável)" : ""}
          </option>
          <option value="abstencao">Ordenar por: abstenção</option>
        </select>
        <span className="text-xs text-slate-400">
          {rows.length} bairros · exibindo top {Math.min(TOP_N, rows.length)}
        </span>
        <div className="ml-auto">
          <ExportMenu getDados={dadosExport} />
        </div>
      </div>

      <ChartPanel
        titulo={`${indicadorX.nome} × ${nomeAbst}`}
        descricao={
          (r != null
            ? `Correlação de Pearson sobre os ${rows.length} bairros filtrados: r = ${r.toFixed(2)} (${forca(r)}). `
            : "") +
          (indicadorX.invertido
            ? "Nos indicadores marcados, valores menores indicam mais vulnerabilidade."
            : "")
        }
      >
        {top.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-500">
            Nenhum bairro encontrado com os filtros atuais.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={520}>
            <ComposedChart data={top} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
              <CartesianGrid stroke="#1e293b" />
              <XAxis
                dataKey="rotulo"
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                tickFormatter={truncarRotulo}
                angle={-35}
                textAnchor="end"
                interval={0}
                height={110}
              />
              <YAxis
                yAxisId="ind"
                tick={axisStyle}
                domain={[0, "auto"]}
                tickFormatter={fmtIndicador}
              />
              <YAxis
                yAxisId="abs"
                orientation="right"
                tick={axisStyle}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as Registro;
                  return (
                    <div className="rounded-lg border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs shadow-xl">
                      <p className="mb-1 font-semibold text-slate-100">
                        {p.bairro} <span className="font-normal text-slate-400">· {p.municipio}</span>
                      </p>
                      <p className="text-slate-300">
                        {indicadorX.nome}: <b>{fmtIndicador(p.indicador)}</b>
                      </p>
                      <p className="text-slate-300">
                        {nomeAbst}: <b>{p.abstencao.toFixed(1)}%</b>
                      </p>
                      {p.aptos > 0 && <p className="text-slate-400">aptos 2026: {fmt(p.aptos)}</p>}
                      {p.cobertura != null && (
                        <p className="text-slate-500">cobertura do cruzamento: {p.cobertura}%</p>
                      )}
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
              <Bar
                yAxisId="ind"
                dataKey="indicador"
                name={indicadorX.nome}
                fill="#38bdf8"
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
                maxBarSize={30}
              />
              <Bar
                yAxisId="abs"
                dataKey="abstencao"
                name={nomeAbst}
                fill="#f87171"
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
                maxBarSize={30}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </ChartPanel>

      <p className="text-xs text-slate-500">
        Fontes: Censo Demográfico 2022 (IBGE) por bairro oficial, associado aos bairros eleitorais por
        cruzamento espacial; votação e abstenções de boletins de urna (TSE). Aparecem apenas bairros
        de municípios com bairros oficiais cadastrados no IBGE. A correlação não implica causalidade.
      </p>
    </div>
  );
}
