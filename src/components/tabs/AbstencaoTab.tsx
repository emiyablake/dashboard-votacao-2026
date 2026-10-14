"use client";

import dynamic from "next/dynamic";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { data, fmt, pct } from "@/lib/data";
import { axisStyle, Card, ChartPanel, ExportMenu, tooltipProps } from "@/lib/ui";

const MapaAbstencao = dynamic(() => import("@/components/MapaAbstencao"), { ssr: false });

export default function AbstencaoTab() {
  const totalAbst = data.zonas.reduce((s, z) => s + z.abst, 0);
  const porAbst = [...data.zonas].sort((a, b) => b.abst - a.abst);
  const top = porAbst[0];
  const top10Share =
    porAbst.slice(0, 10).reduce((s, z) => s + z.abst, 0) / totalAbst;

  const pareto = porAbst.reduce<
    { zona: string; abst: number; muns: string; acum: number }[]
  >((acc, z, i) => {
    const acumAnterior = i > 0 ? acc[i - 1].acum : 0;
    const acum = acumAnterior + (z.abst / totalAbst) * 100;
    acc.push({
      zona: `Zona ${z.zona}`,
      abst: z.abst,
      muns: z.muns.join(", "),
      acum: Number(acum.toFixed(1)),
    });
    return acc;
  }, []);

  const scatter = data.zonas.map((z) => ({
    x: z.aptos,
    y: Number(pct(z.abst, z.aptos).toFixed(2)),
    z: z.abst,
    zona: `Zona ${z.zona}`,
    muns: z.muns.join(", "),
  }));

  const dadosAbstencoes = () => ({
    nome: `votacao-sc-abstencoes-zonas-${data.meta.ano}`,
    titulo: `Abstenções por zona — ${data.meta.ano} (volume absoluto)`,
    linhas: pareto.map((p) => ({
      zona: p.zona.replace("Zona ", ""),
      municipios: p.muns,
      abstencoes: p.abst,
      perc_do_total_pct: Number(((p.abst / totalAbst) * 100).toFixed(1)),
      acumulado_pct: p.acum,
    })),
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card
          title="Total de abstenções no estado"
          value={fmt(totalAbst)}
          sub={`${pct(totalAbst, data.zonas.reduce((s, z) => s + z.aptos, 0)).toFixed(1)}% dos aptos`}
        />
        <Card
          title="Maior concentração"
          value={`Zona ${top.zona}`}
          sub={`${fmt(top.abst)} abstenções (${pct(top.abst, totalAbst).toFixed(1)}% do estado) — ${top.muns.join(", ")}`}
        />
        <Card
          title="Abstenções nas 10 maiores zonas"
          value={`${(top10Share * 100).toFixed(1)}%`}
          sub={`do total de abstenções do estado (${fmt(totalAbst)}) estão nas 10 zonas com maior volume absoluto`}
        />
        <Card
          title="Zonas acima de 20%"
          value={String(data.zonas.filter((z) => pct(z.abst, z.aptos) > 20).length)}
          sub={`de ${data.zonas.length} zonas`}
        />
      </div>

      <ChartPanel
        titulo="Concentração geográfica de abstenções por município"
        descricao={
          <>
            Tamanho da bolha = número de pessoas que não compareceram · Cor = taxa de
            abstenção (verde &lt;16%, amarelo 16–20%, laranja 20–25%, vermelho ≥25%).
            Passe o mouse para ver os números.
          </>
        }
      >
        <MapaAbstencao municipios={data.municipalities} />
      </ChartPanel>

      <ChartPanel
        titulo="Pareto das abstenções por zona (volume absoluto)"
        descricao="Barras = abstenções em cada zona · Linha = % acumulado do total do estado. A curva mostra como o volume se concentra em poucas zonas."
        acao={<ExportMenu getDados={dadosAbstencoes} />}
      >
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={pareto.slice(0, 25)}>
            <CartesianGrid stroke="#1e293b" vertical={false} />
            <XAxis dataKey="zona" tick={axisStyle} angle={-45} textAnchor="end" height={70} />
            <YAxis yAxisId="abs" tick={axisStyle} tickFormatter={(v) => fmt(v)} />
            <YAxis yAxisId="pct" orientation="right" tick={axisStyle} unit="%" domain={[0, 100]} />
            <Tooltip
              {...tooltipProps}
              formatter={(v, name, item) =>
                name === "acum"
                  ? [`${Number(v)}%`, "% acumulado do estado"]
                  : [fmt(Number(v)), "abstenções"]
              }
              labelFormatter={(_l, items) => {
                const p = items?.[0]?.payload as { muns?: string } | undefined;
                return p?.muns ? `Municípios: ${p.muns}` : "";
              }}
            />
            <Legend />
            <Bar yAxisId="abs" dataKey="abst" name="abstenções" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            <Line yAxisId="pct" type="monotone" dataKey="acum" name="% acumulado" stroke="#38bdf8" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel
        titulo="Taxa de abstenção × tamanho do eleitorado (por zona)"
        descricao="Cada ponto é uma zona. O quadrante superior direito — muito eleitor e abstenção alta — é onde campanhas de mobilização teriam maior impacto absoluto."
      >
        <ResponsiveContainer width="100%" height={380}>
          <ScatterChart margin={{ top: 10, right: 30, bottom: 10, left: 10 }}>
            <CartesianGrid stroke="#1e293b" />
            <XAxis
              type="number"
              dataKey="x"
              name="aptos"
              tick={axisStyle}
              tickFormatter={(v) => fmt(v)}
              label={{
                value: "eleitores aptos",
                position: "insideBottom",
                offset: -5,
                fill: "#94a3b8",
                fontSize: 12,
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="abstenção"
              unit="%"
              tick={axisStyle}
              domain={[0, "dataMax + 5"]}
            />
            <ZAxis type="number" dataKey="z" range={[40, 400]} />
            <Tooltip
              {...tooltipProps}
              cursor={{ strokeDasharray: "3 3" }}
              formatter={(v, name) =>
                name === "aptos" ? [fmt(Number(v)), "aptos"] : [`${Number(v)}%`, "abstenção"]
              }
              labelFormatter={(_l, items) => {
                const p = items?.[0]?.payload as { zona?: string; muns?: string } | undefined;
                return p ? `${p.zona} — ${p.muns}` : "";
              }}
            />
            <Scatter data={scatter} fill="#38bdf8" fillOpacity={0.6} />
          </ScatterChart>
        </ResponsiveContainer>
      </ChartPanel>
    </div>
  );
}
