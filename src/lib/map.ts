/**
 * Configuração central dos tiles de mapa (CARTO basemaps).
 * A chave vem de NEXT_PUBLIC_CARTO_KEY (.env.local no dev / env de build na Vercel).
 * Sem chave, o mapa usa o endpoint público do OSM (sem watermark, porém com limite de uso menor).
 */
const KEY = process.env.NEXT_PUBLIC_CARTO_KEY;

export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

export const TILE_URL = KEY
  ? `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${KEY}`
  : "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
