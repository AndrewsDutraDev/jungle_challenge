import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

/**
 * Conecta a carteira simulada no checkout, tolerando a recusa aleatória de
 * `simulateConnect()` (~15% de chance, ver `CheckoutPage.tsx`) — tenta de
 * novo pelo mesmo botão ("Tentar novamente" ocupa o lugar de "Conectar"
 * após uma recusa) até conectar. Não faz nada se a carteira selecionada já
 * estiver conectada (carteira seed de Ana já nasce conectada).
 */
export async function connectWallet(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const trigger = page.getByRole('button', { name: /^(Conectar|Tentar novamente)$/ })
    if ((await trigger.count()) === 0) return // nenhum botão de conectar — já está conectada
    await trigger.click()
    const connected = page.getByText('Carteira conectada')
    const declined = page.getByText('Conexão recusada pela carteira.')
    await expect(connected.or(declined)).toBeVisible({ timeout: 3000 })
    if (await connected.isVisible()) return
  }
  throw new Error('Não foi possível conectar a carteira simulada após múltiplas tentativas.')
}
