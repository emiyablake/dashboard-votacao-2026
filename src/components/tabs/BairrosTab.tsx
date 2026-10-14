"use client";

import { useMemo, useState } from "react";
import PresBairroChart from "@/components/charts/PresBairroChart";
import ComboBox from "@/components/ui/ComboBox";
import { data, data2022, fmt, partidoColor, presPorBairro, pct, winnerIn } from "@/lib/data";

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
        <span className="text-xs text-slate-400">
          {bairrosDoMun.length} bairros ·{" "}
          {fmt(bairrosDoMun.reduce((s, b) => s + b.aptos, 0))} aptos
        </span>
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

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-3 py-2 text-left">Bairro</th>
              <th className="px-3 py-2 text-left">Seções</th>
              <th className="px-3 py-2 text-left">Aptos</th>
              <th className="px-3 py-2 text-left">Comparecimento</th>
              <th className="px-3 py-2 text-left">Abstenção</th>
              <th className="px-3 py-2 text-left">Vencedor (Presidente)</th>
            </tr>
          </thead>
          <tbody>
            {bairrosDoMun.map((b) => {
              const w = winnerIn(b.votos, 1);
              return (
                <tr key={b.bairro} className="border-t border-slate-800 hover:bg-slate-900/60">
                  <td className="px-3 py-2 font-medium text-slate-100">{b.bairro}</td>
                  <td className="px-3 py-2">{b.secoes}</td>
                  <td className="px-3 py-2">{fmt(b.aptos)}</td>
                  <td className="px-3 py-2">
                    {fmt(b.comp)}{" "}
                    <span className="text-slate-500">({pct(b.comp, b.aptos).toFixed(1)}%)</span>
                  </td>
                  <td className="px-3 py-2">
                    {fmt(b.abst)}{" "}
                    <span className="text-slate-500">({pct(b.abst, b.aptos).toFixed(1)}%)</span>
                  </td>
                  <td className="px-3 py-2">
                    {w && (
                      <span
                        className="mr-1 inline-block h-2.5 w-2.5 rounded-full"
                        style={{ background: partidoColor(w.cand.partido) }}
                      />
                    )}
                    {w
                      ? `${w.cand.nome} · ${fmt(w.votos)} (${w.pctValidos.toFixed(1)}%)`
                      : "—"}
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
