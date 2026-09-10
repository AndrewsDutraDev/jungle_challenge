# Kurio — Marketplace de NFTs

Implementação do desafio de frontend: um marketplace de NFTs completo
(catálogo, detalhe, carrinho, checkout, autenticação, perfil e carteiras),
seguindo o layout do Figma e sem backend real — toda a API REST e o canal
de tempo real são simulados no próprio navegador (MSW + Socket.IO).

Para decisões de arquitetura, estrutura de pastas e justificativas
técnicas, veja [ARCHITECTURE.md](./ARCHITECTURE.md). Este arquivo cobre
como rodar, testar e auditar o projeto.

## Stack

React 18 + TypeScript + Vite · TanStack Router (roteamento com data
loaders e busca tipada) · TanStack Query (cache/estado assíncrono) · Axios
(cliente HTTP) · Tailwind CSS + Radix UI (componentes acessíveis) · MSW
(mocks REST + WebSocket) · socket.io-client (tempo real) · React Hook Form
+ Zod (formulários e validação) · Playwright (testes E2E) · Lighthouse
(auditoria).

## Pré-requisitos

- Node.js 20+ (testado com Node 22)
- npm

## Instalação

```bash
npm install
```

## Rodando em desenvolvimento

```bash
npm run dev
```

Abre em `http://localhost:5173`. Os mocks (MSW) sobem automaticamente — não
há passo manual de "subir um backend". Um painel flutuante no canto
inferior direito ("Cenários de teste") permite trocar o cenário de
rede/negócio simulado em tempo real (latência alta, erros de servidor,
pagamento recusado, etc.) e resetar os dados simulados ao estado inicial.

### Contas de teste

| E-mail | Senha | Observação |
| --- | --- | --- |
| `ana@kurio.test` | `kurio123` | tem uma carteira principal já cadastrada e conectada |
| `marcos@kurio.test` | `kurio123` | sem carteira cadastrada — bom para testar o fluxo de cadastro |

Também é possível criar uma conta nova pela tela de Cadastro.

## Build de produção

```bash
npm run build      # tsc -b + vite build
npm run preview     # serve o build em http://localhost:4173
```

O build de produção mantém os mocks ativos por padrão (`VITE_ENABLE_MOCKS`
não é `false`) — não existe um backend real para apontar, então a
aplicação publicada precisa continuar funcionando sozinha. Para desligar os
mocks explicitamente (ex.: debugging de erros de rede reais), rode com
`VITE_ENABLE_MOCKS=false`.

## Testes end-to-end (Playwright)

```bash
npx playwright install   # baixa os browsers do Playwright (uma vez)
npm run test:e2e         # roda toda a suíte (chromium-desktop + chromium-mobile)
npm run test:e2e:ui      # modo interativo
npm run test:e2e:report  # abre o último relatório HTML
```

`npm run test:e2e` builda a aplicação e sobe `vite preview` automaticamente
(`webServer` no `playwright.config.ts`) — os testes rodam contra o mesmo
bundle que seria publicado, nunca contra `vite dev`. Os 12 fluxos pedidos
no desafio estão em `e2e/01-*.spec.ts` a `e2e/12-*.spec.ts`, um arquivo por
fluxo; `e2e/visual-regression.spec.ts` cobre a regressão visual de
início/detalhe/carrinho/pagamento com baselines versionadas em
`e2e/visual-regression.spec.ts-snapshots/`. Para atualizar as baselines
após uma mudança visual intencional:

```bash
npx playwright test -g "Regressão visual" --update-snapshots
```

Todos os testes exercitam os handlers MSW e o `socket.io-client` real —
nenhuma chamada direta a setters de cache ou eventos simulados na UI.

## Auditoria Lighthouse

```bash
npm run build
npm run preview &
npm run lighthouse
```

Roda `scripts/lighthouse-audit.mjs` (a configuração versionada da
auditoria): início e detalhe do NFT, perfis mobile e desktop, três
execuções cada. Gera relatórios HTML/JSON individuais e um resumo com as
medianas em `reports/lighthouse/`. O relatório escrito, com a
justificativa dos resultados, está em
[`reports/lighthouse/README.md`](./reports/lighthouse/README.md).

## Lint e verificação de tipos

```bash
npm run lint
npm run typecheck   # cobre src/ e e2e/
```

## Scripts auxiliares (`scripts/`)

- `smoke.mjs` — fumaça rápida (login → carrinho → checkout) usada durante o
  desenvolvimento para verificar que o fluxo principal não quebrou.
- `realtime-check.mjs` — confirma que os eventos `nft.updated`/
  `order.updated` chegam pelo `socket.io-client` real durante um checkout.
- `responsive-check.mjs` — varre `/`, `/nft/:id`, `/cart`, `/login`,
  `/profile` e `/wallets` em 390/768/1440px checando *overflow* horizontal.
- `lighthouse-audit.mjs` — auditoria Lighthouse (ver seção acima).

## Cenários de mock disponíveis

Trocáveis pelo painel "Cenários de teste" na UI ou programaticamente via
`localStorage.setItem('kurio:scenario', '<id>')` (lido a cada requisição,
não precisa recarregar a página):

| id | Efeito |
| --- | --- |
| `default` | Latência realista, sucesso na maior parte das operações. |
| `empty-catalog` | Toda busca no catálogo retorna zero resultados. |
| `slow-network` | Latência alta e constante (1.8s–3.2s) em todas as chamadas. |
| `flaky-network` | Latência aleatória (0.2s–2.6s) — respostas podem chegar fora de ordem. |
| `offline` | Todas as chamadas falham por indisponibilidade de conexão. |
| `server-errors` | ~40% das chamadas retornam 500/503. |
| `session-expired` | Qualquer rota protegida responde 401 `SESSION_EXPIRED`. |
| `price-drift` | Itens no carrinho recebem eventos `nft.updated` com preço/disponibilidade alterados, via WebSocket. |
| `order-timeout` | Criação de pedido demora além do timeout do cliente, mas é criada no servidor — a repetição com a mesma idempotency key recupera o mesmo pedido. |
| `order-declined` | Todo pedido novo é recusado na simulação de pagamento. |

## Deploy

Ver a seção "Deploy" em [ARCHITECTURE.md](./ARCHITECTURE.md#deploy) para a
URL pública e notas sobre acesso direto/refresh de rotas em produção.
