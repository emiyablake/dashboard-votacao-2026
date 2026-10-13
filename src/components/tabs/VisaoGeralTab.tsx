"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CARGOS, cargoStats, data, fmt, partidoColor, pct, ranking } from "@/lib/data";
import { axisStyle, Card, ChartPanel, tooltipProps } from "@/lib/ui";

export default function VisaoGeralTab() {
  const totais = useMemo(() => {
    const aptos = data.municipalities.reduce((s, m) => s + m.aptos, 0);
    const comp = data.municipalities.reduce((s, m) => s + m.comp, 0);
    const abst = data.municipalities.reduce((s, m) => s + m.abst, 0);
    return { aptos, comp, abst };
  }, []);

  const presRanking = useMemo(() => ranking(1).slice(0, 6), []);
  const govRanking = useMemo(() => ranking(3).slice(0, 8), []);
  const senRanking = useMemo(() => ranking(5).slice(0, 6), []);
  const depFedRanking = useMemo(() => ranking(6).slice(0, 12), []);

  const composicaoCargos = CARGOS.map((c) => {
    const s = cargoStats(c.cd);
    return { cargo: c.nome, Válidos: s.validos, Brancos: s.brancos, Nulos: s.nulos };
  });

  const rankingChart = (rows: typeof presRanking, titulo: string, height = 260) => (
    <ChartPanel titulo={titulo}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={rows} layout="vertical">
          <CartesianGrid stroke="#1e293b" horizontal={false} />
          <XAxis type="number" tick={axisStyle} tickFormatter={(v) => fmt(v)} />
          <YAxis type="category" dataKey="nome" width={170} tick={axisStyle} />
          <Tooltip {...tooltipProps} formatter={(v) => [fmt(Number(v)), "votos"]} />
          <Bar dataKey="total" name="votos" radius={[0, 4, 4, 0]}>
            {rows.map((c) => (
              <Cell key={c.id} fill={partidoColor(c.partido)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartPanel>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card title="Eleitores aptos" value={fmt(totais.aptos)} />
        <Card
          title="Comparecimento"
          value={`${pct(totais.comp, totais.aptos).toFixed(1)}%`}
          sub={fmt(totais.comp)}
        />
        <Card
          title="Abstenção"
          value={`${pct(totais.abst, totais.aptos).toFixed(1)}%`}
          sub={fmt(totais.abst)}
        />
        <Card title="Seções" value={fmt(data.secoes.length)} />
        <Card title="Zonas" value={String(data.zonas.length)} />
        <Card title="Municípios" value={String(data.municipalities.length)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {rankingChart(presRanking, "Presidente em SC — votos nominais")}
        {rankingChart(govRanking, "Governador — votos nominais")}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartPanel titulo="Composição dos votos por cargo">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={composicaoCargos}>
              <CartesianGrid stroke="#1e293b" vertical={false} />
              <XAxis dataKey="cargo" tick={axisStyle} />
              <YAxis tick={axisStyle} tickFormatter={(v) => fmt(v)} />
              <Tooltip {...tooltipProps} formatter={(v) => fmt(Number(v))} />
              <Legend />
              <Bar dataKey="Válidos" stackId="a" fill="#3b82f6" />
              <Bar dataKey="Brancos" stackId="a" fill="#f59e0b" />
              <Bar dataKey="Nulos" stackId="a" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-1 text-xs text-slate-500">
            Senador soma o dobro porque cada eleitor escolhe 2 candidatos (voto duplo).
          </p>
        </ChartPanel>

        {rankingChart(senRanking, "Senador — votos nominais (2 vagas)", 280)}
      </div>

      <ChartPanel titulo="Deputado Federal — candidatos mais votados (top 12)">
        <ResponsiveContainer width="100%" height={380}>
          <BarChart data={depFedRanking} layout="vertical" margin={{ left: 12 }}>
            <CartesianGrid stroke="#1e293b" horizontal={false} />
            <XAxis type="number" tick={axisStyle} tickFormatter={(v) => fmt(v)} />
            <YAxis type="category" dataKey="nome" width={190} tick={axisStyle} />
            <Tooltip {...tooltipProps} formatter={(v) => [fmt(Number(v)), "votos"]} />
            <Bar dataKey="total" name="votos" radius={[0, 4, 4, 0]}>
              {depFedRanking.map((c) => (
                <Cell key={c.id} fill={partidoColor(c.partido)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>
    </div>
  );
}
