import type { Page } from '@playwright/test'

/**
 * Chama a API mockada a partir do contexto do NAVEGADOR (não do lado Node do
 * Playwright) — necessário para atravessar a interceptação do MSW — e já
 * inclui o Bearer token da sessão (mesma chave usada por `token-store.ts`),
 * já que uma chamada `fetch` direta não passa pelo interceptor do Axios que
 * normalmente injeta esse header.
 */
export async function fetchOrders(page: Page): Promise<{ items: Array<{ id: string; status: string }> }> {
  return page.evaluate(async () => {
    const token = window.localStorage.getItem('kurio:token')
    const res = await fetch('/api/orders', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    return res.json()
  })
}
