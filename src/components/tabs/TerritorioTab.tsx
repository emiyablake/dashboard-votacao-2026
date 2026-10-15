"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
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
import {
  data,
  data2022,
  economia,
  economiaPorIbge,
  fmt,
  pct,
  socio,
  winnerInOf,
} from "@/lib/data";
import { axisStyle, Card, ChartPanel, ExportMenu } from "@/lib/ui";
import { EconomiaMun, Municipality, VotacaoData } from "@/types";

// mapas Leaflet precisam de ssr desabilitado (window nao existe no servidor)
const MapaGeografiaEconomica = dynamic(
  () => import("@/components/MapaTerritorio").then((m) => m.MapaGeografiaEconomica),
  { ssr: false }
);
const MapaInfraestrutura = dynamic(
  () => import("@/components/MapaTerritorio").then((m) => m.MapaInfraestrutura),
  { ssr: false }
);

/** setores economicos (CNAE) usados para classificar a geografia economica */
const SETORES = [
  { id: "agro", nome: "Agropecuária", campo: "pct_agro", cor: "#4ade80" },
  { id: "industria", nome: "Indústria", campo: "pct_industria", cor: "#f59e0b" },
  { id: "construcao", nome: "Construção", campo: "pct_construcao", cor: "#facc15" },
  { id: "comercio", nome: "Comércio", campo: "pct_comercio", cor: "#f472b6" },
  { id: "servicos", nome: "Serviços", campo: "pct_servicos", cor: "#a78bfa" },
];

type Setor = (typeof SETORES)[number];

const INDICADORES_ESTADO = [
  { id: "pct_esgoto_rede", nome: "Esgoto a rede" },
  { id: "pct_agua_rede", nome: "Água encanada" },
  { id: "pct_lixo_coletado", nome: "Lixo coletado" },
] as const;

type IdIndicador = (typeof INDICADORES_ESTADO)[number]["id"];

const COR_PL = "#1d4ed8";
const COR_PT = "#ef4444";
const COR_ABST = "#a1a1aa"; // cinza padrao da abstencao nos graficos

/** perfil economico de um municipio = setor com maior share dos vínculos formais */
function perfilDe(e: EconomiaMun | undefined): Setor | null {
  if (!e || !e.vinculos) return null;
  // regra de relevancia: agro >= 15% dos vínculos formais já caracteriza o perfil
  // (senão o argmax esconde o agro: serviços/comércio formal superam o rural no RAIS)
  if ((e.pct_agro ?? 0) >= 15) return SETORES[0];
  let best: Setor | null = null;
  let bv = 0;
  for (const s of SETORES.slice(1)) {
    const v = e[s.campo as keyof EconomiaMun] as number | null;
    if (v != null && v > bv) {
      bv = v;
      best = s;
    }
  }
  return best;
}

interface GrupoAgg {
  nome: string;
  muns: number;
  aptos: number;
  abst: number;
  pl: number;
  pt: number;
  validos: number;
}

/** agrega municipios por chave, com votos PL/PT (presidente) e abstenção ponderados */
function agrega(
  d: VotacaoData,
  chave: (m: Municipality) => string
): Map<string, GrupoAgg> {
  const cands = new Map(
    d.candidates
      .filter((c) => c.cdCargo === 1 && (c.tipo === "Nominal" || c.tipo === "Legenda"))
      .map((c) => [c.id, c])
  );
  const grupos = new Map<string, GrupoAgg>();
  for (const m of d.municipalities) {
    const k = chave(m);
    let g = grupos.get(k);
    if (!g) {
      g = { nome: k, muns: 0, aptos: 0, abst: 0, pl: 0, pt: 0, validos: 0 };
      grupos.set(k, g);
    }
    g.muns += 1;
    g.aptos += m.aptos;
    g.abst += m.abst;
    for (const v of m.votos) {
      if (v.c !== 1) continue;
      const cand = cands.get(v.v);
      if (!cand) continue; // brancos/nulos ficam fora do denominador de válidos
      g.validos += v.n;
      if (cand.tipo === "Nominal" && cand.partido === "PL") g.pl += v.n;
      else if (cand.tipo === "Nominal" && cand.partido === "PT") g.pt += v.n;
    }
  }
  return grupos;
}

const paraBarras = (g: GrupoAgg) => ({
  nome: g.nome,
  muns: g.muns,
  abstencao: Number(pct(g.abst, g.aptos).toFixed(1)),
  pl: Number(pct(g.pl, g.validos).toFixed(1)),
  pt: Number(pct(g.pt, g.validos).toFixed(1)),
});

export default function TerritorioTab() {
  const [ano, setAno] = useState<"2026" | "2022">("2026");
  const [idInd, setIdInd] = useState<IdIndicador>("pct_esgoto_rede");

  const votacao = ano === "2026" ? data : data2022;

  // ibge -> setor predominante
  const perfis = useMemo(() => {
    const m = new Map<number, Setor | null>();
    for (const e of economia) m.set(e.ibge, perfilDe(e));
    return m;
  }, []);

  // ---------- bloco 1: geografia economica ----------
  const porPerfil = useMemo(() => {
    const grupos = agrega(votacao, (m) => perfis.get(m.ibge)?.nome ?? "Sem dados RAIS");
    return [...SETORES.map((s) => s.nome), "Sem dados RAIS"]
      .map((nome) => grupos.get(nome))
      .filter((g): g is GrupoAgg => !!g)
      .map(paraBarras);
  }, [votacao, perfis]);

  // ---------- bloco 2: onde o Estado chega ----------
  const indicador = INDICADORES_ESTADO.find((i) => i.id === idInd)!;

  const quartis = useMemo(() => {
    const vals = socio
      .map((s) => s[idInd] as number | null)
      .filter((v): v is number => v != null)
      .sort((a, b) => a - b);
    if (vals.length === 0) return null;
    const q = (p: number) => vals[Math.floor(p * (vals.length - 1))];
    return { t1: q(0.25), t2: q(0.5), t3: q(0.75) };
  }, [idInd]);

  const quartilDe = (v: number | null): number =>
    v == null || !quartis ? 0 : v <= quartis.t1 ? 1 : v <= quartis.t2 ? 2 : v <= quartis.t3 ? 3 : 4;

  const rotuloQuartil = (k: number) =>
    !quartis
      ? "—"
      : k === 1
      ? `Q1 · até ${quartis.t1.toFixed(0)}%`
      : k === 2
      ? `Q2 · ${quartis.t1.toFixed(0)}–${quartis.t2.toFixed(0)}%`
      : k === 3
      ? `Q3 · ${quartis.t2.toFixed(0)}–${quartis.t3.toFixed(0)}%`
      : `Q4 · acima de ${quartis.t3.toFixed(0)}%`;

  const socioPorIbgeMap = useMemo(() => new Map(socio.map((s) => [s.ibge, s])), []);

  const porQuartil = useMemo(() => {
    const grupos = agrega(votacao, (m) => {
      const s = socioPorIbgeMap.get(String(m.ibge));
      const k = quartilDe((s?.[idInd] as number | null) ?? null);
      return k === 0 ? "Sem dados Censo" : rotuloQuartil(k);
    });
    return [...grupos.values()]
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map(paraBarras);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [votacao, socioPorIbgeMap, idInd, quartis]);

  // ---------- KPIs ----------
  const kpisEco = useMemo(() => {
    const grupos = agrega(votacao, (m) => perfis.get(m.ibge)?.nome ?? "Sem dados RAIS");
    let maior: GrupoAgg | null = null;
    let agro: GrupoAgg | null = null;
    for (const g of grupos.values()) {
      if (!maior || g.muns > maior.muns) maior = g;
      if (g.nome === "Agropecuária") agro = g;
    }
    const vinculos = economia.reduce((a, e) => a + (e.vinculos ?? 0), 0);
    const aptos = votacao.municipalities.reduce((a, m) => a + m.aptos, 0);
    const abst = votacao.municipalities.reduce((a, m) => a + m.abst, 0);
    return {
      maior,
      agroMuns: agro?.muns ?? 0,
      vinculos,
      abstEstadual: pct(abst, aptos),
    };
  }, [votacao, perfis]);

  const kpisInfra = useMemo(() => {
    const coberturas = socio
      .map((s) => s[idInd] as number | null)
      .filter((v): v is number => v != null)
      .sort((a, b) => a - b);
    const mediana = coberturas.length ? coberturas[Math.floor(coberturas.length / 2)] : null;
    let pior: { nome: string; v: number } | null = null;
    for (const s of socio) {
      const v = s[idInd] as number | null;
      if (v != null && (!pior || v < pior.v)) pior = { nome: s.nome, v };
    }
    const abstQ1 = porQuartil.find((q) => q.nome.startsWith("Q1"))?.abstencao;
    const abstQ4 = porQuartil.find((q) => q.nome.startsWith("Q4"))?.abstencao;
    return { mediana, pior, abstQ1, abstQ4 };
  }, [idInd, porQuartil]);

  // ---------- export ----------
  const dadosExport = () => {
    const cands = new Map(
      votacao.candidates
        .filter((c) => c.cdCargo === 1 && (c.tipo === "Nominal" || c.tipo === "Legenda"))
        .map((c) => [c.id, c])
    );
    const linhas = votacao.municipalities.map((m) => {
      const e = economiaPorIbge(m.ibge);
      const s = socioPorIbgeMap.get(String(m.ibge));
      const w = winnerInOf(votacao, m.votos, 1);
      let pl = 0, pt = 0, validos = 0;
      for (const v of m.votos) {
        if (v.c !== 1) continue;
        const cand = cands.get(v.v);
        if (!cand) continue;
        validos += v.n;
        if (cand.tipo === "Nominal" && cand.partido === "PL") pl += v.n;
        else if (cand.tipo === "Nominal" && cand.partido === "PT") pt += v.n;
      }
      const setor = perfis.get(m.ibge);
      return {
        municipio: m.nome,
        geografia_economica: setor?.nome ?? "",
        vinculos_formais_rais: e?.vinculos ?? "",
        salario_medio_rais: e?.salario_medio ?? "",
        [indicador.nome.toLowerCase().replaceAll(" ", "_") + "_censo2022_pct"]:
          (s?.[idInd] as number | null) ?? "",
        quartil_infraestrutura:
          quartilDe((s?.[idInd] as number | null) ?? null) || "",
        aptos: m.aptos,
        abstencao_pct: Number(pct(m.abst, m.aptos).toFixed(1)),
        vencedor_presidente: w?.cand.nome ?? "",
        partido_vencedor: w?.cand.partido ?? "",
        pct_validos_pl: Number(pct(pl, validos).toFixed(1)),
        pct_validos_pt: Number(pct(pt, validos).toFixed(1)),
      };
    });
    return {
      nome: `votacao-sc-territorio-${ano.toLowerCase()}`,
      titulo: `Território: geografia econômica e infraestrutura × votação ${ano}`,
      linhas,
    };
  };

  const selectCls =
    "rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm";

  const tooltipBarras = (
    <Tooltip
      content={({ active, payload }) => {
        if (!active || !payload?.length) return null;
        const p = payload[0].payload;
        return (
          <div className="tooltip-padrao">
            <p className="tp-titulo">{p.nome}</p>
            <p className="tp-linha">
              Abstenção: <b>{p.abstencao}%</b>
            </p>
            <p className="tp-linha">
              PL: <b>{p.pl}%</b> dos válidos
            </p>
            <p className="tp-linha">
              PT: <b>{p.pt}%</b> dos válidos
            </p>
            <p className="tp-det">{p.muns} municípios</p>
          </div>
        );
      }}
    />
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select value={ano} onChange={(e) => setAno(e.target.value as "2026" | "2022")} className={selectCls}>
          <option value="2026">Votação: {data.meta.ano}</option>
          <option value="2022">Votação: {data2022.meta.ano}</option>
        </select>
        <div className="ml-auto">
          <ExportMenu getDados={dadosExport} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card
          title="Geografia dominante"
          value={kpisEco.maior?.nome ?? "—"}
          sub={`${kpisEco.maior?.muns ?? 0} de 295 municípios (RAIS 2025)`}
        />
        <Card
          title="Perfil Agropecuária"
          value={`${kpisEco.agroMuns} municípios`}
          sub="agro ≥ 15% dos vínculos formais"
        />
        <Card
          title="Vínculos formais no estado"
          value={fmt(kpisEco.vinculos)}
          sub="RAIS/MTE 2025"
        />
        <Card
          title={`Abstenção em ${ano}`}
          value={`${kpisEco.abstEstadual.toFixed(1)}%`}
          sub="média estadual, todos os municípios"
        />
      </div>

      {/* ---------- bloco 1: geografia economica ---------- */}
      <ChartPanel
        titulo="Geografia econômica de Santa Catarina"
        descricao="Municípios coloridos pelo setor predominante dos vínculos formais (RAIS 2025). Passe o mouse para ver o voto e a abstenção."
      >
        <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
          {SETORES.map((s) => (
            <span key={s.id} className="inline-flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm" style={{ background: s.cor }} />
              {s.nome}
            </span>
          ))}
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "#27272a" }} />
            Sem dados RAIS
          </span>
        </div>
        <MapaGeografiaEconomica
          votacao={votacao}
          ano={Number(ano)}
          perfis={perfis}
        />
      </ChartPanel>

      <ChartPanel
        titulo={`Como vota cada geografia econômica (${ano})`}
        descricao="Agregado ponderado pelos aptos de cada município. Barras: abstenção (% dos aptos) e votos válidos de PL e PT no cargo de presidente."
      >
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={porPerfil} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
            <CartesianGrid stroke="#27272a" />
            <XAxis dataKey="nome" tick={axisStyle} />
            <YAxis tick={axisStyle} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            {tooltipBarras}
            <Legend wrapperStyle={{ fontSize: 12, color: "#a1a1aa" }} />
            <Bar dataKey="abstencao" name="Abstenção (% aptos)" fill={COR_ABST} radius={[3, 3, 0, 0]} isAnimationActive={false} maxBarSize={36} />
            <Bar dataKey="pl" name={`PL (% válidos)`} fill={COR_PL} radius={[3, 3, 0, 0]} isAnimationActive={false} maxBarSize={36} />
            <Bar dataKey="pt" name={`PT (% válidos)`} fill={COR_PT} radius={[3, 3, 0, 0]} isAnimationActive={false} maxBarSize={36} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartPanel>

      {/* ---------- bloco 2: onde o Estado chega ---------- */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs text-zinc-400">Infraestrutura:</label>
        <select value={idInd} onChange={(e) => setIdInd(e.target.value as IdIndicador)} className={selectCls}>
          {INDICADORES_ESTADO.map((i) => (
            <option key={i.id} value={i.id}>
              {i.nome}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Card
          title={`${indicador.nome} mediano`}
          value={kpisInfra.mediana != null ? `${kpisInfra.mediana.toFixed(1)}%` : "—"}
          sub="mediana dos 295 municípios (Censo 2022)"
        />
        <Card
          title="Menor cobertura"
          value={kpisInfra.pior ? kpisInfra.pior.nome : "—"}
          sub={kpisInfra.pior ? `${kpisInfra.pior.v.toFixed(1)}% dos domicílios` : ""}
        />
        <Card
          title="Abstenção Q1 × Q4"
          value={
            kpisInfra.abstQ1 != null && kpisInfra.abstQ4 != null
              ? `${kpisInfra.abstQ1.toFixed(1)}% × ${kpisInfra.abstQ4.toFixed(1)}%`
              : "—"
          }
          sub="quartil menos atendido × mais atendido"
        />
      </div>
      <ChartPanel
        titulo={`Onde o Estado chega: ${indicador.nome}`}
        descricao="Municípios coloridos pela cobertura de infraestrutura básica (Censo 2022). Verde = alta cobertura; vermelho = baixa."
      >
        <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "#ef4444" }} /> &lt;25%
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "#fb923c" }} /> 25–50%
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "#facc15" }} /> 50–75%
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "#a3e635" }} /> 75–90%
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "#4ade80" }} /> ≥90%
          </span>
        </div>
        <MapaInfraestrutura
          votacao={votacao}
          ano={Number(ano)}
          idInd={idInd}
          indicadorNome={indicador.nome}
          socioPorIbgeMap={socioPorIbgeMap}
        />
      </ChartPanel>

      <ChartPanel
        titulo={`Voto e abstenção por quartil de ${indicador.nome} (${ano})`}
        descricao="Municípios divididos em 4 grupos de igual tamanho pelo indicador de infraestrutura. Q1 = menor cobertura (mais vulnerável), Q4 = maior."
      >
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={porQuartil} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
            <CartesianGrid stroke="#27272a" />
            <XAxis dataKey="nome" tick={{ ...axisStyle, fontSize: 11 }} />
            <YAxis tick={axisStyle} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            {tooltipBarras}
            <Legend wrapperStyle={{ fontSize: 12, color: "#a1a1aa" }} />
            <Bar dataKey="abstencao" name="Abstenção (% aptos)" fill={COR_ABST} radius={[3, 3, 0, 0]} isAnimationActive={false} maxBarSize={36} />
            <Bar dataKey="pl" name="PL (% válidos)" fill={COR_PL} radius={[3, 3, 0, 0]} isAnimationActive={false} maxBarSize={36} />
            <Bar dataKey="pt" name="PT (% válidos)" fill={COR_PT} radius={[3, 3, 0, 0]} isAnimationActive={false} maxBarSize={36} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartPanel>

      <p className="text-xs text-zinc-500">
        Geografia econômica: vínculos formais de emprego (RAIS/MTE 2025). Um município é classificado
        como Agropecuária quando o agro representa ao menos 15% dos vínculos; caso contrário, vale o
        setor de maior participação entre indústria, construção, comércio e serviços. Atenção: o RAIS
        sub-representa o trabalho rural (diarismo e informalidade não geram vínculos), então a
        geografia econômica aqui é a dos empregos formais. Infraestrutura: Censo Demográfico 2022
        (IBGE), % de domicílios com o serviço. Votação: boletins de urna (TSE). Agregados territoriais
        não representam comportamento individual.
      </p>
    </div>
  );
}
