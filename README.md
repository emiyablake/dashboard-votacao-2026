# Painel Votação SC

Painel de visualização dos resultados eleitorais de Santa Catarina a partir dos boletins de urna (bweb) oficiais do TSE — 1º turno de 2026, com comparativo de 2022 por bairro.

## Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS v4
- **Recharts** para os gráficos
- **react-leaflet** para os mapas (tiles CARTO basemaps)

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # e preencha NEXT_PUBLIC_CARTO_KEY
npm run dev
```

Abra http://localhost:3000.

> Sem `NEXT_PUBLIC_CARTO_KEY`, o app funciona com tiles públicos do OpenStreetMap.

## Deploy na Vercel

1. Suba o repositório para o GitHub.
2. Em [vercel.com/new](https://vercel.com/new), importe o repositório (framework Next.js detectado automaticamente).
3. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_CARTO_KEY` = sua chave da API de basemaps do CARTO
4. Deploy.

Variáveis `NEXT_PUBLIC_*` são embutidas no bundle no momento do build — por isso precisam estar configuradas no painel da Vercel antes do deploy.

## Estrutura

```
src/
├── app/page.tsx        # shell: header, navegação, rodapé
├── lib/
│   ├── data.ts         # dados (JSONs) + transformações (ranking, winnerIn, presPorBairro)
│   ├── map.ts          # URL de tiles + attribution (lê NEXT_PUBLIC_CARTO_KEY)
│   └── ui.tsx          # Card, ChartPanel, estilos de eixo/tooltip, escala de cores
└── components/
    ├── charts/         # PresBairroChart
    ├── tabs/           # VisaoGeralTab, ZonasTab, AbstencaoTab, BairrosTab, CoropleticoTab
    └── Mapa*.tsx       # componentes de mapa (leaflet, carregados sem SSR)
```

## Dados

Os JSONs em `src/data/` são gerados pelo pipeline ETL (fora deste repo) a partir dos bweb do TSE:

- `votacao.json` — 1º turno 2026 (SC)
- `votacao_2022.json` — 1º turno 2022 (SC)
- `sc.json` — malha municipal do IBGE com nomes

Fonte oficial: [TSE — resultados eleitorais](https://dadosabertos.tse.jus.br/). O painel é uma visualização independente e não substitui a totalização oficial da Justiça Eleitoral.
