"use client";

import dynamic from "next/dynamic";
import { data } from "@/lib/data";

const MapaCoropletico = dynamic(() => import("@/components/MapaCoropletico"), {
  ssr: false,
});

export default function CoropleticoTab() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">
        Mapa coroplético por município. Escolha a métrica acima do mapa: abstenção,
        comparecimento ou vencedor para Presidente. Passe o mouse sobre o município para
        ver os números completos.
      </p>
      <MapaCoropletico municipalities={data.municipalities} />
    </div>
  );
}
