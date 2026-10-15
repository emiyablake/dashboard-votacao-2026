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
import ComboBox from "@/components/ui/ComboBox";
import {
  data,
  data2022,
  economiaPorIbge,
  fmt,
  ocupacaoPorMun,
  ocupacoes,
  pct,
  winnerInOf,
} from "@/lib/data";
import { axisStyle, Card, ChartPanel, ExportMenu } from "@/lib/ui";
import { agregaVoto, paraBarras } from "@/lib/voto";

// mapa Leaflet precisa de ssr desabilitado (window nao existe no servidor)
const MapaOcupacao = dynamic(
  () => import("@/components/MapaTerritorio").then((m) => m.MapaOcupacao),
  { ssr: false }
);

const COR_ABST = "#a1a1aa"; // cinza padrao da abstencao
const COR_PL = "#1d4ed8";
const COR_PT = "#ef4444";
const COR_SHARE = "#a78bfa";

interface Detalhe {
  n: number;
  sal: number | null;
  share: number;
}

export default function OcupacoesTab() {
  // vendedor de comércio varejista como exemplo inicial
  const [oi, setOi] = useState(() => Math.max(0, ocupacoes.findIndex((o) => o.cod === "5211-10")));
  const [ano, setAno] = useState<"2026" | "2022">("2026");

  const o = ocupacoes[oi];
  const votacao = ano === "2026" ? data : data2022;

  const nomeMun = useMemo(
    () => new Map(data.municipalities.map((m) => [m.ibge, m.nome])),
    []
  );

  const opcoes = useMemo(
    () =>
      ocupacoes.map((oc, i) => ({
        value: String(i),
        label: `${oc.nome} (${fmt(oc.n)})`,
      })),
    []
  );

  // municipio -> {n, sal, share} da ocupação selecionada
  const detalhes = useMemo(() => {
    const m = new Map<number, Detalhe>();
    for (const [ibge, celulas] of ocupacaoPorMun) {
      const c = celulas.get(oi);
      if (!c) continue;
      const vinc = economiaPorIbge(ibge)?.vinculos ?? 0;
      if (vinc <= 0) continue;
      m.set(ibge, { n: c.n, sal: c.sal, share: (c.n / vinc) * 100 });
    }
    return m;
  }, [oi]);

  // ---------- quartis de concentração ----------
  const quartis = useMemo(() => {
    const vals = [...detalhes.values()].map((d) => d.share).sort((a, b) => a - b);
    if (vals.length === 0) return null;
    const q = (p: number) => vals[Math.floor(p * (vals.length - 1))];
    return { t1: q(0.25), t2: q(0.5), t3: q(0.75) };
  }, [detalhes]);

  const quartilDe = (ibge: number): number => {
    const d = detalhes.get(ibge);
    if (!d || !quartis) return 0;
    const v = d.share;
    return v <= quartis.t1 ? 1 : v <= quartis.t2 ? 2 : v <= quartis.t3 ? 3 : 4;
  };

  const rotuloQuartil = (k: number) =>
    !quartis
      ? "—"
      : k === 1
      ? `Q1 · até ${quartis.t1.toFixed(1)}%`
      : k === 2
      ? `Q2 · ${quartis.t1.toFixed(1)}–${quartis.t2.toFixed(1)}%`
      : k === 3
      ? `Q3 · ${quartis.t2.toFixed(1)}–${quartis.t3.toFixed(1)}%`
      : `Q4 · acima de ${quartis.t3.toFixed(1)}%`;

  const porQuartil = useMemo(() => {
    const grupos = agregaVoto(votacao, (m) => {
      const k = quartilDe(m.ibge);
      return k === 0 ? "Sem a ocupação" : rotuloQuartil(k);
    });
    return [...grupos.values()]
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map(paraBarras);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [votacao, detalhes, quartis]);

  const top15 = useMemo(() => {
    return [...detalhes.entries()]
      .sort((a, b) => b[1].share - a[1].share)
      .slice(0, 15)
      .map(([ibge, d]) => ({
        nome: nomeMun.get(ibge) ?? String(ibge),
        share: Number(d.share.toFixed(2)),
        n: d.n,
        sal: d.sal,
      }));
  }, [detalhes, nomeMun]);

  const kpis = useMemo(() => {
    let maior: { nome: string; share: number } | null = null;
    for (const [ibge, d] of detalhes) {
      if (!maior || d.share > maior.share) maior = { nome: nomeMun.get(ibge) ?? "—", share: d.share };
    }
    const aptos = votacao.municipalities.reduce((a, m) => a + m.aptos, 0);
    const abst = votacao.municipalities.reduce((a, m) => a + m.abst, 0);
    return { maior, abstEstadual: pct(abst, aptos), presentes: detalhes.size };
  }, [detalhes, nomeMun, votacao]);

  const dadosExport = () => {
    const linhas = [...detalhes.entries()].map(([ibge, d]) => {
      const mun = votacao.municipalities.find((m) => m.ibge === ibge);
      const w = mun ? winnerInOf(votacao, mun.votos, 1) : null;
      return {
        municipio: nomeMun.get(ibge) ?? ibge,
        ocupacao: o.nome,
        cbo: o.cod,
        vinculos_ocupacao: d.n,
        participacao_pct: Number(d.share.toFixed(2)),
        salario_medio_ocupacao: d.sal ?? "",
        aptos: mun?.aptos ?? "",
        abstencao_pct: mun ? Number(pct(mun.abst, mun.aptos).toFixed(1)) : "",
        vencedor_presidente: w?.cand.nome ?? "",
        partido_vencedor: w?.cand.partido ?? "",
      };
    });
    return {
      nome: `votacao-sc-ocupacao-${o.cod.replace("-", "")}`,
      titulo: `Ocupação ${o.nome} (CBO ${o.cod}) por município × votação ${ano}`,
      linhas,
    };
  };

  const selectCls = "rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm";

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
        <label className="text-xs text-zinc-400">Ocupação:</label>
        <ComboBox
          value={String(oi)}
          onChange={(v) => setOi(Number(v))}
          options={opcoes}
          placeholder="Buscar ocupação (ex.: enfermeiro, pedreiro)…"
          width="w-96"
        />
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
          title="Vínculos no estado"
          value={fmt(o.n)}
          sub={`${o.nome} · CBO ${o.cod} (RAIS 2025)`}
        />
        <Card
          title="Municípios presentes"
          value={`${kpis.presentes} de 295`}
          sub="com ao menos 3 vínculos da ocupação"
        />
        <Card
          title="Maior concentração"
          value={kpis.maior?.nome ?? "—"}
          sub={kpis.maior ? `${kpis.maior.share.toFixed(1)}% dos vínculos formais do município` : ""}
        />
        <Card
          title={`Abstenção em ${ano}`}
          value={`${kpis.abstEstadual.toFixed(1)}%`}
          sub="média estadual, todos os municípios"
        />
      </div>

      <ChartPanel
        titulo={`Onde tem ${o.nome.toLowerCase()}`}
        descricao="Municípios coloridos pela participação da ocupação nos vínculos formais (RAIS 2025). Passe o mouse para ver salário da ocupação, voto e abstenção."
      >
        <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "#ede9fe" }} /> &lt;1%
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "#c4b5fd" }} /> 1–2%
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "#a78bfa" }} /> 2–5%
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "#8b5cf6" }} /> 5–10%
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "#7c3aed" }} /> ≥10%
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "#27272a" }} /> Sem vínculos
          </span>
        </div>
        <MapaOcupacao votacao={votacao} ano={Number(ano)} occNome={o.nome} detalhes={detalhes} />
      </ChartPanel>

      <ChartPanel
        titulo={`Top 15 municípios por participação de ${o.nome.toLowerCase()}`}
        descricao="Participação da ocupação nos vínculos formais de cada município. Passe o mouse para ver o número de vínculos e o salário médio."
      >
        <ResponsiveContainer width="100%" height={360}>
          <ComposedChart data={top15} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
            <CartesianGrid stroke="#27272a" />
            <XAxis dataKey="nome" tick={{ ...axisStyle, fontSize: 11 }} angle={-35} textAnchor="end" interval={0} height={110} />
            <YAxis tick={axisStyle} domain={[0, "auto"]} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload;
                return (
                  <div className="tooltip-padrao">
                    <p className="tp-titulo">{p.nome}</p>
                    <p className="tp-linha">
                      Participação: <b>{p.share}%</b> dos vínculos formais
                    </p>
                    <p className="tp-linha">
                      Vínculos: <b>{fmt(p.n)}</b>
                    </p>
                    {p.sal != null && (
                      <p className="tp-det">salário médio da ocupação: R$ {fmt(p.sal)}</p>
                    )}
                  </div>
                );
              }}
            />
            <Bar dataKey="share" name="Participação (%)" fill={COR_SHARE} radius={[3, 3, 0, 0]} isAnimationActive={false} maxBarSize={40} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel
        titulo={`Voto e abstenção por concentração de ${o.nome.toLowerCase()} (${ano})`}
        descricao="Municípios divididos em 4 grupos de igual tamanho pela participação da ocupação. Q1 = menor concentração, Q4 = maior. Municípios sem vínculos da ocupação ficam em grupo próprio."
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
        Fonte: RAIS/MTE 2025 (vínculos formais ativos, CBO 2002). O RAIS não captura trabalho informal,
        diarismo nem autônomos sem vínculo — ocupações com forte informalidade (domésticos, pedreiros,
        vendedores ambulantes) aparecem sub-representadas. Salário médio = salário de dezembro/2025.
        Votação: boletins de urna (TSE). Agregados territoriais não representam comportamento individual.
      </p>
    </div>
  );
}
