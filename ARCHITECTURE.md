# Arquitetura

## Visão geral

Kurio é uma SPA React sem backend real: toda a API REST e o canal de tempo
real (WebSocket) são simulados no navegador com [MSW](https://mswjs.io/) e
um servidor Socket.IO emulado sobre o handler de WebSocket do MSW. O
objetivo do desafio é validar a integração real com essa camada —
roteamento, cache, formulários, tempo real, recuperação de erro — não a
existência de um servidor de verdade. O código da aplicação (Axios,
`socket.io-client`) não sabe que fala com um mock.

## Estrutura de pastas

```
src/
  app/            bootstrap (providers de Query e Router, montagem do tempo real)
  routes/         rotas TanStack Router (uma por tela + layout raiz)
  features/       uma pasta por tela/domínio (catalog, nft-detail, cart,
                  checkout, auth, account) — página e componentes exclusivos
  components/
    ui/           componentes shadcn/ui (Button, Dialog, Select, Tabs…) sobre
                  Radix UI, adaptados à identidade do Figma
    layout/       Header, Footer, MobileTabBar, NotFound
    nft/          NftArt (arte do Figma com fallback procedural)
    dev/          ScenarioPanel (troca de cenário e reset dos mocks)
  lib/
    api/          um módulo por recurso (nfts, cart, orders…) com hooks do
                  TanStack Query sobre o `apiClient` (Axios) — nenhuma tela
                  chama Axios diretamente
    socket/       cliente Socket.IO + `useRealtime` (eventos → cache)
    query/        QueryClient (política de cache/retry) e `queryKeys`
    checkout/     idempotency key da tentativa de compra
    auth/         token, guarda de rota, usuário da sessão
  mocks/
    handlers/     handlers HTTP por recurso, espelhando `lib/api/*`
    fixtures.ts   catálogo determinístico (PRNG com semente fixa), cupons,
                  usuários
    db.ts         "banco" em memória, persistido em localStorage
    scenarios.ts  cenários de rede/negócio (ver README)
    socket.ts     servidor Socket.IO emulado (`nft.updated`, `order.updated`)
  types/api.ts    contratos compartilhados entre handlers e hooks
e2e/              suíte Playwright
scripts/          auditoria Lighthouse e verificações auxiliares
reports/lighthouse/  relatórios da auditoria (versionados)
```

## Stack e papel de cada peça

- **TanStack Router**: todas as rotas, parâmetros (`/nft/$nftId`,
  `/pedido/$orderId`) e a busca tipada do catálogo (termo, filtros,
  ordenação e página vivem na URL e sobrevivem a refresh e ao histórico). As
  rotas privadas usam `beforeLoad` com `requireSession`
  (`src/lib/auth/require-session.ts`). Cada rota carrega seu próprio chunk.
- **TanStack Query**: todo o estado remoto — consultas, mutações, cache,
  invalidação e atualização otimista.
- **Axios**: cliente HTTP único (`src/lib/api/client.ts`), timeout de 4.5s,
  interceptor que injeta `Authorization: Bearer <token>` (ou `X-Guest-Id`
  para visitantes) e converte o corpo de erro em `KurioApiError`.
- **shadcn/ui**: os componentes de `src/components/ui` seguem o padrão do
  shadcn/ui (código no repositório, Radix UI por baixo, variantes com
  `class-variance-authority` e `cn` com `tailwind-merge`), com
  `components.json` configurado para o CLI. Cores, raios e tipografia foram
  trocados pelos tokens do Figma em `tailwind.config.ts`. O `cn` estende o
  `tailwind-merge` com os tamanhos de fonte do tema — sem isso, `text-body`
  e `text-caption` eram lidos como cor e apagavam a cor real do componente.

## Contrato REST

Tipos em `src/types/api.ts`, usados pelos handlers e pelos hooks — o mesmo
tipo nos dois lados.

### Convenções

- Base `/api`, JSON nos dois sentidos.
- Valores em ETH trafegam sempre como **string decimal** (`"1.25"`), nunca
  `number`. Quantidades são inteiros.
- Autenticação por `Authorization: Bearer <token>`. Rotas de carrinho e
  cotação aceitam visitante pelo header `X-Guest-Id`.
- Erros sempre no formato:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "…", "fields": { "email": "…" } } }
```

| Status | `code` | Quando |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Payload inválido; `fields` traz a mensagem por campo |
| 401 | `UNAUTHORIZED` | Sem sessão numa rota privada |
| 401 | `SESSION_EXPIRED` | Token vencido (30 min) ou cenário `session-expired` |
| 403 | `FORBIDDEN` | Recurso de outra conta (pedido, carteira) |
| 404 | `NOT_FOUND` | Recurso inexistente |
| 409 | `CONFLICT` | E-mail ou usuário já em uso (`fields`) |
| 409 | `AVAILABILITY_CONFLICT` | Estoque insuficiente, ou preço/disponibilidade/taxas mudaram desde a cotação |
| 409 | `IDEMPOTENCY_MISMATCH` | Idempotency key reutilizada com outro conteúdo |
| 500/503 | `TRANSIENT_FAILURE` | Falha transitória (cenário `server-errors`) |
| — | — | Falha de rede (cenários `offline`, `flaky-network`): a requisição não chega a responder |

### Sessão e conta

| Método e rota | Corpo | Resposta |
| --- | --- | --- |
| `POST /api/auth/signup` | `SignupPayload { username, email, password }` | `201 Session & { token }` · 400 · 409 `CONFLICT` |
| `POST /api/auth/login` | `LoginPayload { email, password }` | `200 Session & { token }` · 400 (credenciais inválidas no campo `password`) |
| `GET /api/auth/session` | — | `200 Session { user, expiresAt }` · 401 |
| `POST /api/auth/logout` | — | `204` |

### NFTs

| Método e rota | Parâmetros | Resposta |
| --- | --- | --- |
| `GET /api/nfts` | `q`, `category` (repetível), `network` (repetível), `minPrice`, `maxPrice`, `sort` (`recent`·`price_asc`·`price_desc`·`trending`), `page`, `pageSize` (≤ 24) | `Paginated<Nft> { items, page, pageSize, total, totalPages }` |
| `GET /api/nfts/facets` | mesmos filtros | `NftFacets { categories, networks, priceRange }` — cada eixo conta ignorando o próprio filtro |
| `GET /api/nfts/:id` | id ou slug | `Nft` · 404 |
| `GET /api/nfts/:id/related` | — | `{ items: Nft[] }` · 404 |

### Favoritos (autenticado)

| Método e rota | Corpo | Resposta |
| --- | --- | --- |
| `GET /api/favorites` | — | `{ items: Nft[] }` |
| `POST /api/favorites` | `{ nftId }` | `201` · 404 |
| `DELETE /api/favorites/:nftId` | — | `204` |

### Carrinho (sessão ou visitante)

| Método e rota | Corpo | Resposta |
| --- | --- | --- |
| `GET /api/cart` | — | `Cart { id, items: { nftId, quantity, nft }[], couponCode, updatedAt }` |
| `POST /api/cart/items` | `CartMutationPayload { nftId, quantity }` | `201 Cart` · 400 · 404 · 409 `AVAILABILITY_CONFLICT` |
| `PATCH /api/cart/items/:nftId` | `{ quantity }` | `Cart` · 400 · 404 · 409 |
| `DELETE /api/cart/items/:nftId` | — | `Cart` |
| `POST /api/cart/coupon` | `{ code }` | `Cart` · 400 (`couponCode`: inexistente ou expirado) |
| `DELETE /api/cart/coupon` | — | `Cart` |

### Cotação

| Método e rota | Resposta |
| --- | --- |
| `GET /api/quote` | `Quote { lines, subtotalEth, discountEth, networkFeeEth, totalEth, couponCode, couponValid, isStale, quotedAt }` |

Cada linha traz `unitPriceEth`, `subtotalEth`, `availableEditions`,
`nftVersion`, `priceChanged` e `availabilityChanged`. A taxa de rede é
`max(0.004, 0.6% do subtotal)`; o desconto vem do cupom válido. `isStale`
indica que preço ou disponibilidade mudaram desde a última cotação vista,
ou que a quantidade passou da disponibilidade.

### Pedidos (autenticado)

| Método e rota | Corpo | Resposta |
| --- | --- | --- |
| `POST /api/orders` | `CreateOrderPayload { walletId, network, couponCode, idempotencyKey, quotedVersions, quotedTotalEth }` | `201 Order` (pendente) · `200 Order` (mesma key e mesmo conteúdo) · 400 (key ausente, carteira inválida ou desconectada, carrinho vazio) · 409 `AVAILABILITY_CONFLICT` · 409 `IDEMPOTENCY_MISMATCH` |
| `GET /api/orders/:id` | — | `Order` (estado atual e recibo) · 403 · 404 |
| `GET /api/orders` | — | `{ items: Order[] }` |

O `Order` guarda um retrato do pedido: itens com `unitPriceEth` e
quantidade do momento da compra, subtotal, desconto, taxa, total, rede,
carteira e `transactionHash` simulado. Mudanças posteriores no catálogo não
alteram o recibo.

### Perfil (autenticado)

| Método e rota | Corpo | Resposta |
| --- | --- | --- |
| `GET /api/profile` | — | `User` |
| `PATCH /api/profile` | `UpdateProfilePayload { displayName, username }` | `User` · 400 · 409 (usuário em uso) |
| `POST /api/profile/avatar` | `{ avatarUrl }` | `User` |
| `POST /api/profile/password` | `ChangePasswordPayload { currentPassword, newPassword }` | `204` · 400 (senha atual incorreta ou nova curta) |

### Carteiras (autenticado)

| Método e rota | Corpo | Resposta |
| --- | --- | --- |
| `GET /api/wallets` | — | `{ items: Wallet[] }` |
| `POST /api/wallets` | `UpsertWalletPayload { role, provider, network, address, ensName? }` | `201 Wallet` · 400 |
| `PATCH /api/wallets/:id` | `Partial<UpsertWalletPayload>` | `Wallet` · 400 · 403 · 404 |
| `POST /api/wallets/:id/connect` | — | `WalletConnectionResult { status: 'connected' \| 'declined', wallet }` · 403 · 404 |
| `POST /api/wallets/:id/disconnect` | — | `Wallet` · 403 · 404 |

Tornar uma carteira `primary` rebaixa a anterior para `secondary`. A recusa
na carteira é uma decisão do usuário, não um erro HTTP: vem como
`status: 'declined'`.

O plano de controle dos mocks (`/api/mocks/*`) não faz parte deste
contrato — ver README.

## Eventos Socket.IO

### Transporte

`socket.io-client` com `transports: ['websocket']`, conectado a um servidor
Socket.IO emulado por `@mswjs/socket.io-binding` sobre `ws.link('*')` do
MSW (`src/mocks/socket.ts`). Reconexão automática do cliente (500ms a 4s).

### Eventos

Todo evento tem identidade estável (`eventId`), o recurso afetado e a
versão do recurso depois da mudança.

`nft.updated` — preço ou disponibilidade mudou (compra, `price-drift`,
`sold-out` ou plano de controle).

| Campo | Tipo |
| --- | --- |
| `type` | `'nft.updated'` |
| `eventId` | `string` |
| `nftId` | `string` |
| `version` | `number` |
| `priceEth` / `previousPriceEth` | `string` (decimal) |
| `editionsAvailable` | `number` |
| `emittedAt` | ISO 8601 |

`order.updated` — pedido saiu de `pending` para `confirmed` ou `declined`.

| Campo | Tipo |
| --- | --- |
| `type` | `'order.updated'` |
| `eventId` | `string` |
| `orderId` / `userId` | `string` |
| `version` | `number` |
| `status` | `'pending' \| 'confirmed' \| 'declined'` |
| `transactionHash` | `string \| null` |
| `emittedAt` | ISO 8601 |

### Garantias no cliente (`src/lib/socket/useRealtime.ts`)

- **Duplicados**: `eventId` já visto é ignorado.
- **Atrasados**: evento com `version` menor ou igual à conhecida é ignorado;
  os patches no cache também só aplicam versão maior — o estado nunca
  regride e nenhum efeito é reaplicado.
- **Outra conta**: `order.updated` de outro `userId` é descartado.
- **Sessão**: o socket pertence à sessão. Ao sair ou trocar de conta, o
  socket e as inscrições são encerrados e refeitos, junto com o registro de
  eventos vistos. Os listeners são removidos ao desmontar.
- **Reconexão**: ao reconectar, as consultas de NFTs, carrinho, cotação e
  pedidos são invalidadas e refeitas via REST.

### Limitações do transporte

- A binding não modela rooms nem namespaces: todo evento vai para todas as
  conexões e o cliente filtra pelo `userId`.
- Só WebSocket — sem fallback de long-polling do Engine.IO.
- O servidor simulado vive na aba: eventos não atravessam abas nem
  navegadores (o banco em localStorage é compartilhado entre abas, os
  eventos não).
- Sem acks nem entrega garantida; a reconciliação REST na reconexão cobre o
  que se perdeu.

## Política de sessão

- Login e cadastro devolvem um token opaco, guardado em localStorage
  (`kurio:token`) e enviado como Bearer. A sessão no servidor simulado dura
  30 minutos.
- A sessão é consultada no boot (`GET /api/auth/session`, cache de 60s).
  Recarregar a página recupera a sessão pelo token.
- Rotas privadas (checkout, pedido, perfil, carteiras) passam por
  `requireSession`; sem sessão, vão para `/login?redirect=<destino>` e o
  login devolve o usuário ao destino.
- Qualquer resposta `SESSION_EXPIRED` (navegação ou checkout) limpa o
  token, zera a sessão no cache e leva a `/login?redirect=<rota atual>`. O
  carrinho fica no servidor, então o checkout é retomado de onde parou.
- Logout (e troca de usuário) chama `POST /api/auth/logout`, apaga o token,
  remove do cache favoritos, carrinho, pedidos, perfil e carteiras, e
  refaz o socket sem as inscrições da sessão anterior.
- Senhas nunca são guardadas em claro: o banco simulado guarda o hash
  SHA-256.

## Estratégia do carrinho

- O carrinho vive no servidor simulado, por dono: `user:<id>` para
  usuários, `guest:<id>` para visitantes. O id de visitante é gerado e
  guardado em localStorage (`kurio:guestId`) e enviado em `X-Guest-Id`.
- Por estar no servidor, o carrinho sobrevive a refresh. No login e no
  cadastro o carrinho de visitante é somado ao do usuário.
- O cliente só guarda o cache do TanStack Query (`staleTime` 5s). Toda
  mutação (adicionar, alterar quantidade, remover, cupom) é validada no
  servidor — quantidade inteira, disponibilidade por NFT e por edição — e
  invalida carrinho e cotação.
- Os totais nunca são calculados no cliente: vêm da cotação.
- `nft.updated` invalida carrinho e cotação; a cotação marca `isStale` e a
  tela avisa. O checkout guarda a cotação que o colecionador aceitou: se a
  do servidor mudar (total, preço, quantidade ou versão de algum item), a
  confirmação fica bloqueada até ele clicar em "Aceitar novos valores".
  Quantidade acima da disponibilidade bloqueia até ser ajustada no carrinho.
  Na criação do pedido o servidor ainda revalida versões, total e
  disponibilidade.
- Após a confirmação, o servidor remove do carrinho os itens comprados; se
  o pagamento é recusado, o carrinho fica intacto.

## Cache, retry e sincronização

### Cache (`src/lib/query/client.ts` e `src/lib/api/*`)

| Recurso | `staleTime` | Observação |
| --- | --- | --- |
| Padrão | 10s | `gcTime` 5 min, refetch ao focar a janela |
| Sessão | 60s | Sem retry |
| Catálogo, detalhe, facetas | 15s | Chave inclui todos os filtros e a página |
| Relacionados | 30s | |
| Favoritos | 15s | |
| Carrinho | 5s | |
| Cotação | 0 | Sempre revalidada; refetch ao focar |
| Pedido | padrão | Polling a cada 1.5s enquanto pendente |

### Retry

- Consultas: erros 4xx não são repetidos (exceto 429). Falha de rede e 5xx
  são repetidos até 2 vezes, com backoff de 1s e 2s (máx. 4s).
- Mutações: nunca repetidas automaticamente.
- Criação de pedido: nunca repetida automaticamente. Após timeout do
  cliente, a interface oferece "Verificar status do pedido", que reenvia a
  mesma idempotency key e recupera o mesmo pedido.

### Sincronização

- **Após mutações**: cada mutação invalida exatamente o que muda —
  carrinho → carrinho + cotação; pedido → carrinho + cotação e grava o
  pedido no cache; carteiras → lista de carteiras; login → carrinho e
  favoritos.
- **Após eventos**: `nft.updated` corrige detalhe e listas no cache (se a
  versão for maior) e invalida carrinho e cotação; `order.updated` corrige o
  pedido e, se terminal, invalida o carrinho.
- **Respostas obsoletas**: as consultas recebem o `AbortSignal` do TanStack
  Query e o repassam ao Axios, então requisições abandonadas são
  canceladas. Como a chave inclui todos os parâmetros, uma resposta atrasada
  só preenche a própria chave e nunca substitui a tela atual (coberto pelo
  cenário `out-of-order`).
- **Isolamento**: dados privados ficam sob chaves removidas no logout; a
  API filtra tudo pelo usuário da sessão e responde 403 para recursos de
  outra conta.

### Atualização otimista com rollback

`useToggleFavoriteMutation` (`src/lib/api/favorites.ts`): remover um
favorito atualiza o cache imediatamente (`onMutate`) e restaura o snapshot
anterior se a chamada falhar (`onError`). Assimétrico de propósito: só a
remoção precisa parecer instantânea; adicionar não tem o mesmo custo de
espera percebida.

## Checkout: idempotência, timeout e duplo clique

`POST /api/orders` recebe uma `idempotencyKey` (gerada por tentativa de
compra, persistida enquanto a tentativa não termina). O handler
(`src/mocks/handlers/orders.ts`) **reserva o pedido imediatamente** — antes
de qualquer atraso de rede simulado — e só depois aplica o atraso na
resposta. Isso garante:

- **Duplo clique / novo clique após timeout**: uma requisição repetida com a
  mesma key encontra o pedido já reservado e recebe a mesma resposta.
- **Timeout do cliente (cenário `order-timeout`)**: o timeout do Axios (4.2s
  na criação) estoura antes da resposta simulada (~5.2s). A interface trata
  isso como "pode já ter sido processado" e oferece "Verificar status do
  pedido", que recupera o pedido já criado.
- **Revalidação**: o servidor compara as versões e o total cotados com o
  estado atual e a disponibilidade; qualquer diferença vira 409
  `AVAILABILITY_CONFLICT` e a interface pede nova confirmação.
- **Desfecho**: o pedido fica pendente por 3s e é decidido pela simulação
  (confirmado em `default`, recusado em `order-declined`); o resultado chega
  por `order.updated` e também é resolvido na próxima consulta REST, então
  reload e reconexão recuperam o estado sem nova compra. Confirmado e
  recusado são terminais.

## Mocks (MSW)

MSW intercepta na camada de rede (Service Worker para HTTP, patch de
`WebSocket` para o tempo real). Os mesmos handlers servem desenvolvimento,
o build publicado e os testes. Componentes, hooks e o cliente Axios não
contêm respostas fictícias.

- **Estado**: um banco em memória (`src/mocks/db.ts`) com NFTs, usuários,
  sessões, favoritos, carrinhos, cupons, pedidos e carteiras, persistido em
  localStorage — sobrevive a refresh. REST e Socket.IO leem e escrevem o
  mesmo banco; mudanças de NFT passam todas por `applyNftChange`, que grava e
  emite o evento na mesma operação.
- **Fixtures**: 42 NFTs gerados com PRNG de semente fixa (categorias, redes,
  preços e edições variados para filtros e paginação), dois usuários, três
  cupons (dois válidos, um expirado).
- **Determinismo**: nenhum cenário depende de `Math.random`. Latência e
  quedas do `flaky-network` vêm de um PRNG com semente fixa, reiniciado a
  cada carregamento e reset; o desfecho do pagamento e a conexão da
  carteira dependem só do cenário.
- **Plano de controle**: `/api/mocks/reset`, `/api/mocks/nfts/:id` e
  `/api/mocks/events/:eventId/replay` permitem restaurar o estado e disparar
  ou repetir eventos num instante escolhido (ver README).

### O bug do WebSocket e como foi corrigido

Durante o desenvolvimento, o handshake do Socket.IO falhava contra o mock
(`Unexpected response code: 200`). Causa: `engine.io-client` captura
`globalThis.WebSocket` numa constante de módulo no momento do import — e
`socket.io-client` era importado estaticamente, antes de `worker.start()`
aplicar o patch do MSW. Correção: `src/lib/socket/client.ts` importa
`socket.io-client` dinamicamente dentro de `getSocket()`, chamado só depois
que a árvore React monta — que por sua vez espera `enableMocking()`.

### Carregamento

`src/main.tsx` só renderiza depois que o MSW está de pé — a primeira tela já
nasce com o "servidor" pronto, sem piscar um estado vazio. O chunk do MSW e
o registro do Service Worker têm até três tentativas; se ainda assim
falharem, a aplicação renderiza e o cliente HTTP trata a ausência da API
como falha de conexão (estados de erro, não uma tela quebrada). Carregar
aplicação e MSW em paralelo foi testado e piorou o LCP mobile — ver
`reports/lighthouse/README.md`.

## Acessibilidade

- Menu mobile e autenticação como diálogos Radix: foco movido ao abrir,
  preso dentro, Esc fecha e o foco volta ao gatilho.
- Skip link ("Pular para o conteúdo") como primeiro elemento focável.
- Erros de formulário associados ao campo via `aria-describedby` +
  `aria-invalid`.
- Feedback de mutações (toasts, `role="status"`/`role="alert"`) e de tempo
  real (avisos de mudança de preço, status da carteira com `aria-live`).
- Skeletons com shimmer respeitam `prefers-reduced-motion`.
- Testado por teclado em `e2e/11-accessibility-keyboard.spec.ts`.

### Ajustes de acessibilidade em relação ao layout

- Anel de foco visível em todos os controles (o Figma não desenha foco).
- Rótulos visuais onde o Figma mostra só placeholder (mobile de
  login/cadastro usa rótulo `sr-only`, que continua associado ao campo).
- As abas "Todos os NFTs / Novos lançamentos / Em alta" são botões de
  alternância (`aria-pressed`): elas filtram a mesma grade, não controlam
  painéis diferentes.
- Ícones de compartilhar do detalhe têm `role="img"` com rótulo, já que são
  ilustrativos.
- Estado nunca só por cor: status da carteira, avisos e pedido recusado têm
  texto e ícone.

## Decisões de UX

- **Autenticação**: no desktop, modal sobre o catálogo como no Figma, mas
  com rota própria (`/login`, `/signup`) — preserva deep link, refresh e o
  retorno ao fluxo via `?redirect`. No mobile, tela inteira (frames próprios
  do Figma).
- **Layouts mobile**: onde o Figma muda só o fluxo da página, breakpoints
  CSS; onde é outra composição (catálogo, detalhe, carrinho, login, cadastro,
  pagamento), um layout próprio via `useIsMobile()` — assim não há elementos
  duplicados escondidos por CSS.
- **Cotação desatualizada**: a compra é bloqueada com aviso até o
  colecionador aceitar os novos valores — nunca se confirma em silêncio um
  total que ele não viu.
- **Ações fora do escopo** aparecem desabilitadas ou com mensagem neutra —
  login social, "Ver no Etherscan", newsletter, itens "Criadores" e
  "Aprenda" do menu —, nunca com cara de sucesso.
- **Erros recuperáveis** trazem a ação de recuperação no próprio lugar
  ("Tentar novamente" no catálogo, "Verificar status do pedido" no checkout).

## Desvios do Figma

- **Pagamento mobile (16:748)**: o frame não tem dados do colecionador,
  lista de itens nem seletor de rede. Eles foram mantidos — dados e rede
  abaixo das opções de carteira, itens e taxas num resumo recolhível —
  porque o fluxo exige coletar e revisar antes de enviar. O link "Trocar
  carteira" virou a ação de conexão (Conectar / Desconectar / Tentar
  novamente); trocar de carteira é feito pelos próprios cartões. Tipos de
  carteira sem cadastro aparecem desabilitados.
- **Autenticação no desktop**: modal com rota própria (ver Decisões de UX).
- **Compartilhar** (detalhe) e **"Ver no Etherscan"** (recibo) são
  ilustrativos: não há rede social nem blockchain reais.

### Substituições de assets

- **Artes dos NFTs**: as quatro ilustrações do Figma foram exportadas em
  250px e 500px (`public/nft`) e se repetem entre os 42 NFTs das fixtures.
  Se uma imagem não carrega, `NftArt` desenha uma arte procedural a partir
  do `seed` do NFT.
- **Ícones**: `lucide-react` no lugar do conjunto Iconly do Figma, com as
  mesmas metáforas.
- **Envelope "THANK YOU"** do recibo (node 11:5150): SVG inline que
  reproduz o desenho.
- **Marcas Google e Facebook** do login social: SVG inline das marcas.
- **Fonte**: Roboto Mono (a família do Figma) servida localmente por
  `@fontsource/roboto-mono`, sem requisição externa.

## Estratégia de testes E2E

Ver README para como rodar. Decisões notáveis:

- Contra o build de produção (`vite preview`), nunca `vite dev`, em
  Chromium desktop (1440px) e mobile (Pixel 5, 390px).
- Cada teste começa num contexto novo — banco simulado limpo.
- Cenário por teste via `page.addInitScript` (`kurio:scenario`); os
  handlers leem o cenário a cada requisição, então ele também pode mudar no
  meio do teste.
- Eventos em instantes precisos pelo plano de controle
  (`e2e/support/api.ts`): mudar preço com o usuário no checkout, reenviar
  eventos antigos ou duplicados.
- Relógio controlado (`page.clock`) onde o resultado depende do tempo:
  expiração da sessão (30 min) e desfecho do pedido pendente (3s).
- `fetch()` direto de `page.evaluate` não passa pelo interceptor do Axios —
  helpers como `fetchOrders` replicam o Bearer token manualmente.

## Limitações e problemas conhecidos

- **Sem backend real**: os dados vivem no localStorage do navegador. Outro
  navegador ou dispositivo começa do zero, e eventos em tempo real não
  atravessam abas.
- **Service Worker obrigatório**: navegadores ou modos que bloqueiam Service
  Worker deixam a aplicação sem dados (o erro aparece no console).
- **Performance mobile no Lighthouse** abaixo de 90 (87–88): o LCP depende
  do bundle da aplicação e do worker do MSW, que precisa subir antes da
  primeira tela. Análise completa em `reports/lighthouse/README.md`.
- **Cálculos em ETH no servidor simulado** usam `number` do JavaScript com
  arredondamento a 4 casas; os valores trafegam sempre como string decimal,
  mas um backend real deveria calcular em inteiros (wei).
- **Cenário `out-of-order`** só afeta as três primeiras listagens depois de
  cada carregamento da página.
- **Baselines de regressão visual** são por sistema operacional; as
  versionadas são do Windows.
- **Carrinho de visitante** depende do id em localStorage: limpar os dados
  do site perde o carrinho.

## Deploy

**URL:** https://junglechallenge.vercel.app/

A aplicação é 100% estática. O `vercel.json` reescreve qualquer rota para
`index.html` (arquivos existentes continuam servidos direto), o que permite
acesso direto e refresh em `/nft/:id`, `/cart`, `/checkout`, `/pedido/:id`
etc.
