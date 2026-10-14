"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { DadosExport, downloadCSV, downloadPDF, downloadXML } from "@/lib/download";

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

type Formato = "csv" | "xml" | "pdf";

const FORMATOS: { id: Formato; rotulo: string; dica: string }[] = [
  { id: "csv", rotulo: "CSV", dica: "planilhas (Excel)" },
  { id: "xml", rotulo: "XML", dica: "integração entre sistemas" },
  { id: "pdf", rotulo: "PDF", dica: "relatório para leitura" },
];

/** menu de exportacao com os formatos disponiveis; alinhado a direita na linha de filtros (ml-auto) */
export function ExportMenu({ getDados }: { getDados: () => DadosExport }) {
  const [aberto, setAberto] = useState(false);
  const [gerando, setGerando] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fecha = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    document.addEventListener("mousedown", fecha);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fecha);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  const escolher = async (fmt: Formato) => {
    setAberto(false);
    const dados = getDados();
    if (dados.linhas.length === 0) return;
    setGerando(true);
    try {
      if (fmt === "csv") downloadCSV(dados.nome, dados.linhas);
      else if (fmt === "xml") downloadXML(dados.nome, dados.linhas);
      else await downloadPDF(dados.nome, dados.titulo ?? dados.nome, dados.linhas);
    } finally {
      setGerando(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        disabled={gerando}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-700 disabled:opacity-60"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {gerando ? "Gerando…" : "Baixar"}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`transition-transform ${aberto ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {aberto && (
        <div className="absolute right-0 z-30 mt-1 w-56 overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
          {FORMATOS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => escolher(f.id)}
              className="block w-full px-3 py-2 text-left text-slate-200 transition-colors hover:bg-slate-800"
            >
              <span className="text-xs font-semibold">{f.rotulo}</span>
              <span className="block text-[11px] text-slate-400">{f.dica}</span>
            </button>
          ))}
        </div>
      )}
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
