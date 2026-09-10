import type { Page } from '@playwright/test'

/**
 * Ids de cenário espelhados de `src/mocks/scenarios.ts` (mantidos aqui, e não
 * importados diretamente, para que os testes não dependam da compilação do
 * bundle da aplicação — só do contrato do valor gravado em localStorage).
 */
export type ScenarioId =
  | 'default'
  | 'empty-catalog'
  | 'slow-network'
  | 'flaky-network'
  | 'offline'
  | 'server-errors'
  | 'session-expired'
  | 'price-drift'
  | 'order-timeout'
  | 'order-declined'

const STORAGE_KEY = 'kurio:scenario'

/**
 * Seleciona o cenário de mocks ANTES da navegação, via `addInitScript` — o
 * mesmo mecanismo do painel "Cenários de teste" (`localStorage`), de forma
 * determinística e sem interação manual. Deve ser chamado antes de
 * `page.goto`.
 */
export async function useScenario(page: Page, id: ScenarioId) {
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    [STORAGE_KEY, id] as const,
  )
}

/**
 * Restaura os dados simulados para o estado inicial conhecido. Precisa
 * rodar DEPOIS da navegação (via `page.evaluate`, não `page.request`) para
 * que a chamada passe pela interceptação do MSW no contexto do navegador —
 * uma requisição feita pelo lado Node do Playwright não atravessa o Service
 * Worker/WebSocketInterceptor da página.
 */
export async function resetMocks(page: Page) {
  await page.evaluate(() => fetch('/api/mocks/reset', { method: 'POST' }))
}
