# Kurio — Marketplace de NFTs

Implementação do desafio de frontend: um marketplace de NFTs completo
(catálogo, detalhe, carrinho, checkout, autenticação, perfil e carteiras),
seguindo o layout do Figma e sem backend real — toda a API REST e o canal
de tempo real são simulados no próprio navegador (MSW + Socket.IO).

Contratos, políticas de sessão/cache/carrinho, decisões de UX, desvios do
Figma e limitações estão em [ARCHITECTURE.md](./ARCHITECTURE.md). Este
arquivo cobre como rodar, testar, auditar e reproduzir cada cenário.

## Stack

React 18 + TypeScript + Vite · TanStack Router (rotas, parâmetros e busca
tipados, guarda das rotas privadas) · TanStack Query (cache e mutações) ·
Axios (cliente HTTP único) · API REST simulada com MSW · Socket.IO
(`socket.io-client` falando com um servidor simulado via
`@mswjs/socket.io-binding`) · Tailwind CSS · shadcn/ui (componentes em
`src/components/ui`, sobre Radix UI, configurados em `components.json`) ·
React Hook Form + Zod · Playwright (E2E e regressão visual) · Lighthouse.

## Pré-requisitos

- Node.js 20+ (testado com Node 22 e 24)
- npm

## Instalação

```bash
npm install
npx playwright install chromium   # só para os testes E2E
```

Nada mais: não há backend, banco ou serviço externo. Um checkout limpo roda
com esses dois comandos.

## Variáveis de ambiente

Nenhuma é obrigatória — a aplicação, os testes e a auditoria rodam sem `.env`.

| Variável | Usada por | Padrão | Efeito |
| --- | --- | --- | --- |
| `VITE_ENABLE_MOCKS` | build da aplicação | ligado | `false` desliga o MSW. Sem backend real, a aplicação fica sem API — serve só para depuração. É lida no build (`VITE_ENABLE_MOCKS=false npm run build`). |
| `PORT` | `npm run dev` | `5173` | Porta do servidor de desenvolvimento. |
| `CI` | Playwright | não definida | Quando definida: uma nova tentativa por teste, 2 workers, `test.only` proibido e o preview sempre sobe do zero (sem reaproveitar um servidor já rodando na porta 4173). |
| `PLAYWRIGHT_CHROMIUM_PATH` | Playwright e `npm run lighthouse` | não definida | Caminho de um Chromium já instalado, usado no lugar do navegador baixado pelo Playwright (testes, com `--no-sandbox`) e do Chrome encontrado no sistema (Lighthouse). Ignorada se o arquivo não existir. |
| `LH_BASE_URL` | `npm run lighthouse` | `http://localhost:4173` | Endereço auditado. |

A auditoria Lighthouse abre o Chrome (ou Chromium) instalado na máquina,
localizado automaticamente pelo `chrome-launcher`. Sem um Chrome instalado,
aponte `PLAYWRIGHT_CHROMIUM_PATH` para um Chromium — por exemplo, o que
`npx playwright install chromium` baixa.

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento em `http://localhost:5173` |
| `npm run build` | `tsc -b` + `vite build` |
| `npm run preview` | Serve o build em `http://localhost:4173` |
| `npm run typecheck` | Tipos de `src/` e `e2e/` |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Suíte Playwright (builda e sobe o preview sozinha) |
| `npm run test:e2e:ui` | Playwright em modo interativo |
| `npm run test:e2e:report` | Abre o último relatório HTML |
| `npm run lighthouse` | Auditoria Lighthouse (precisa do preview rodando) |
| `npm run msw:init` | Regrava `public/mockServiceWorker.js` após atualizar o MSW |

## Contas de teste

Credenciais fictícias, criadas a cada reset dos mocks. O banco simulado
guarda só o hash SHA-256 das senhas (`src/mocks/hash.ts`).

| E-mail | Senha | Observação |
| --- | --- | --- |
| `ana@kurio.test` | `kurio123` | Tem uma carteira principal cadastrada e conectada |
| `marcos@kurio.test` | `kurio123` | Sem carteira — bom para testar o cadastro de carteiras |

Também é possível criar uma conta nova pela tela de Cadastro.

## Cenários de mock

### Selecionar um cenário

- Pelo painel **Cenários de teste**, no canto inferior direito da tela
  (visível sempre que os mocks estão ativos); ou
- no console do navegador: `localStorage.setItem('kurio:scenario', '<id>')`.
  O cenário é lido a cada requisição, sem recarregar a página.

### Restaurar o estado inicial

- Pelo botão de reset do painel **Cenários de teste** (restaura e recarrega); ou
- no console: `await fetch('/api/mocks/reset', { method: 'POST' })`.

O reset devolve ao estado conhecido o banco (NFTs, usuários, carrinhos,
pedidos, sessões, carteiras), a sequência pseudoaleatória dos cenários e o
histórico de eventos do Socket.IO.

### Cenários disponíveis

Todos são determinísticos. Onde há variação (latência, quedas), ela vem de
um gerador pseudoaleatório com semente fixa, reiniciado a cada carregamento
e a cada reset — a mesma sequência de ações produz sempre o mesmo resultado.

| id | Efeito |
| --- | --- |
| `default` | Latência realista (90–320ms); a carteira conecta e o pagamento é confirmado. |
| `empty-catalog` | Toda busca no catálogo retorna zero resultados. |
| `slow-network` | Latência alta (1.8s–3.2s) em todas as chamadas. |
| `flaky-network` | Latência de 0.2s a 2.6s e ~12% de quedas de conexão, numa sequência reproduzível. |
| `out-of-order` | Após cada carregamento, as listagens do catálogo respondem cada vez mais rápido (1.8s, 1.2s, 0.6s, depois 150ms): filtros aplicados em sequência recebem as respostas na ordem inversa. |
| `offline` | Todas as chamadas falham por indisponibilidade de conexão. |
| `server-errors` | Toda chamada de dados responde 503 (falha transitória). |
| `session-expired` | Qualquer rota protegida responde 401 `SESSION_EXPIRED`. |
| `price-drift` | A cada 2.5s um NFT do carrinho muda de preço (±15%) e, a cada três mudanças, perde uma edição — via `nft.updated`. |
| `sold-out` | Ao confirmar a compra, a última edição de um item do carrinho é vendida para outro colecionador. |
| `wallet-declined` | A carteira simulada recusa toda solicitação de conexão. |
| `order-timeout` | A criação do pedido demora além do timeout do cliente, mas o pedido é criado — "Verificar status do pedido" recupera o mesmo pedido pela idempotency key. |
| `order-declined` | Todo pedido novo é recusado na simulação de pagamento. |

### Reproduzindo cada falha

| Situação | Como reproduzir |
| --- | --- |
| Catálogo vazio | Cenário `empty-catalog` e abra `/`. |
| Carregamento lento (skeletons) | Cenário `slow-network` e abra `/`, um NFT ou o carrinho. |
| Respostas fora de ordem | Cenário `out-of-order`, recarregue e marque três coleções em sequência: a primeira resposta chega por último e é descartada. |
| Sem conexão | Cenário `offline`. |
| Erro 5xx e nova tentativa | Cenário `server-errors`; espere o erro do catálogo, volte para `default` e clique **Tentar novamente**. |
| Sessão expirada | Faça login, escolha `session-expired` e navegue para `/profile` — o login volta para onde você estava. |
| Acesso sem permissão (403) | Conclua uma compra como Ana, copie a URL do recibo, entre como Marcos e abra a URL. |
| Conflito no cadastro | Cadastre-se com `ana@kurio.test` ou com o usuário `ana.colecionadora`. |
| Cupom inválido / expirado | No carrinho, `NAOEXISTE` (inválido) ou `PROMO2025` (expirado). Válidos: `KURIO10` e `BEMVINDO5`. |
| Preço muda durante a compra | Cenário `price-drift` com um item no carrinho, ou a chamada de controle abaixo com o checkout aberto. |
| Edição esgota na compra | Cenário `sold-out` e confirme a compra. |
| Carteira recusa / desconecta | Cenário `wallet-declined`; no pagamento, **Desconectar** e depois **Conectar**. |
| Dados do pagamento inválidos | No pagamento, apague o nome de exibição (ou marque "Usar outra carteira" com um endereço inválido) e confirme: o erro aparece no campo. |
| Pagamento recusado | Cenário `order-declined` e confirme a compra. |
| Timeout com recuperação | Cenário `order-timeout` e confirme a compra. |
| Evento duplicado ou atrasado | Use a chamada de replay abaixo com o `eventId` devolvido por uma alteração. |

### Plano de controle dos mocks

Rotas do servidor simulado para demonstração e testes — nenhuma tela as
chama. Elas agem "do lado do servidor" (banco + Socket.IO), então o efeito
chega à interface pelo mesmo caminho de produção.

| Rota | Efeito |
| --- | --- |
| `POST /api/mocks/reset` | Restaura o estado inicial (ver acima). |
| `POST /api/mocks/nfts/:id` | Corpo `{ "priceEth"?: "1.25", "editionsAvailable"?: 3 }`. Grava a mudança e emite `nft.updated`; responde o evento emitido. |
| `POST /api/mocks/events/:eventId/replay` | Reenvia um evento já emitido, idêntico (mesmo `eventId` e `version`). |

Exemplo, no console com um NFT no carrinho:

```js
const res = await fetch('/api/mocks/nfts/nft_001', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ priceEth: '9.99' }),
})
const { eventId } = await res.json()
await fetch(`/api/mocks/events/${eventId}/replay`, { method: 'POST' }) // entrega duplicada
```

## Testes end-to-end (Playwright)

```bash
npm run test:e2e         # chromium-desktop (1440px) + chromium-mobile (390px)
npm run test:e2e:ui      # modo interativo
npm run test:e2e:report  # abre o último relatório HTML
```

`npm run test:e2e` builda a aplicação e sobe `vite preview` automaticamente
(`webServer` no `playwright.config.ts`) — os testes rodam contra o mesmo
bundle que seria publicado, com os mocks ligados. Os 12 fluxos pedidos no
desafio estão em `e2e/01-*.spec.ts` a `e2e/12-*.spec.ts`, um arquivo por
fluxo; `e2e/visual-regression.spec.ts` cobre início, detalhe, carrinho e
pagamento. O relatório HTML fica em `playwright-report/` e os traces, vídeos
e screenshots das falhas em `test-results/`.

Cada teste começa num contexto de navegador novo (banco simulado limpo).
Latência e falhas vêm dos cenários; eventos em instantes precisos, do plano
de controle; testes dependentes de tempo usam `page.clock`. Tudo passa pelos
handlers MSW e pelo `socket.io-client` real — nenhum setter de cache nem
evento disparado direto na UI.

As baselines de regressão visual são por plataforma (o Playwright nomeia os
arquivos com o sistema operacional). As versionadas foram geradas no Windows
(`*-win32.png`); em outro sistema, gere as da plataforma com:

```bash
npx playwright test -g "Regressão visual" --update-snapshots
```

## Auditoria Lighthouse

```bash
npm run build
npm run preview &
npm run lighthouse
```

Roda `scripts/lighthouse-audit.mjs` (a configuração versionada da
auditoria): início e detalhe do NFT, perfis mobile e desktop, três
execuções cada. Gera relatórios HTML/JSON e um resumo com as medianas em
`reports/lighthouse/`. O relatório escrito, com a justificativa dos
resultados, está em [`reports/lighthouse/README.md`](./reports/lighthouse/README.md).

## Scripts auxiliares (`scripts/`)

- `lighthouse-audit.mjs` — auditoria Lighthouse (ver acima).
- `smoke.mjs` — fumaça rápida (login → carrinho → checkout) usada durante o
  desenvolvimento.
- `realtime-check.mjs` — confirma que `nft.updated`/`order.updated` chegam
  pelo `socket.io-client` real durante um checkout.
- `responsive-check.mjs` — varre `/`, `/nft/:id`, `/cart`, `/login`,
  `/profile` e `/wallets` em 390/768/1440px procurando overflow horizontal.
- `build-deploy-payload.mjs` e `build-deploy-payload-jsonl.mjs` — montam a
  lista de arquivos para um deploy manual pela API da Vercel. Não são
  necessários para rodar nem para publicar pelo fluxo normal (Git).

Os scripts de verificação esperam o preview rodando em `http://localhost:4173`
e são executados com `node scripts/<nome>.mjs`.

## Deploy

**URL pública:** https://junglechallenge.vercel.app/

A aplicação é estática: MSW e o servidor Socket.IO simulado rodam no
navegador, então mocks e tempo real funcionam no deploy como em
desenvolvimento. O `vercel.json` reescreve qualquer rota para `index.html`
(arquivos existentes, como `/assets/*` e `/mockServiceWorker.js`, continuam
servidos direto) — é o que permite acesso direto e refresh em `/cart`,
`/nft/:id`, `/pedido/:id` etc.
