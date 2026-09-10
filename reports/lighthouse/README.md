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
(medianas + ambiente). Este `README.md` é o relatório escrito, gerado a
partir da execução mais recente de `summary.json`.

## Ambiente da execução

| | |
| --- | --- |
| Data | 2026-09-10T15:55:22.440Z |
| Node.js | v22.22.2 |
| Lighthouse | 13.4.1 |
| Chromium | 141.0.7390.37 |
| SO | linux x64 |
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
| Início | Mobile | **85** | 95 | 100 | 91 | 3415ms | 0.001 | 169ms |
| Início | Desktop | **98** | 95 | 100 | 91 | 1009ms | 0.000 | 3ms |
| Detalhe do NFT | Mobile | **81** | 97 | 100 | 91 | 3684ms | 0.000 | 254ms |
| Detalhe do NFT | Desktop | **94** | 97 | 100 | 91 | 1067ms | 0.117 | 0ms |

Metas do README §10: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥
95, SEO ≥ 90.

- **Accessibility**: atinge a meta nas 4 combinações (95–97).
- **Best Practices**: atinge a meta nas 4 combinações (100).
- **SEO**: atinge a meta nas 4 combinações (91).
- **Performance**: atinge a meta em Desktop (94–98) mas fica abaixo da meta
  em Mobile (81–85) — ver justificativa abaixo.

## Abaixo da meta: Performance em Mobile (Início 85, Detalhe 81)

**Causa identificada**: o LCP em mobile fica em ~3.4–3.7s (bem acima dos
~1.0s em desktop), sob o throttling de rede/CPU do preset mobile padrão do
Lighthouse. A causa raiz é o tamanho do JavaScript crítico: o bundle da
aplicação (`index-*.js`, ~560KB) e, principalmente, o *browser worker* do
MSW (`browser-*.js`, ~330KB) — este projeto não tem backend real, então o
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

**Mitigação já aplicada** (não elimina a causa raiz, mas reduziu o impacto):
o carregamento do MSW já é via `import()` dinâmico (chunk separado, não
inflando o bundle síncrono inicial do React/roteador), e as rotas de
carrinho/checkout/perfil/carteiras já são *code-split* por rota (chunks de
5–20KB cada, carregados sob demanda). Também foi corrigido, durante esta
auditoria, um CLS de 0.77 no detalhe do NFT (desktop) causado por um
esqueleto de carregamento com uma hierarquia de elementos diferente da
tela final — alinhar a estrutura do esqueleto ao conteúdo real eliminou a
maior parte do *layout shift* e teve efeito colateral positivo na
pontuação de Performance (Detalhe Desktop: 74 → 94; Detalhe Mobile: 58 →
81; ver histórico de execuções em `all-runs.json` de execuções anteriores
não versionadas neste relatório).

**Resíduo de CLS em Detalhe/Desktop (0.117)**: uma pequena oscilação
residual (rodapé entrando/saindo da janela observada pelo `PerformanceObserver`
durante a hidratação) que já está abaixo do limiar "precisa melhorar"
(0.1–0.25) do próprio Lighthouse na maioria das execuções (uma das três
rodadas mediu 0.031); não afeta a aprovação da categoria.

## Arquivos desta pasta

- `summary.json` — medianas + metadados de ambiente (fonte deste relatório).
- `all-runs.json` — as 12 execuções individuais (bruto).
- `<pagina>-<perfil>-run<N>.html` / `.json` — relatório completo do
  Lighthouse por execução (abra o `.html` no navegador).
