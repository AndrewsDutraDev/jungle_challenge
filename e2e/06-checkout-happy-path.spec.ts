import { test, expect, type Page } from '@playwright/test'
import { SEED_USERS, loginAs, logout } from './support/auth'
import { connectWallet } from './support/wallet'

/**
 * Se a cotação vista no checkout ficou para trás da do servidor (por exemplo,
 * o resumo ainda estava sendo recalculado quando o clique aconteceu), o
 * servidor a recusa com 409 e a página pede nova confirmação — o
 * comportamento correto, coberto no fluxo 9. Aqui o caminho feliz só
 * confirma de novo, em vez de falhar por timing.
 */
async function confirmPurchase(page: Page) {
  const staleQuote = page.getByRole('alert').filter({ hasText: 'mudaram desde a última cotação' })
  const acceptNewValues = page.getByRole('button', { name: 'Aceitar novos valores' })
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (await acceptNewValues.isVisible()) await acceptNewValues.click()
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
    test.setTimeout(60_000)
    await loginAs(page, SEED_USERS.ana)

    await page.goto('/')
    await page.waitForSelector('a[href^="/nft/"]')
    await page.locator('a[href^="/nft/"]').first().click()
    await page.getByRole('button', { name: /COMPRAR|Comprar NFT/ }).click()
    await expect(page).toHaveURL(/\/cart/)

    await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
    await expect(page).toHaveURL(/\/checkout/)
    await expect(page.getByText('Perfil do colecionador')).toBeVisible()

    // Ana já tem uma carteira principal seedada e conectada.
    await connectWallet(page)
    await confirmPurchase(page)

    // No cenário `default` o pagamento é sempre confirmado (a recusa é o
    // cenário `order-declined`, coberto no fluxo 7).
    await expect(page.getByText('Seus NFTs agora estão na sua carteira')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('ID da transação')).toBeVisible()
    await expect(page.getByText('Detalhes da transação')).toBeVisible()
    const receiptUrl = page.url()

    // O carrinho deve ter sido esvaziado após a confirmação.
    await page.goto('/cart')
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()

    // Outra conta não enxerga o recibo: o servidor responde 403 FORBIDDEN.
    await logout(page)
    await loginAs(page, SEED_USERS.marcos)
    await page.goto(receiptUrl)
    await expect(page.getByRole('alert')).toContainText('Este pedido pertence a outra conta')
    await expect(page.getByText('Seus NFTs agora estão na sua carteira')).toHaveCount(0)
  })
})
