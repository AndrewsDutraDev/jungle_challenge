import { test, expect, type Page } from '@playwright/test'
import { SEED_USERS, loginAs } from './support/auth'
import { connectWallet } from './support/wallet'

/**
 * No cenário `default` preços e taxas mudam em tempo real. Se uma mudança cai
 * entre a cotação e o clique, o servidor recusa a cotação antiga (409) e a
 * página pede nova confirmação — comportamento correto, coberto no fluxo 9.
 * Aqui o caminho feliz só confirma de novo, em vez de falhar por timing.
 */
async function confirmPurchase(page: Page) {
  const staleQuote = page.getByRole('alert').filter({ hasText: 'mudaram desde a última cotação' })
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    // Olha só o desfecho: o aviso some e reaparece rápido demais para ser
    // observado com segurança entre uma tentativa e outra.
    const reachedOrder = await page.waitForURL(/\/pedido\//, { timeout: 10_000 }).then(
      () => true,
      () => false,
    )
    if (reachedOrder || !(await staleQuote.isVisible())) break
  }
  await expect(page).toHaveURL(/\/pedido\//)
}

/** README §9, fluxo 6: compra completa, do catálogo ao recibo confirmado. */
test.describe('Checkout — compra completa', () => {
  test('do catálogo ao recibo confirmado', async ({ page }) => {
    test.setTimeout(90_000)
    await loginAs(page, SEED_USERS.ana)

    await page.goto('/')
    await page.waitForSelector('a[href^="/nft/"]')
    await page.locator('a[href^="/nft/"]').first().click()
    await page.getByRole('button', { name: /COMPRAR|Comprar NFT/ }).click()
    await expect(page).toHaveURL(/\/cart/)

    await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
    await expect(page).toHaveURL(/\/checkout/)
    await expect(page.getByText('Perfil do colecionador')).toBeVisible()

    // Ana já tem uma carteira principal seedada — só falta conectar.
    await connectWallet(page)

    await confirmPurchase(page)

    // No cenário "default" o desfecho tem ~12% de chance de recusa mesmo com
    // tudo correto (simula uma rede de pagamento real) — o README pede o
    // caminho confirmado, então em caso de recusa tentamos de novo (o botão
    // "Tentar novamente" gera um novo pedido/idempotencyKey). Poucas repetições
    // bastam: P(3 recusas seguidas) ≈ 0.17%.
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const declined = page.getByText('Pagamento recusado')
      const confirmed = page.getByText('Seus NFTs agora estão na sua carteira')
      await expect(declined.or(confirmed)).toBeVisible({ timeout: 15_000 })
      if (await confirmed.isVisible()) break
      await page.getByRole('link', { name: 'Tentar novamente' }).click()
      await expect(page).toHaveURL(/\/checkout/)
      await connectWallet(page)
      await confirmPurchase(page)
    }

    await expect(page.getByText('Seus NFTs agora estão na sua carteira')).toBeVisible()
    await expect(page.getByText('ID da transação')).toBeVisible()
    await expect(page.getByText('Detalhes da transação')).toBeVisible()

    // O carrinho deve ter sido esvaziado após a confirmação.
    await page.goto('/cart')
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
  })
})
