"use client";

import { useState } from "react";
import VisaoGeralTab from "@/components/tabs/VisaoGeralTab";
import ZonasTab from "@/components/tabs/ZonasTab";
import BairrosTab from "@/components/tabs/BairrosTab";
import LocaisTab from "@/components/tabs/LocaisTab";
import SocioeconomicoTab from "@/components/tabs/SocioeconomicoTab";
import TerritorioTab from "@/components/tabs/TerritorioTab";
import OcupacoesTab from "@/components/tabs/OcupacoesTab";
import { data, fmt } from "@/lib/data";

type Tab = "geral" | "bairros" | "locais" | "zonas" | "socio" | "territorio" | "ocupacoes";

const TABS: { id: Tab; label: string }[] = [
  { id: "geral", label: "Visão geral" },
  { id: "bairros", label: "Bairros" },
  { id: "locais", label: "Locais de votação" },
  { id: "zonas", label: "Zonas eleitorais" },
  { id: "socio", label: "Socioeconômico" },
  { id: "territorio", label: "Território" },
  { id: "ocupacoes", label: "Ocupações" },
];

export default function Home() {
  const [tab, setTab] = useState<Tab>("geral");
  // keep-alive: cada aba monta na primeira visita e fica viva (estado preservado)
  const [visitadas, setVisitadas] = useState<Set<Tab>>(() => new Set<Tab>(["geral"]));

  const vaiPara = (t: Tab) => {
    setTab(t);
    setVisitadas((v) => (v.has(t) ? v : new Set(v).add(t)));
  };

  const painel = (t: Tab, children: React.ReactNode) =>
    visitadas.has(t) && (
      <div className={tab === t ? "" : "hidden"}>{children}</div>
    );

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-200">
      <div className="mx-auto max-w-[1440px] px-4 py-8">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-zinc-50">
            Votação em Santa Catarina — {data.meta.ano} · {data.meta.turno}º turno
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {data.meta.eleicao} · Fonte: boletins de urna oficiais do TSE ({data.meta.geradoEm})
            · {fmt(data.municipalities.length)} municípios · {data.zonas.length} zonas · dados
            processados localmente
          </p>
        </header>

        <nav className="mb-6 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => vaiPara(t.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                tab === t.id
                  ? "bg-zinc-100 text-zinc-900"
                  : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {painel("geral", <VisaoGeralTab />)}
        {painel("bairros", <BairrosTab />)}
        {painel("locais", <LocaisTab />)}
        {painel("zonas", <ZonasTab />)}
        {painel("socio", <SocioeconomicoTab />)}
        {painel("territorio", <TerritorioTab />)}
        {painel("ocupacoes", <OcupacoesTab />)}

        <footer className="mt-10 border-t border-zinc-800 pt-4 text-xs text-zinc-500">
          Dados oficiais de boletins de urna (arquivo bweb_1t_SC_051020261403, TSE). Este
          painel é uma visualização independente e não substitui a totalização oficial da
          Justiça Eleitoral.
        </footer>
      </div>
    </main>
  );
}
