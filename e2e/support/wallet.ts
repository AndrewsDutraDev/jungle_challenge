import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

/**
 * Conecta a carteira simulada no checkout. A conexão passa pela API mockada
 * (`POST /api/wallets/:id/connect`) e é determinística: no cenário `default`
 * sempre conecta; a recusa só acontece em `wallet-declined`, coberta em
 * `07-checkout-failure-recovery.spec.ts`. Não faz nada se a carteira
 * selecionada já estiver conectada (a carteira seed de Ana já nasce conectada).
 */
export async function connectWallet(page: Page): Promise<void> {
  const connected = page.getByText('Carteira conectada')
  const trigger = page.getByRole('button', { name: 'Conectar', exact: true })
  await expect(connected.or(trigger)).toBeVisible()
  if (await connected.isVisible()) return

  await trigger.click()
  await expect(connected).toBeVisible()
}
