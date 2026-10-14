"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { data, fmt, pct } from "@/lib/data";
import { downloadCSV } from "@/lib/download";
import { axisStyle, ChartPanel, ExportButton, tooltipProps } from "@/lib/ui";

export default function ZonasTab() {
  const topAbst = [...data.zonas]
    .map((z) => ({
      zona: `Zona ${z.zona}`,
      abst: Number(pct(z.abst, z.aptos).toFixed(2)),
      aptos: z.aptos,
      muns: z.muns.join(", "),
    }))
    .sort((a, b) => b.abst - a.abst)
    .slice(0, 20);

  const exportarZonas = () =>
    downloadCSV(
      `votacao-sc-zonas-${data.meta.ano}`,
      [...data.zonas]
        .sort((a, b) => b.aptos - a.aptos)
        .map((z) => ({
          zona: z.zona,
          municipios: z.muns.join(", "),
          secoes: z.secoes,
          aptos: z.aptos,
          comparecimento: z.comp,
          abstencoes: z.abst,
          taxa_abstencao_pct: Number(pct(z.abst, z.aptos).toFixed(1)),
        }))
    );

  return (
    <div className="space-y-6">
      <ChartPanel
        titulo="Zonas com maior abstenção (top 20)"
        descricao="Passe o mouse sobre a barra para ver os municípios atendidos pela zona."
        acao={<ExportButton onClick={exportarZonas} />}
      >
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topAbst}>
            <CartesianGrid stroke="#1e293b" vertical={false} />
            <XAxis dataKey="zona" tick={axisStyle} />
            <YAxis tick={axisStyle} unit="%" />
            <Tooltip
              {...tooltipProps}
              formatter={(v, _n, item) => [
                `${Number(v)}% (${fmt(Number(item?.payload?.aptos ?? 0))} aptos)`,
                "abstenção",
              ]}
              labelFormatter={(_l, items) => {
                const p = items?.[0]?.payload as { muns?: string } | undefined;
                return p?.muns ? `Municípios: ${p.muns}` : "";
              }}
            />
            <Bar dataKey="abst" name="abstenção %" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-3 py-2 text-left">Zona</th>
              <th className="px-3 py-2 text-left">Municípios atendidos</th>
              <th className="px-3 py-2 text-left">Seções</th>
              <th className="px-3 py-2 text-left">Aptos</th>
              <th className="px-3 py-2 text-left">Comparecimento</th>
              <th className="px-3 py-2 text-left">Abstenção</th>
            </tr>
          </thead>
          <tbody>
            {[...data.zonas]
              .sort((a, b) => b.aptos - a.aptos)
              .map((z) => (
                <tr key={z.zona} className="border-t border-slate-800 hover:bg-slate-900/60">
                  <td className="px-3 py-2 font-medium text-slate-100">{z.zona}</td>
                  <td className="px-3 py-2 text-slate-300">{z.muns.join(", ")}</td>
                  <td className="px-3 py-2">{fmt(z.secoes)}</td>
                  <td className="px-3 py-2">{fmt(z.aptos)}</td>
                  <td className="px-3 py-2">
                    {fmt(z.comp)}{" "}
                    <span className="text-slate-500">({pct(z.comp, z.aptos).toFixed(1)}%)</span>
                  </td>
                  <td className="px-3 py-2">
                    {fmt(z.abst)}{" "}
                    <span className="text-slate-500">({pct(z.abst, z.aptos).toFixed(1)}%)</span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
