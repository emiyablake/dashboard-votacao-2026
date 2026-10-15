"use client";

import { useMemo, useState } from "react";
import PresBairroChart from "@/components/charts/PresBairroChart";
import ComboBox from "@/components/ui/ComboBox";
import { data, data2022, fmt, partidoColor, presPorBairro, pct, socioPorBairro, winnerInOf } from "@/lib/data";
import { slug } from "@/lib/download";
import { ExportMenu } from "@/lib/ui";
import { Bairro } from "@/types";

const MUNICIPIOS = [...data.municipalities]
  .sort((a, b) => b.aptos - a.aptos)
  .map((m) => ({ value: m.ibge, label: m.nome }));

export default function BairrosTab() {
  const [munBairro, setMunBairro] = useState(4205407); // Florianópolis

  const bairrosDoMun = useMemo(
    () => data.bairros.filter((b) => b.ibge === munBairro),
    [munBairro]
  );
  const bairrosDoMun22 = useMemo(
    () => data2022.bairros.filter((b) => b.ibge === munBairro),
    [munBairro]
  );

  const pres26 = useMemo(() => presPorBairro(data, bairrosDoMun), [bairrosDoMun]);
  const pres22 = useMemo(() => presPorBairro(data2022, bairrosDoMun22), [bairrosDoMun22]);

  // tabela pareada por nome do bairro (cadastros podem divergir entre os anos)
  const linhas = useMemo(() => {
    const m26 = new Map(bairrosDoMun.map((b) => [b.bairro, b]));
    const m22 = new Map(bairrosDoMun22.map((b) => [b.bairro, b]));
    const chaves = [...new Set([...m26.keys(), ...m22.keys()])].sort((a, b) => {
      const aa = m26.get(a)?.aptos ?? m22.get(a)?.aptos ?? 0;
      const bb = m26.get(b)?.aptos ?? m22.get(b)?.aptos ?? 0;
      return bb - aa;
    });
    return chaves.map((k) => ({ k, b26: m26.get(k), b22: m22.get(k) }));
  }, [bairrosDoMun, bairrosDoMun22]);

  const vencedorCell = (b: Bairro | undefined, ds: typeof data) => {
    if (!b) return <td className="px-3 py-2 text-zinc-600">—</td>;
    const w = winnerInOf(ds, b.votos, 1);
    return (
      <td className="px-3 py-2">
        {w && (
          <span
            className="mr-1 inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: partidoColor(w.cand.partido) }}
          />
        )}
        {w ? `${w.cand.nome} (${w.pctValidos.toFixed(1)}%)` : "—"}
      </td>
    );
  };

  const dadosBairros = () => {
    const munNome =
      data.municipalities.find((m) => m.ibge === munBairro)?.nome ?? String(munBairro);
    return {
      nome: `votacao-sc-bairros-${slug(munNome)}-${data.meta.ano}-x-${data2022.meta.ano}`,
      titulo: `Votação por bairro · ${munNome} (${data.meta.ano} × ${data2022.meta.ano})`,
      linhas: linhas.map(({ k, b26, b22 }) => {
        const w26 = b26 ? winnerInOf(data, b26.votos, 1) : null;
        const w22 = b22 ? winnerInOf(data2022, b22.votos, 1) : null;
        const socio = socioPorBairro(munBairro, k);
        return {
          bairro: k,
          secoes_2026: b26?.secoes ?? "",
          aptos_2026: b26?.aptos ?? "",
          abstencoes_2026: b26?.abst ?? "",
          taxa_abstencao_2026_pct: b26
            ? Number(pct(b26.abst, b26.aptos).toFixed(1))
            : "",
          vencedor_2026: w26?.cand.nome ?? "",
          partido_2026: w26?.cand.partido ?? "",
          secoes_2022: b22?.secoes ?? "",
          aptos_2022: b22?.aptos ?? "",
          abstencoes_2022: b22?.abst ?? "",
          taxa_abstencao_2022_pct: b22
            ? Number(pct(b22.abst, b22.aptos).toFixed(1))
            : "",
          vencedor_2022: w22?.cand.nome ?? "",
          partido_2022: w22?.cand.partido ?? "",
          censo_2022_populacao: socio?.populacao ?? "",
          censo_2022_densidade_km2: socio?.densidade ?? "",
          censo_2022_pct_60_mais: socio?.pct_60_mais ?? "",
          censo_2022_pct_alfabetizadas_15: socio?.pct_alfabetizadas_15 ?? "",
          censo_2022_pct_esgoto_rede: socio?.pct_esgoto_rede ?? "",
          bairro_ibge_referencia: socio?.bairro_ibge ?? "",
        };
      }),
    };
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <ComboBox
          value={munBairro}
          onChange={(v) => setMunBairro(Number(v))}
          options={MUNICIPIOS}
          placeholder="Buscar município…"
          width="w-72"
        />
        <span className="text-xs text-zinc-400">{linhas.length} bairros</span>
        <div className="ml-auto">
          <ExportMenu getDados={dadosBairros} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PresBairroChart
          titulo={`Presidente ${data.meta.ano} — votação por bairro (top 15)`}
          dados={pres26}
        />
        <PresBairroChart
          titulo={`Presidente ${data2022.meta.ano} — votação por bairro (top 15)`}
          dados={pres22}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-xs uppercase text-zinc-400">
            <tr>
              <th className="px-3 py-2 text-left">Bairro</th>
              <th className="px-3 py-2 text-left">Aptos 26/22</th>
              <th className="px-3 py-2 text-left">Abstenção 26/22</th>
              <th className="px-3 py-2 text-left">Vencedor {data.meta.ano}</th>
              <th className="px-3 py-2 text-left">Vencedor {data2022.meta.ano}</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map(({ k, b26, b22 }) => {
              const aptosTxt = [b26, b22]
                .map((b) => (b ? fmt(b.aptos) : "—"))
                .join(" / ");
              const abstTxt = [b26, b22]
                .map((b) => (b ? `${pct(b.abst, b.aptos).toFixed(1)}%` : "—"))
                .join(" / ");
              return (
                <tr key={k} className="border-t border-zinc-800 hover:bg-zinc-900/60">
                  <td className="px-3 py-2 font-medium text-zinc-100">{k}</td>
                  <td className="px-3 py-2">{aptosTxt}</td>
                  <td className="px-3 py-2">{abstTxt}</td>
                  {vencedorCell(b26, data)}
                  {vencedorCell(b22, data2022)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
