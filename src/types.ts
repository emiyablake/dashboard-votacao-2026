export interface Candidate {
  id: number;
  cdCargo: number;
  cargo: string;
  numero: number;
  nome: string;
  tipo: "Nominal" | "Branco" | "Nulo" | "Legenda" | string;
  partido: string | null;
  total: number;
}

export interface CargoTotal {
  cdCargo: number;
  cargo: string;
  tipo: string;
  total: number;
}

export interface MunVote {
  v: number; // votavel id
  c: number; // cdCargo
  n: number; // votos
}

export interface Municipality {
  ibge: number;
  nome: string;
  aptos: number;
  comp: number;
  abst: number;
  secoes: number;
  zonas: number;
  votos: MunVote[];
}

export interface Zona {
  zona: number;
  aptos: number;
  comp: number;
  abst: number;
  secoes: number;
  municipios: number;
  muns: string[];
  votos: MunVote[];
}

export interface Bairro {
  ibge: number;
  mun: string;
  bairro: string;
  aptos: number;
  comp: number;
  abst: number;
  secoes: number;
  votos: MunVote[];
}

export interface SecaoGeo {
  munId: number;
  mun: string;
  zona: number;
  sec: number;
  local: number;
  bairro: string | null;
  nmLocal: string | null;
  lat: number;
  lng: number;
  aptos: number;
  comp: number;
  abst: number;
}

/** linha do grafico "Presidente por bairro" (barras empilhadas) */
export interface PresRow {
  bairro: string;
  lider1: number;
  lider2: number;
  outros: number;
  brancosNulos: number;
  abstencao: number;
  aptos: number;
  nome1: string;
  nome2: string;
  cor1: string;
  cor2: string;
}

export interface VotacaoData {
  meta: { ano: number; turno: number; eleicao: string; pleito: string; uf: string; geradoEm: string };
  cargoTotals: CargoTotal[];
  candidates: Candidate[];
  municipalities: Municipality[];
  zonas: Zona[];
  bairros: Bairro[];
  secoes: SecaoGeo[];
}
