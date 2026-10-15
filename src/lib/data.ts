import { Bairro, BairroSocio, Candidate, EconomiaMun, LocalVotacaoRow, Municipality, OcupacaoInfo, PresRow, SocioMun, VotacaoData, Zona } from "@/types";
import raw from "@/data/votacao.json";
import raw2022 from "@/data/votacao_2022.json";
import rawSocio from "@/data/socio_sc.json";
import rawBairrosSocio from "@/data/bairros_socio.json";
import rawEconomia from "@/data/economia_sc.json";
import rawOcupacoes from "@/data/ocupacoes_sc.json";

export const data = raw as unknown as VotacaoData;
export const data2022 = raw2022 as unknown as VotacaoData;
export const socio = rawSocio as unknown as SocioMun[];
export const bairrosSocio = rawBairrosSocio as unknown as BairroSocio[];
export const economia = rawEconomia as unknown as EconomiaMun[];

const economiaMapa = new Map(economia.map((e) => [e.ibge, e]));
export const economiaPorIbge = (ibge: number | string) => economiaMapa.get(Number(ibge));

// RAIS por ocupacao (CBO 6 digitos): ocupacoes com >= 300 vínculos no estado
export const ocupacoes = rawOcupacoes.ocupacoes as OcupacaoInfo[];

export interface CelulaOcup {
  n: number;
  sal: number | null;
}
const celulasOcup = rawOcupacoes.celulas as [number, number, number, (number | null)][];
const ocupPorMun = new Map<number, Map<number, CelulaOcup>>();
for (const [ibge, oi, n, sal] of celulasOcup) {
  let m = ocupPorMun.get(ibge);
  if (!m) {
    m = new Map();
    ocupPorMun.set(ibge, m);
  }
  m.set(oi, { n, sal });
}
export const ocupacaoPorMun = ocupPorMun;

const socioMapa = new Map(socio.map((s) => [s.ibge, s]));
export const socioPorIbge = (ibge: number | string) => socioMapa.get(String(ibge));

const bairrosSocioMapa = new Map(bairrosSocio.map((b) => [`${b.ibge}|${b.bairro}`, b]));
export const socioPorBairro = (ibge: number, bairro: string) =>
  bairrosSocioMapa.get(`${ibge}|${bairro}`);

export const CARGOS = [
  { cd: 1, nome: "Presidente" },
  { cd: 3, nome: "Governador" },
  { cd: 5, nome: "Senador" },
  { cd: 6, nome: "Deputado Federal" },
  { cd: 7, nome: "Deputado Estadual" },
];

export const fmt = (n: number) => n.toLocaleString("pt-BR");
export const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0);

const candMaps = new Map<VotacaoData, Map<number, Candidate>>();
function candMapOf(d: VotacaoData): Map<number, Candidate> {
  let m = candMaps.get(d);
  if (!m) {
    m = new Map(d.candidates.map((c) => [c.id, c]));
    candMaps.set(d, m);
  }
  return m;
}
export const getCand = (id: number) => candMapOf(data).get(id);
export const getCandOf = (d: VotacaoData, id: number) => candMapOf(d).get(id);

export function cargoStatsOf(d: VotacaoData, cdCargo: number) {
  const rows = d.cargoTotals.filter((t) => t.cdCargo === cdCargo);
  const get = (tipo: string) => rows.find((r) => r.tipo === tipo)?.total ?? 0;
  const nominal = get("Nominal");
  const legenda = get("Legenda");
  const validos = nominal + legenda;
  const total = validos + get("Branco") + get("Nulo");
  return { nominal, legenda, validos, brancos: get("Branco"), nulos: get("Nulo"), total };
}
export function cargoStats(cdCargo: number) {
  return cargoStatsOf(data, cdCargo);
}

/** ranking de candidatos de um cargo (Nominal), com % sobre validos */
export function rankingOf(d: VotacaoData, cdCargo: number): Candidate[] {
  const { validos } = cargoStatsOf(d, cdCargo);
  return d.candidates
    .filter((c) => c.cdCargo === cdCargo && c.tipo === "Nominal")
    .map((c) => ({ ...c, pctV: pct(c.total, validos) }))
    .sort((a, b) => b.total - a.total);
}
export function ranking(cdCargo: number): Candidate[] {
  return rankingOf(data, cdCargo);
}

export interface WinnerInfo {
  cand: Candidate;
  votos: number;
  pctValidos: number;
}

/** vencedor de um cargo em um município/zona/bairro (entre Nominal) */
export function winnerInOf(
  d: VotacaoData,
  votos: Municipality["votos"] | Zona["votos"] | Bairro["votos"],
  cdCargo: number
): WinnerInfo | null {
  const cmap = candMapOf(d);
  let best: { id: number; n: number } | null = null;
  let localValidos = 0;
  for (const v of votos) {
    if (v.c !== cdCargo) continue;
    const cand = cmap.get(v.v);
    if (!cand) continue;
    if (cand.tipo === "Nominal" || cand.tipo === "Legenda") localValidos += v.n;
    if (cand.tipo === "Nominal" && (!best || v.n > best.n)) best = { id: v.v, n: v.n };
  }
  if (!best) return null;
  const cand = cmap.get(best.id)!;
  return { cand, votos: best.n, pctValidos: pct(best.n, localValidos) };
}
export function winnerIn(
  votos: Municipality["votos"] | Zona["votos"] | Bairro["votos"],
  cdCargo: number
): WinnerInfo | null {
  return winnerInOf(data, votos, cdCargo);
}

/** fonte generica para o grafico empilhado de Presidente */
export interface PresSource {
  label: string;
  aptos: number;
  abst: number;
  votos: Municipality["votos"];
}

/**
 * top N linhas (por aptos) com votação de Presidente empilhada:
 * 2 líderes + demais candidatos + brancos/nulos + abstenção
 * (a soma das barras equivale ao eleitorado apto da linha)
 */
export function presRows(ds: VotacaoData, lista: PresSource[], top = 15): PresRow[] {
  return [...lista]
    .sort((a, b) => b.aptos - a.aptos)
    .slice(0, top)
    .map((b) => {
      const contagem = new Map<number, number>();
      for (const v of b.votos) {
        if (v.c === 1) contagem.set(v.v, (contagem.get(v.v) ?? 0) + v.n);
      }
      let brancosNulos = 0;
      const nominais: { nome: string; partido: string | null; n: number }[] = [];
      for (const [id, n] of contagem) {
        const cand = getCandOf(ds, id);
        if (!cand) continue;
        if (cand.tipo === "Nominal") {
          nominais.push({ nome: cand.nome, partido: cand.partido, n });
        } else {
          brancosNulos += n;
        }
      }
      nominais.sort((x, y) => y.n - x.n);
      const [l1, l2] = nominais;
      const outros = nominais.slice(2).reduce((s, x) => s + x.n, 0);
      return {
        bairro: b.label,
        lider1: l1?.n ?? 0,
        lider2: l2?.n ?? 0,
        outros,
        brancosNulos,
        abstencao: b.abst,
        aptos: b.aptos,
        nome1: l1 ? `${l1.nome} (${l1.partido ?? "–"})` : "—",
        nome2: l2 ? `${l2.nome} (${l2.partido ?? "–"})` : "—",
        cor1: partidoColor(l1?.partido),
        cor2: partidoColor(l2?.partido),
      };
    });
}

export const presPorBairro = (ds: VotacaoData, lista: Bairro[], top = 15): PresRow[] =>
  presRows(ds, lista.map((b) => ({ label: b.bairro, aptos: b.aptos, abst: b.abst, votos: b.votos })), top);

export const presPorLocal = (ds: VotacaoData, lista: LocalVotacaoRow[], top = 15): PresRow[] =>
  presRows(
    ds,
    lista.map((l) => ({ label: l.nmLocal ?? `Local ${l.local}`, aptos: l.aptos, abst: l.abst, votos: l.votos })),
    top
  );

export const PARTIDO_COLORS: Record<string, string> = {
  PL: "#1d4ed8",
  PSB: "#f59e0b",
  PSD: "#38bdf8",
  PT: "#ef4444",
  PP: "#a78bfa",
  NOVO: "#f97316",
  UNIÃO: "#3b82f6",
  PDT: "#e11d48",
  MDB: "#14b8a6",
  REPUBLICANOS: "#71717a",
  PSDB: "#0ea5e9",
  PSOL: "#f43f5e",
  PODE: "#84cc16",
  AVANTE: "#d946ef",
  PCO: "#b91c1c",
  PSTU: "#991b1b",
  UP: "#7f1d1d",
  DC: "#0d9488",
  PRD: "#fbbf24",
  AGIR: "#6366f1",
  PCB: "#dc2626",
  CIDADANIA: "#ec4899",
  SOLIDARIEDADE: "#f472b6",
  MOBILIZA: "#4ade80",
  RENOVAÇÃO: "#22d3ee",
  PTC: "#facc15",
  PSN: "#a1a1aa",
  PMB: "#fda4af",
};

export function partidoColor(sigla: string | null | undefined): string {
  if (!sigla) return "#a1a1aa";
  const base = sigla.replace(/\s*\(.*\)/, "").trim().toUpperCase();
  return PARTIDO_COLORS[base] ?? "#a1a1aa";
}
