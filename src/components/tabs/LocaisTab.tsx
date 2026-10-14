"use client";

import { useMemo, useState } from "react";
import PresBairroChart from "@/components/charts/PresBairroChart";
import {
  data,
  data2022,
  fmt,
  partidoColor,
  pct,
  presPorLocal,
  winnerInOf,
} from "@/lib/data";
import { LocalVotacaoRow } from "@/types";

const keyOf = (l: LocalVotacaoRow) => `${l.zona}:${l.local}`;

const sel =
  "rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm";

export default function LocaisTab() {
  const [munLoc, setMunLoc] = useState(4205407); // Florianópolis
  const [bairroLoc, setBairroLoc] = useState(""); // "" = todos
  const [localSel, setLocalSel] = useState(""); // "" = top 15

  const locais26 = useMemo(
    () => data.locais.filter((l) => l.ibge === munLoc),
    [munLoc]
  );
  const locais22 = useMemo(
    () => data2022.locais.filter((l) => l.ibge === munLoc),
    [munLoc]
  );

  // bairros disponiveis = uniao dos nomes dos dois anos (cadastros podem divergir)
  const bairros = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const l of [...locais26, ...locais22]) {
      if (l.bairro) mapa.set(l.bairro, (mapa.get(l.bairro) ?? 0) + l.aptos);
    }
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]).map(([b]) => b);
  }, [locais26, locais22]);

  // filtro por bairro aplicado no proprio campo de cada ano
  const filtra = (lista: LocalVotacaoRow[]) =>
    bairroLoc ? lista.filter((l) => l.bairro === bairroLoc) : lista;
  const filtrados26 = useMemo(() => filtra(locais26), [locais26, bairroLoc]); // eslint-disable-line react-hooks/exhaustive-deps
  const filtrados22 = useMemo(() => filtra(locais22), [locais22, bairroLoc]); // eslint-disable-line react-hooks/exhaustive-deps

  // locais no select: uniao dos dois anos pelo codigo (zona:local)
  const locaisOptions = useMemo(() => {
    const mapa = new Map<string, { label: string; aptos: number }>();
    for (const l of [...filtrados26, ...filtrados22]) {
      const k = keyOf(l);
      const label = `${l.nmLocal ?? `Local ${l.local}`} — ${l.bairro ?? "sem bairro"} (Zona ${l.zona})`;
      const atual = mapa.get(k);
      if (!atual || atual.aptos < l.aptos) mapa.set(k, { label, aptos: l.aptos });
    }
    return [...mapa.entries()]
      .map(([k, v]) => ({ k, ...v }))
      .sort((a, b) => b.aptos - a.aptos);
  }, [filtrados26, filtrados22]);

  const sel26 = useMemo(
    () => filtrados26.filter((l) => keyOf(l) === localSel),
    [filtrados26, localSel]
  );
  const sel22 = useMemo(
    () => filtrados22.filter((l) => keyOf(l) === localSel),
    [filtrados22, localSel]
  );

  const foco = localSel !== "";
  const chart26 = useMemo(
    () => presPorLocal(data, foco ? sel26 : filtrados26, foco ? 1 : 15),
    [foco, sel26, filtrados26]
  );
  const chart22 = useMemo(
    () => presPorLocal(data2022, foco ? sel22 : filtrados22, foco ? 1 : 15),
    [foco, sel22, filtrados22]
  );

  // tabela pareada por codigo do local
  const linhas = useMemo(() => {
    const m26 = new Map(filtrados26.map((l) => [keyOf(l), l]));
    const m22 = new Map(filtrados22.map((l) => [keyOf(l), l]));
    const chaves = [...new Set([...m26.keys(), ...m22.keys()])].sort((a, b) => {
      const aa = m26.get(a)?.aptos ?? m22.get(a)?.aptos ?? 0;
      const bb = m26.get(b)?.aptos ?? m22.get(b)?.aptos ?? 0;
      return bb - aa;
    });
    return chaves.map((k) => ({ k, l26: m26.get(k), l22: m22.get(k) }));
  }, [filtrados26, filtrados22]);

  const onMun = (ibge: number) => {
    setMunLoc(ibge);
    setBairroLoc("");
    setLocalSel("");
  };
  const onBairro = (b: string) => {
    setBairroLoc(b);
    setLocalSel("");
  };

  const vencedorCell = (l: LocalVotacaoRow | undefined, ds: typeof data) => {
    if (!l) return <td className="px-3 py-2 text-slate-600">—</td>;
    const w = winnerInOf(ds, l.votos, 1);
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select value={munLoc} onChange={(e) => onMun(Number(e.target.value))} className={sel}>
          {[...data.municipalities]
            .sort((a, b) => b.aptos - a.aptos)
            .map((m) => (
              <option key={m.ibge} value={m.ibge}>
                {m.nome}
              </option>
            ))}
        </select>
        <select value={bairroLoc} onChange={(e) => onBairro(e.target.value)} className={sel}>
          <option value="">Todos os bairros</option>
          {bairros.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select value={localSel} onChange={(e) => setLocalSel(e.target.value)} className={sel}>
          <option value="">Top 15 locais (gráficos)</option>
          {locaisOptions.map((o) => (
            <option key={o.k} value={o.k}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-400">
          {linhas.length} locais · clique numa linha da tabela para focar o gráfico nela
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PresBairroChart
          titulo={
            foco
              ? `Presidente ${data.meta.ano} — ${sel26[0]?.nmLocal ?? "local sem dados em " + data.meta.ano}`
              : `Presidente ${data.meta.ano} — locais de votação (top 15)`
          }
          dados={chart26}
          altura={foco ? 200 : 460}
        />
        <PresBairroChart
          titulo={
            foco
              ? `Presidente ${data2022.meta.ano} — ${sel22[0]?.nmLocal ?? sel26[0]?.nmLocal ?? "local"}`
              : `Presidente ${data2022.meta.ano} — locais de votação (top 15)`
          }
          dados={chart22}
          altura={foco ? 200 : 460}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-3 py-2 text-left">Local de votação</th>
              <th className="px-3 py-2 text-left">Bairro</th>
              <th className="px-3 py-2 text-left">Aptos 26/22</th>
              <th className="px-3 py-2 text-left">Abstenção 26/22</th>
              <th className="px-3 py-2 text-left">Vencedor {data.meta.ano}</th>
              <th className="px-3 py-2 text-left">Vencedor {data2022.meta.ano}</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map(({ k, l26, l22 }) => {
              const nome = l26?.nmLocal ?? l22?.nmLocal ?? `Local ${k.split(":")[1]}`;
              const zona = l26?.zona ?? l22?.zona;
              const bairro = l26?.bairro ?? l22?.bairro ?? "—";
              const aptosTxt = [l26, l22]
                .map((l) => (l ? fmt(l.aptos) : "—"))
                .join(" / ");
              const abstTxt = [l26, l22]
                .map((l) => (l ? `${pct(l.abst, l.aptos).toFixed(1)}%` : "—"))
                .join(" / ");
              return (
                <tr
                  key={k}
                  onClick={() => setLocalSel(localSel === k ? "" : k)}
                  className={`cursor-pointer border-t border-slate-800 hover:bg-slate-900/60 ${
                    localSel === k ? "bg-slate-800/50" : ""
                  }`}
                >
                  <td className="px-3 py-2 font-medium text-slate-100">
                    {nome} <span className="text-slate-500">· Zona {zona}</span>
                  </td>
                  <td className="px-3 py-2 text-slate-300">{bairro}</td>
                  <td className="px-3 py-2">{aptosTxt}</td>
                  <td className="px-3 py-2">{abstTxt}</td>
                  {vencedorCell(l26, data)}
                  {vencedorCell(l22, data2022)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
