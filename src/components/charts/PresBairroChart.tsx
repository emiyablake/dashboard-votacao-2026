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
import { PresRow } from "@/types";
import { fmt } from "@/lib/data";
import { axisStyle, tooltipProps } from "@/lib/ui";

/** barras empilhadas: Presidente por bairro (2 líderes + demais + brancos/nulos + abstenção) */
export default function PresBairroChart({
  titulo,
  dados,
  altura = 460,
  larguraLabel = 150,
}: {
  titulo: string;
  dados: PresRow[];
  altura?: number;
  larguraLabel?: number;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <h3 className="mb-1 font-semibold text-slate-100">{titulo}</h3>
      <p className="mb-3 text-xs text-slate-400">
        Top 15 bairros por aptos · a soma das barras equivale ao eleitorado apto do bairro.
      </p>
      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-slate-300">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: dados[0]?.cor1 ?? "#4ade80" }} />
          {dados[0]?.nome1 ?? "1º lugar"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: dados[0]?.cor2 ?? "#38bdf8" }} />
          {dados[0]?.nome2 ?? "2º lugar"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-orange-500" />
          Demais
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "#ededed" }} />
          Brancos/Nulos
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-slate-600" />
          Abstenção
        </span>
      </div>
      <ResponsiveContainer width="100%" height={altura}>
        <BarChart data={dados} layout="vertical" barCategoryGap="20%">
          <CartesianGrid stroke="#1e293b" horizontal={false} />
          <XAxis type="number" tick={axisStyle} tickFormatter={(v) => fmt(v)} />
          <YAxis
            type="category"
            dataKey="bairro"
            width={larguraLabel}
            tick={{ ...axisStyle, fontSize: 11 }}
          />
          <Tooltip
            {...tooltipProps}
            formatter={(v, name, item) => {
              const p = item?.payload as PresRow | undefined;
              const label =
                name === "lider1"
                  ? (p?.nome1 ?? "1º lugar")
                  : name === "lider2"
                  ? (p?.nome2 ?? "2º lugar")
                  : name === "outros"
                  ? "Demais candidatos"
                  : name === "brancosNulos"
                  ? "Brancos/Nulos"
                  : "Abstenção";
              return [fmt(Number(v)), label];
            }}
          />
          <Bar dataKey="lider1" name="lider1" stackId="a" fill={dados[0]?.cor1 ?? "#4ade80"} />
          <Bar dataKey="lider2" name="lider2" stackId="a" fill={dados[0]?.cor2 ?? "#38bdf8"} />
          <Bar dataKey="outros" name="outros" stackId="a" fill="#f97316" />
          <Bar dataKey="brancosNulos" name="brancosNulos" stackId="a" fill="#ededed" />
          <Bar dataKey="abstencao" name="abstencao" stackId="a" fill="#475569" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
