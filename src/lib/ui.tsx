import { ReactNode } from "react";

/** card de KPI usado nas abas */
export function Card({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400">{title}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-50">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

/** painel padrao com borda para graficos */
export function ChartPanel({
  titulo,
  descricao,
  children,
  acao,
}: {
  titulo: string;
  descricao?: ReactNode;
  children: ReactNode;
  acao?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <h3 className="mb-1 font-semibold text-slate-100">{titulo}</h3>
      {descricao && <p className="mb-3 text-xs text-slate-400">{descricao}</p>}
      {acao}
      {children}
    </div>
  );
}

export const axisStyle = { fill: "#94a3b8", fontSize: 12 };

export const tooltipProps = {
  contentStyle: {
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 8,
  },
  labelStyle: { color: "#e2e8f0", fontSize: 13 },
  itemStyle: { color: "#e2e8f0", fontSize: 13 },
};

/** escala de cores compartilhada para taxas de abstencao/comparecimento */
export function corAbstencao(p: number): string {
  if (p >= 25) return "#dc2626";
  if (p >= 20) return "#f97316";
  if (p >= 16) return "#facc15";
  return "#4ade80";
}
