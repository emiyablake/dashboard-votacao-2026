"use client";

import { useMemo, useState } from "react";
import ComboBox from "@/components/ui/ComboBox";
import { data, data2022, fmt, pct, socio } from "@/lib/data";
import { slug } from "@/lib/download";
import { Card, ExportMenu } from "@/lib/ui";
import { SocioMun } from "@/types";

interface Linha extends SocioMun {
  aptos26?: number;
  abst26?: number;
  abst22?: number;
}

const MUNICIPIOS = [...socio]
  .sort((a, b) => b.populacao - a.populacao)
  .map((m) => ({ value: m.ibge, label: m.nome }));

const moeda = (n: number | null | undefined) =>
  n == null
    ? "—"
    : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const num1 = (n: number | null | undefined) => (n == null ? "—" : n.toFixed(1));

export default function SocioeconomicoTab() {
  const [munSel, setMunSel] = useState<string>(""); // "" = todos

  const linhas = useMemo<Linha[]>(() => {
    const m26 = new Map(data.municipalities.map((m) => [m.ibge, m]));
    const m22 = new Map(data2022.municipalities.map((m) => [m.ibge, m]));
    return socio
      .map((s) => {
        const v26 = m26.get(Number(s.ibge));
        const v22 = m22.get(Number(s.ibge));
        return { ...s, aptos26: v26?.aptos, abst26: v26?.abst, abst22: v22?.abst };
      })
      .sort((a, b) => b.populacao - a.populacao);
  }, []);

  const filtradas = useMemo(
    () => (munSel ? linhas.filter((l) => l.ibge === munSel) : linhas),
    [linhas, munSel]
  );

  const kpis = useMemo(() => {
    const pop = socio.reduce((s, m) => s + m.populacao, 0);
    const v24 = socio.reduce((s, m) => s + (m.rais_2024?.vinculos ?? 0), 0);
    const v25 = socio.reduce((s, m) => s + (m.rais_2025?.vinculos ?? 0), 0);
    const pesoSal = socio.reduce(
      (acc, m) => {
        const v = m.rais_2025?.vinculos ?? 0;
        const sal = m.rais_2025?.salario_medio;
        if (sal != null) {
          acc.soma += sal * v;
          acc.peso += v;
        }
        return acc;
      },
      { soma: 0, peso: 0 }
    );
    return {
      pop,
      vinculos: v25,
      variacao: v24 > 0 ? (v25 - v24) / v24 : null,
      salarioMedio: pesoSal.peso > 0 ? pesoSal.soma / pesoSal.peso : null,
    };
  }, []);

  const dadosExport = () => ({
    nome: `votacao-sc-socioeconomico${munSel ? `-${slug(filtradas[0]?.nome ?? munSel)}` : ""}`,
    titulo: `Indicadores socioeconômicos — SC (Censo 2022 · RAIS 2024/2025)${
      munSel ? ` — ${filtradas[0]?.nome ?? ""}` : ""
    }`,
    linhas: filtradas.map((l) => ({
      municipio: l.nome,
      ibge: l.ibge,
      aptos_2026: l.aptos26 ?? "",
      abstencoes_2026: l.abst26 ?? "",
      taxa_abstencao_2026_pct:
        l.aptos26 && l.abst26 != null ? Number(pct(l.abst26, l.aptos26).toFixed(1)) : "",
      abstencoes_2022: l.abst22 ?? "",
      populacao_2022: l.populacao,
      densidade_km2: l.densidade ?? "",
      pct_60_mais: l.pct_60_mais ?? "",
      pct_alfabetizadas_15: l.pct_alfabetizadas_15 ?? "",
      pct_esgoto_rede: l.pct_esgoto_rede ?? "",
      pct_agua_rede: l.pct_agua_rede ?? "",
      vinculos_rais_2024: l.rais_2024?.vinculos ?? "",
      vinculos_rais_2025: l.rais_2025?.vinculos ?? "",
      variacao_vinculos_24_25_pct: l.variacao_vinculos_24_25 ?? "",
      salario_medio_2025: l.rais_2025?.salario_medio ?? "",
      salario_mediano_2025: l.rais_2025?.salario_mediano ?? "",
      pct_superior_rais_2025: l.rais_2025?.pct_superior ?? "",
      pct_industria_rais_2025: l.rais_2025?.pct_industria ?? "",
      pct_dirigentes_prof_2025: l.rais_2025?.pct_dirigentes_prof ?? "",
      pct_servicos_vendas_2025: l.rais_2025?.pct_servicos_vendas ?? "",
      pct_ind_construcao_2025: l.rais_2025?.pct_ind_construcao ?? "",
      pct_operarios_2025: l.rais_2025?.pct_operarios ?? "",
      pct_agro_ocupacao_2025: l.rais_2025?.pct_agro_cbo ?? "",
    })),
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          title="População (Censo 2022)"
          value={fmt(kpis.pop)}
          sub="295 municípios de SC"
        />
        <Card
          title="Vínculos formais (RAIS 2025)"
          value={fmt(kpis.vinculos)}
          sub="empregos com carteira ativos em 31/12"
        />
        <Card
          title="Variação de vínculos 2024 → 2025"
          value={kpis.variacao == null ? "—" : `${kpis.variacao >= 0 ? "+" : ""}${(kpis.variacao * 100).toFixed(1)}%`}
          sub={kpis.variacao != null && kpis.variacao < 0 ? "emprego formal em queda" : "emprego formal em alta"}
        />
        <Card
          title="Salário médio (RAIS 2025)"
          value={moeda(kpis.salarioMedio)}
          sub="média ponderada pelos vínculos"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <ComboBox
          value={munSel}
          onChange={(v) => setMunSel(String(v))}
          options={MUNICIPIOS}
          placeholder="Todos os municípios — buscar…"
          width="w-72"
        />
        {munSel && (
          <button
            onClick={() => setMunSel("")}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            Limpar filtro
          </button>
        )}
        <span className="text-xs text-zinc-400">
          {filtradas.length} município{filtradas.length === 1 ? "" : "s"} · Censo Demográfico
          2022 (IBGE) · RAIS 2024/2025 (MTE)
        </span>
        <div className="ml-auto">
          <ExportMenu getDados={dadosExport} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-xs uppercase text-zinc-400">
            <tr>
              <th className="px-3 py-2 text-left">Município</th>
              <th className="px-3 py-2 text-left">Abstenção 2026</th>
              <th className="px-3 py-2 text-left">Abstenção 2022</th>
              <th className="px-3 py-2 text-left">População</th>
              <th className="px-3 py-2 text-left">Densidade</th>
              <th className="px-3 py-2 text-left">60+</th>
              <th className="px-3 py-2 text-left">Alfabet. 15+</th>
              <th className="px-3 py-2 text-left">Esgoto rede</th>
              <th className="px-3 py-2 text-left">Vínculos 25/24</th>
              <th className="px-3 py-2 text-left">Variação</th>
              <th className="px-3 py-2 text-left">Salário médio 25</th>
              <th className="px-3 py-2 text-left">Prof./dirigentes</th>
              <th className="px-3 py-2 text-left">Serv./vendas</th>
              <th className="px-3 py-2 text-left">Indúst./operários</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((l) => {
              const varV = l.variacao_vinculos_24_25;
              return (
                <tr key={l.ibge} className="border-t border-zinc-800 hover:bg-zinc-900/60">
                  <td className="px-3 py-2 font-medium text-zinc-100">
                    {l.nome}
                    <span className="ml-1 text-xs text-zinc-500">{l.ibge}</span>
                  </td>
                  <td className="px-3 py-2">
                    {l.aptos26 && l.abst26 != null ? `${pct(l.abst26, l.aptos26).toFixed(1)}%` : "—"}
                  </td>
                  <td className="px-3 py-2">{l.abst22 != null ? fmt(l.abst22) : "—"}</td>
                  <td className="px-3 py-2">{fmt(l.populacao)}</td>
                  <td className="px-3 py-2">
                    {l.densidade != null ? `${num1(l.densidade)}/km²` : "—"}
                  </td>
                  <td className="px-3 py-2">{num1(l.pct_60_mais)}%</td>
                  <td className="px-3 py-2">{num1(l.pct_alfabetizadas_15)}%</td>
                  <td className="px-3 py-2">{num1(l.pct_esgoto_rede)}%</td>
                  <td className="px-3 py-2">
                    {l.rais_2025 ? fmt(l.rais_2025.vinculos) : "—"}
                    <span className="text-zinc-500">
                      {" / "}
                      {l.rais_2024 ? fmt(l.rais_2024.vinculos) : "—"}
                    </span>
                  </td>
                  <td
                    className={`px-3 py-2 ${
                      varV == null ? "" : varV >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {varV == null ? "—" : `${varV >= 0 ? "+" : ""}${varV.toFixed(1)}%`}
                  </td>
                  <td className="px-3 py-2">{moeda(l.rais_2025?.salario_medio)}</td>
                  <td className="px-3 py-2">{num1(l.rais_2025?.pct_dirigentes_prof)}%</td>
                  <td className="px-3 py-2">{num1(l.rais_2025?.pct_servicos_vendas)}%</td>
                  <td className="px-3 py-2">
                    {l.rais_2025
                      ? num1(
                          (l.rais_2025.pct_ind_construcao ?? 0) +
                            (l.rais_2025.pct_operarios ?? 0)
                        )
                      : "—"}
                    %
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
