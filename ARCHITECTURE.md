# Arquitetura

## Visão geral

Kurio é uma SPA React sem backend real: toda a API REST e o canal de
tempo real (WebSocket) são simulados no navegador com
[MSW](https://mswjs.io/) e um servidor Socket.IO emulado sobre o handler
de WebSocket do MSW. O objetivo do desafio é validar a integração real com
essa camada — roteamento, cache, formulários, tempo real, recuperação de
erro — não a existência de um servidor de verdade.

## Estrutura de pastas

```
src/
  app/            bootstrap da aplicação (providers: Query, Router)
  routes/         definição de rotas TanStack Router (uma por tela + layout raiz)
  features/       uma pasta por tela/domínio (catalog, nft-detail, cart,
                  checkout, auth, account) — cada uma com sua página e os
                  componentes que só ela usa
  components/
    ui/           primitivas reutilizáveis (Button, Dialog, Select, Tabs…),
                  a maioria envolvendo Radix UI
    layout/       Header, Footer, NotFound — usados em todas as telas
    nft/          NftArt (arte procedural determinística por NFT)
    dev/          ScenarioPanel (troca de cenário de mock, só em runtime)
  lib/
    api/          um hook TanStack Query por recurso (nfts, cart, orders…),
                  sempre por cima do `apiClient` (Axios) — nenhuma tela
                  chama Axios diretamente
    socket/       cliente Socket.IO + hook `useRealtime` que assina os
                  eventos e atualiza o cache do TanStack Query
    query/        chaves de cache centralizadas (`queryKeys`)
    checkout/     idempotency key do checkout (gerada e persistida por
                  tentativa de compra, limpa após sucesso/erro definitivo)
    auth/         helpers de sessão/token
  mocks/
    handlers/     um arquivo de handlers HTTP por recurso, espelhando
                  `lib/api/*`
    fixtures.ts   geração determinística do catálogo (PRNG com seed fixa —
                  ver `src/mocks/prng.ts`), preços, carteiras, cupons etc.
    db.ts         "banco" em memória (persistido em localStorage entre
                  reloads), com o mesmo formato para todos os handlers
    scenarios.ts  os cenários de rede/negócio simuláveis (ver README)
    socket.ts     servidor Socket.IO emulado (eventos `nft.updated`,
                  `order.updated`, driver de `price-drift`)
  types/api.ts    tipos compartilhados entre os handlers mock e os hooks de
                  API — o mesmo tipo `Nft`/`Order`/`Quote`/… nos dois lados
e2e/              suíte Playwright (ver README)
scripts/          scripts auxiliares (smoke test, auditoria Lighthouse…)
reports/lighthouse/  relatórios da auditoria Lighthouse (versionados)
```

## Por que TanStack Router + TanStack Query + Axios

- **TanStack Router**: roteamento com busca de URL tipada (`Route.useSearch`)
  é usado extensivamente no catálogo (busca, filtros, ordenação, página —
  tudo refletido e restaurável pela URL, incluindo histórico do navegador).
  Cada rota carrega seu próprio chunk (code-splitting automático por rota).
- **TanStack Query**: dono de todo o estado assíncrono — cache, invalidação,
  refetch em foco/reconexão, mutations com `onMutate`/`onError`/`onSettled`
  para atualização otimista com rollback (ver seção própria abaixo).
- **Axios**: cliente HTTP único (`src/lib/api/client.ts`), com timeout de
  4.5s e interceptor que injeta o `Authorization: Bearer <token>` — é o que
  torna o timeout do checkout (cenário `order-timeout`) e a recuperação via
  idempotência testáveis de ponta a ponta.

## Mocks: por que MSW ao invés de um mock mais simples

MSW intercepta as chamadas na camada de rede (Service Worker para HTTP,
patch de `WebSocket` para o canal de tempo real) — o código da aplicação
(Axios, `socket.io-client`) não sabe que está falando com um mock. Isso é
o que torna possível testar o app "de verdade": os testes E2E clicam na UI
e esperam por texto/estado, nunca chamam um setter de cache ou disparam um
evento simulado diretamente (o que o README trata como eliminatório).

### O bug do WebSocket e como foi corrigido

Durante o desenvolvimento, o handshake do Socket.IO falhava
sistematicamente contra o mock (`Unexpected response code: 200`,
repetido). Causa raiz: `engine.io-client` (dependência do
`socket.io-client`) captura `globalThis.WebSocket` numa constante de nível
de módulo, no momento do import — e como `socket.io-client` era importado
estaticamente no topo de `src/lib/socket/client.ts`, essa captura
acontecia durante a avaliação síncrona inicial do script, **antes** de
`enableMocking()`/`worker.start()` (assíncronos) terem a chance de aplicar
o patch do MSW sobre `WebSocket`. O cliente acabava usando o `WebSocket`
nativo do navegador, sem interceptação.

Correção: `src/lib/socket/client.ts` importa `socket.io-client`
dinamicamente (`await import('socket.io-client')`) de dentro de
`getSocket()`, adiada até depois de `worker.start()` resolver. Isso é uma
armadilha geral de qualquer biblioteca importada estaticamente antes de um
`await enableMocking()` — vale para qualquer projeto que precise que um
patch assíncrono de globals termine antes do primeiro uso da biblioteca
que o consome.

## Tempo real (Socket.IO)

`src/mocks/socket.ts` emula um servidor Socket.IO sobre o handler
WebSocket do MSW (via `@mswjs/socket.io-binding`), emitindo:

- `nft.updated` — preço/disponibilidade mudaram (usado pelo cenário
  `price-drift`: um driver com `setInterval` muda um NFT presente em algum
  carrinho a cada ~2.5s, só enquanto há conexões ativas).
- `order.updated` — status do pedido mudou (pendente → confirmado/recusado).

`src/lib/socket/useRealtime.ts` assina esses eventos e atualiza o cache do
TanStack Query diretamente (nunca via refetch forçado) — com
versionamento (`nftVersions`/`orderVersions`) para descartar eventos
atrasados ou duplicados, cobrindo o fluxo de "reconexão não duplica nem
regride estado" pedido no desafio.

## Checkout: idempotência, timeout e duplo clique

`POST /api/orders` recebe uma `idempotencyKey` (gerada por tentativa de
compra, persistida enquanto a tentativa não termina). O handler
(`src/mocks/handlers/orders.ts`) **reserva o pedido no servidor
imediatamente** — antes de qualquer atraso de rede simulado — e só depois
aplica o atraso simulado na resposta. Isso é o que garante, ao mesmo tempo:

- **Duplo clique / novo clique após timeout do cliente**: qualquer
  requisição concorrente ou repetida com a mesma `idempotencyKey` encontra
  o pedido já reservado e recebe a mesma resposta, em vez de criar um
  segundo pedido.
- **Timeout do cliente (cenário `order-timeout`)**: o timeout do Axios
  (4.5s) pode estourar antes da resposta simulada (~5.2s) chegar — a UI
  reconhece isso como "pode já ter sido processado" e oferece "Verificar
  status do pedido", que reenvia a mesma `idempotencyKey` e recupera o
  pedido já criado, rápido (sem re-pagar o atraso simulado).

(Anteriormente o pedido só era gravado depois do atraso simulado — o que
permitia uma janela real de corrida para duplicar pedidos em clique duplo,
e fazia o botão "Verificar status" também esperar o atraso inteiro de novo
antes de encontrar o pedido. Corrigido movendo a reserva do pedido para
antes do atraso.)

## Atualização otimista com rollback

`useToggleFavoriteMutation` (`src/lib/api/favorites.ts`): remover um
favorito atualiza o cache imediatamente (`onMutate`) e desfaz a remoção se
a chamada falhar (`onError`, restaurando o snapshot anterior). É a
interação exigida pelo README (§4) — assimétrica de propósito: só o
caminho de remoção precisa ser instantâneo o bastante para justificar
otimismo; adicionar um favorito não tem o mesmo custo de espera percebida.

## Acessibilidade

- Menu mobile como diálogo modal real (Radix `Dialog`), não um `<nav>`
  simplesmente revelado — dá de graça foco movido ao abrir, Tab/Shift+Tab
  presos dentro, Esc fecha. O gatilho é um `DialogTrigger` (não um botão
  solto com `onClick` próprio): é isso que permite ao Radix devolver o
  foco ao botão que abriu o menu ao fechar — sem isso, o foco simplesmente
  se perde.
- Skip link ("Pular para o conteúdo") como primeiro elemento focável da
  página.
- Erros de formulário sempre associados ao campo via `aria-describedby` +
  `aria-invalid`, nunca soltos na página.
- Testado por teclado de ponta a ponta em `e2e/11-accessibility-
  keyboard.spec.ts`.

## Estratégia de testes E2E

Ver README para como rodar. Decisões notáveis:

- Contra o build de produção (`vite preview`), nunca `vite dev`.
- Um cenário de mock por teste que precisa de um comportamento específico
  (`page.addInitScript` grava `kurio:scenario` no localStorage antes da
  primeira navegação — os handlers leem o cenário a cada requisição, então
  também pode ser trocado no meio de um teste sem recarregar a página).
- Conexão de carteira simulada tem ~15% de chance de recusa (por
  desenho, para exercitar o caminho de erro) — testes que precisam de uma
  carteira conectada usam um helper (`e2e/support/wallet.ts`) que tenta
  novamente em vez de assumir sucesso na primeira tentativa.
- `fetch()` direto de dentro de `page.evaluate` não passa pelo interceptor
  de autenticação do Axios (que injeta o Bearer token) — helpers como
  `e2e/support/api.ts#fetchOrders` replicam esse cabeçalho manualmente ao
  invés de fazer chamadas não autenticadas por engano.

## Deploy

### URL: https://junglechallenge.vercel.app/

A aplicação é 100% estática (client-side, sem variáveis de ambiente
sensíveis) — qualquer host de arquivos estáticos com fallback de SPA
(reescrever qualquer rota para `index.html`) serve. Acesso direto e
refresh em qualquer rota (`/nft/:id`, `/cart`, `/checkout`, etc.) dependem
desse fallback estar configurado.
