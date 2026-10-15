import { pct } from "@/lib/data";
import { Municipality, VotacaoData } from "@/types";

/** agregado de voto/abstenção por grupo de municípios */
export interface GrupoAgg {
  nome: string;
  muns: number;
  aptos: number;
  abst: number;
  pl: number;
  pt: number;
  validos: number;
}

/** agrega municipios por chave, com votos PL/PT (presidente) e abstenção ponderados */
export function agregaVoto(
  d: VotacaoData,
  chave: (m: Municipality) => string
): Map<string, GrupoAgg> {
  const cands = new Map(
    d.candidates
      .filter((c) => c.cdCargo === 1 && (c.tipo === "Nominal" || c.tipo === "Legenda"))
      .map((c) => [c.id, c])
  );
  const grupos = new Map<string, GrupoAgg>();
  for (const m of d.municipalities) {
    const k = chave(m);
    let g = grupos.get(k);
    if (!g) {
      g = { nome: k, muns: 0, aptos: 0, abst: 0, pl: 0, pt: 0, validos: 0 };
      grupos.set(k, g);
    }
    g.muns += 1;
    g.aptos += m.aptos;
    g.abst += m.abst;
    for (const v of m.votos) {
      if (v.c !== 1) continue;
      const cand = cands.get(v.v);
      if (!cand) continue; // brancos/nulos ficam fora do denominador de válidos
      g.validos += v.n;
      if (cand.tipo === "Nominal" && cand.partido === "PL") g.pl += v.n;
      else if (cand.tipo === "Nominal" && cand.partido === "PT") g.pt += v.n;
    }
  }
  return grupos;
}

export const paraBarras = (g: GrupoAgg) => ({
  nome: g.nome,
  muns: g.muns,
  abstencao: Number(pct(g.abst, g.aptos).toFixed(1)),
  pl: Number(pct(g.pl, g.validos).toFixed(1)),
  pt: Number(pct(g.pt, g.validos).toFixed(1)),
});
