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

/** local de votacao agregado (escola/igreja etc.) */
export interface LocalVotacaoRow {
  ibge: number;
  mun: string;
  zona: number;
  local: number;
  nmLocal: string | null;
  bairro: string | null;
  aptos: number;
  comp: number;
  abst: number;
  secoes: number;
  votos: MunVote[];
}

export interface VotacaoData {
  meta: { ano: number; turno: number; eleicao: string; pleito: string; uf: string; geradoEm: string };
  cargoTotals: CargoTotal[];
  candidates: Candidate[];
  municipalities: Municipality[];
  zonas: Zona[];
  bairros: Bairro[];
  secoes: SecaoGeo[];
  locais: LocalVotacaoRow[];
}

/** emprego formal agregado da RAIS em um ano */
export interface RaisAno {
  vinculos: number;
  salario_medio: number | null;
  salario_mediano: number | null;
  massa_salarial_dez: number | null;
  pct_mulheres: number | null;
  idade_media: number | null;
  pct_18_29: number | null;
  pct_60_mais: number | null;
  pct_superior: number | null;
  pct_sem_fundamental: number | null;
  pct_preta_parda: number | null;
  pct_agro: number | null;
  pct_industria: number | null;
  pct_construcao: number | null;
  pct_comercio: number | null;
  pct_servicos: number | null;
  pct_micro_peq: number | null;
}

/** indicadores socioeconomicos de um municipio (Censo 2022 + RAIS 2024/2025) */
export interface SocioMun {
  ibge: string;
  nome: string;
  populacao: number;
  domicilios: number;
  moradores_medio: number | null;
  area_km2: number | null;
  densidade: number | null;
  pct_homens: number | null;
  pct_0_14: number | null;
  pct_15_29: number | null;
  pct_30_59: number | null;
  pct_60_mais: number | null;
  pct_brancos: number | null;
  pct_pretos: number | null;
  pct_amarelos: number | null;
  pct_pardos: number | null;
  pct_indigenas: number | null;
  pct_alfabetizadas_15: number | null;
  pct_agua_rede: number | null;
  pct_esgoto_rede: number | null;
  pct_lixo_coletado: number | null;
  pct_banheiro: number | null;
  rais_2024?: RaisAno;
  rais_2025?: RaisAno;
  variacao_vinculos_24_25?: number;
}
