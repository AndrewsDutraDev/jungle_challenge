# Auditoria Lighthouse

Relatório da auditoria de performance/qualidade exigida no README §10:
início e detalhe do NFT, perfis mobile e desktop, build de produção
(`vite preview` sobre `vite build`), cenário padrão dos mocks (MSW +
Socket.IO reais, sem simplificações), três execuções por combinação.

## Como reproduzir

```bash
npm run build
npm run preview &        # serve em http://localhost:4173
npm run lighthouse       # scripts/lighthouse-audit.mjs — a configuração versionada da auditoria
```

Gera `reports/lighthouse/<pagina>-<perfil>-run<N>.{html,json}` (as 12
execuções individuais), `all-runs.json` (dados brutos) e `summary.json`
(medianas + ambiente). Este `README.md` é o relatório escrito sobre a
execução mais recente de `summary.json`.

## Ambiente da execução

| | |
| --- | --- |
| Data | 2026-09-11T14:18:04.271Z |
| Node.js | v24.18.0 |
| Lighthouse | 13.4.1 |
| Chrome | 153 (lido do *user agent* do próprio resultado, que informa só a versão maior) |
| SO | win32 x64 |
| URL base | http://localhost:4173 (build de produção local, `vite preview`) |
| Cenário dos mocks | `default` (latência de rede simulada normal, sem falhas injetadas) |
| Execuções por página/perfil | 3 (mediana reportada abaixo) |

Perfis: **Mobile** usa o preset padrão do Lighthouse (Moto G Power emulado,
throttling de rede/CPU 4G). **Desktop** usa `formFactor: 'desktop'`,
viewport 1440×900 e throttling leve (RTT 40ms, 10 Mbps, sem *slowdown* de
CPU) — a configuração exata está em `scripts/lighthouse-audit.mjs`
(`PROFILES`), versionada junto do código. Nenhuma imagem, fonte ou
funcionalidade foi desabilitada para a auditoria — o build audita a
aplicação real, com o painel de cenários (dev) e o cliente Socket.IO
carregados como em produção.

## Medianas (3 execuções)

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Início | Mobile | **88** | 100 | 100 | 92 | 3489ms | 0.002 | 28ms |
| Início | Desktop | **99** | 100 | 100 | 92 | 833ms | 0.001 | 0ms |
| Detalhe do NFT | Mobile | **87** | 100 | 100 | 92 | 3536ms | 0.000 | 13ms |
| Detalhe do NFT | Desktop | **99** | 100 | 100 | 92 | 820ms | 0.001 | 0ms |

As três execuções de cada combinação ficaram idênticas ou a 1 ponto umas
das outras.

Metas do README §10: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥
95, SEO ≥ 90.

- **Accessibility**: atinge a meta nas 4 combinações (100).
- **Best Practices**: atinge a meta nas 4 combinações (100).
- **SEO**: atinge a meta nas 4 combinações (92).
- **Performance**: atinge a meta em Desktop (99) e fica abaixo dela em
  Mobile (87–88) — ver justificativa abaixo.

## O que mudou nesta rodada

Comparado à auditoria anterior (Mobile 85/81, Desktop 98/94; Accessibility
95–97; CLS 0.117 no detalhe desktop):

- **Contraste do botão primário (Accessibility)** — "Entrar" e "Aplicar"
  saíam com texto claro `#F7F3EC` sobre `#D28A4C` (2.53:1, reprovado). A
  cor definida era a escura (`#140D0A`), mas o `tailwind-merge` não conhecia
  os tamanhos de fonte do tema (`text-body`, `text-caption`…) e os tratava
  como cor, descartando `text-primary-foreground`. A função `cn`
  (`src/lib/utils.ts`) passou a declarar esses tamanhos.
- **`aria-controls` para painéis inexistentes (Accessibility)** — as abas
  "Todos os NFTs / Novos lançamentos / Em alta" usavam Radix Tabs sem
  `TabsContent`, já que todas filtram a mesma grade. Viraram botões de
  alternância com `aria-pressed` (`SortBar.tsx`).
- **`aria-label` em `<span>` sem papel (Accessibility)** — os ícones
  ilustrativos de compartilhamento do detalhe ganharam `role="img"`.
- **CLS no detalhe do NFT** — o esqueleto de carregamento era mais baixo que
  a tela (o rodapé aparecia e era empurrado, 0.18 no desktop) e, no mobile,
  dispunha a galeria em linha enquanto a tela real põe a arte em largura
  total com as miniaturas embaixo (0.72). O esqueleto agora usa as mesmas
  classes da galeria real e reserva a seção de abas. Resultado: CLS ~0 nas 4
  combinações, e Detalhe Mobile 81 → 87.
- **LCP** — a arte principal (hero e detalhe) carrega com prioridade
  (`fetchpriority="high"`, sem lazy-load) e todas as artes declaram
  dimensões e `srcset` de 250/500px.

## Abaixo da meta: Performance em Mobile (Início 88, Detalhe 87)

**Causa identificada**: o LCP em mobile fica em ~3.5s (contra ~0.8s em
desktop), sob o throttling de rede/CPU do preset mobile padrão do
Lighthouse. TBT (14–31ms) e CLS (~0) já estão bons, então quase toda a
perda vem desse LCP. A causa raiz é o tamanho do JavaScript crítico: o
bundle da aplicação (`index-*.js`, ~565KB, 180KB gzip) e o *browser worker*
do MSW (`browser-*.js`, ~330KB) — este projeto não tem backend real, então o
MSW (interceptação HTTP + WebSocket) precisa estar pronto **antes** da
primeira renderização, para que a tela inicial já mostre dados reais em vez
de piscar um estado vazio/erro. Em `src/main.tsx`, `createRoot(...).render()`
só é chamado depois que `enableMocking()` resolve — uma escolha deliberada
de correção (não faz sentido renderizar antes de o "servidor" simulado
estar de pé), mas que coloca ~330KB adicionais no caminho crítico do
primeiro paint. Sob throttling mobile (rede ~1.6Mbps down / RTT alto + CPU
4x mais lenta), esse download e a inicialização do worker dominam o tempo
até o LCP.

Uma correção paliativa (adiar o carregamento do MSW, ou desabilitá-lo
seletivamente na auditoria) melhoraria artificialmente a pontuação sem
refletir o comportamento real da aplicação entregue — o README pede
explicitamente para não fazer isso ("sem simplificações exclusivas para
melhorar a pontuação"), então optamos por manter o comportamento real e
reportar a causa honestamente.

**Mitigação já aplicada** (não elimina a causa raiz, mas reduz o impacto):
o MSW é carregado via `import()` dinâmico (chunk separado, fora do bundle
síncrono do React/roteador), e as rotas de carrinho/checkout/perfil/
carteiras são *code-split* por rota (chunks de 5–20KB, sob demanda).

**Tentativa descartada — carregar aplicação e MSW em paralelo**: com a
aplicação importada dinamicamente em `main.tsx`, o bundle da aplicação e o
worker do MSW passam a baixar juntos. Medido nas mesmas condições, piorou o
mobile: Início 88 → 86 (LCP 3.49s → 3.79s) e Detalhe 87 → 86 (LCP 3.54s →
3.85s). Sob o throttling mobile os dois chunks disputam a mesma banda, e o
bundle da aplicação deixa de ser pré-carregado pelo HTML — só é descoberto
depois que o ponto de entrada executa. A mudança foi revertida.

**Próximo passo possível**: dividir o `index-*.js` (565KB) — hoje ele
carrega juntos o roteador, o React Query, os primitivos Radix e o cliente
Socket.IO. Separar o que a primeira tela não usa reduziria o JavaScript
crítico sem mudar o comportamento da aplicação.

## Arquivos desta pasta

- `summary.json` — medianas + metadados de ambiente (fonte deste relatório).
- `all-runs.json` — as 12 execuções individuais (bruto).
- `<pagina>-<perfil>-run<N>.html` / `.json` — relatório completo do
  Lighthouse por execução (abra o `.html` no navegador).
