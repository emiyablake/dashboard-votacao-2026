"use client";

import dynamic from "next/dynamic";
import { data, pct, winnerIn } from "@/lib/data";
import { ExportMenu } from "@/lib/ui";

const MapaCoropletico = dynamic(() => import("@/components/MapaCoropletico"), {
  ssr: false,
});

export default function CoropleticoTab() {
  const dadosMunicipios = () => ({
    nome: `votacao-sc-municipios-${data.meta.ano}`,
    titulo: `Municípios de SC — ${data.meta.ano}`,
    linhas: [...data.municipalities]
      .sort((a, b) => b.aptos - a.aptos)
      .map((m) => {
        const w = winnerIn(m.votos, 1);
        return {
          ibge: m.ibge,
          municipio: m.nome,
          aptos: m.aptos,
          comparecimento: m.comp,
          abstencoes: m.abst,
          taxa_abstencao_pct: Number(pct(m.abst, m.aptos).toFixed(1)),
          vencedor_presidente: w?.cand.nome ?? "",
          partido: w?.cand.partido ?? "",
        };
      }),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ExportMenu getDados={dadosMunicipios} />
      </div>
      <p className="text-xs text-zinc-400">
        Mapa coroplético por município. Escolha a métrica acima do mapa: abstenção,
        comparecimento ou vencedor para Presidente. Passe o mouse sobre o município para
        ver os números completos.
      </p>
      <MapaCoropletico municipalities={data.municipalities} />
    </div>
  );
}
