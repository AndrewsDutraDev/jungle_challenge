import { test, expect } from '@playwright/test'
import { useScenario } from './support/scenario'
import { SEED_USERS, loginAs } from './support/auth'
import { fetchOrders } from './support/api'
import { connectWallet } from './support/wallet'

/** README §9, fluxo 7: falha de pagamento, clique repetido e timeout com recuperação do mesmo pedido. */
test.describe('Checkout — falhas e recuperação', () => {
  async function addFirstNftToCartAndReachCheckout(page: import('@playwright/test').Page) {
    await page.goto('/')
    await page.waitForSelector('a[href^="/nft/"]')
    await page.locator('a[href^="/nft/"]').first().click()
    await page.getByRole('button', { name: /COMPRAR|Comprar NFT/ }).click()
    await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
    await expect(page).toHaveURL(/\/checkout/)
    await connectWallet(page)
  }

  test('pagamento recusado preserva os itens no carrinho e permite nova tentativa', async ({ page }) => {
    await useScenario(page, 'order-declined')
    await loginAs(page, SEED_USERS.ana)
    await addFirstNftToCartAndReachCheckout(page)

    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page).toHaveURL(/\/pedido\//)
    await expect(page.getByText('Pagamento recusado')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Nenhum valor foi debitado e os itens seguem no seu carrinho')).toBeVisible()

    await page.getByRole('link', { name: 'Voltar ao carrinho' }).click()
    await expect(page).toHaveURL(/\/cart/)
    await expect(page.locator('[data-testid="cart-item"]')).toHaveCount(1)
  })

  test('clique repetido em "Confirmar compra" não duplica o pedido', async ({ page }) => {
    await loginAs(page, SEED_USERS.ana)
    await addFirstNftToCartAndReachCheckout(page)

    const submitBtn = page.getByRole('button', { name: 'Confirmar compra' })
    // Dois cliques em sequência: o botão desabilita assim que a mutation
    // entra em `isPending` (não é um debounce por tempo), então o segundo
    // clique não deveria disparar uma nova criação de pedido. Como o mock
    // responde rápido (a janela de "disabled" pode durar poucas dezenas de
    // ms, tempo insuficiente para observar de forma confiável via asserção),
    // não tentamos capturar esse estado transitório na UI — validamos o
    // efeito real: no máximo um pedido é criado no servidor, e o servidor
    // também protege pela mesma idempotencyKey (ver src/mocks/handlers/orders.ts).
    await submitBtn.click()
    await submitBtn.click({ timeout: 1000 }).catch(() => {})
    await expect(page).toHaveURL(/\/pedido\//, { timeout: 10_000 })

    const orders = await fetchOrders(page)
    expect(orders.items).toHaveLength(1)
  })

  test('timeout após criação do pedido recupera o mesmo pedido pela idempotência (sem duplicar)', async ({ page }) => {
    test.setTimeout(60_000)
    await useScenario(page, 'order-timeout')
    await loginAs(page, SEED_USERS.ana)
    await addFirstNftToCartAndReachCheckout(page)

    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    // O timeout do cliente (4.5s) estoura antes do servidor simulado
    // responder (o handler segura a resposta por ~5.2s de propósito) — a UI
    // deve reconhecer isso como "pode já ter processado", não como um erro
    // definitivo.
    await expect(page.getByText(/pode já ter sido processado/)).toBeVisible({ timeout: 8_000 })

    const retryBtn = page.getByRole('button', { name: 'Verificar status do pedido' })
    await expect(retryBtn).toBeVisible()
    await retryBtn.click()
    await expect(page).toHaveURL(/\/pedido\//, { timeout: 10_000 })

    const declined = page.getByText('Pagamento recusado')
    const confirmed = page.getByText('Seus NFTs agora estão na sua carteira')
    await expect(declined.or(confirmed)).toBeVisible({ timeout: 15_000 })

    // A mesma idempotencyKey deve ter recuperado o pedido já criado no
    // servidor — nunca duas compras distintas para esta única tentativa.
    const orders = await fetchOrders(page)
    expect(orders.items).toHaveLength(1)
  })
})
