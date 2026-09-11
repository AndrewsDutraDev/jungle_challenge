import { test, expect } from '@playwright/test'
import { SEED_USERS, loginAs } from './support/auth'
import { connectWallet } from './support/wallet'
import { fetchOrders } from './support/api'

/**
 * README §9, fluxo 10: eventos duplicados ou antigos, desconexão e retomada
 * de pedido pendente.
 *
 * A tolerância a duplicatas/eventos antigos é garantida no cliente por
 * versionamento (`seenEvents`/`nftVersions`/`orderVersions` em
 * `useRealtime.ts`, cobertos indiretamente aqui e documentados em
 * ARCHITECTURE.md). O que este teste verifica de ponta a ponta é o caminho
 * observável pela UI: uma "desconexão" real (fechar e recarregar a página
 * enquanto o pedido está pendente) não pode gerar uma segunda compra — o
 * mesmo pedido precisa ser recuperado, seja pelo evento `order.updated` ao
 * reconectar, seja pela reconciliação REST feita no próprio carregamento da
 * página de confirmação.
 */
test.describe('Tempo real — reconexão e retomada de pedido pendente', () => {
  test('recarregar a página com o pedido pendente recupera o mesmo pedido, sem duplicar', async ({ page }) => {
    test.setTimeout(45_000)
    await loginAs(page, SEED_USERS.ana)
    await page.goto('/')
    await page.waitForSelector('a[href^="/nft/"]')
    await page.locator('a[href^="/nft/"]').first().click()
    await page.getByRole('button', { name: /COMPRAR|Comprar NFT/ }).click()
    await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
    await expect(page).toHaveURL(/\/checkout/)
    await connectWallet(page)

    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page).toHaveURL(/\/pedido\/(?<id>[^/]+)$/)
    const orderUrl = page.url()

    // "Desconexão": recarrega a página imediatamente, enquanto o pedido
    // ainda deve estar pendente na maior parte das vezes (resolve em
    // 2.2–3.8s no cenário padrão) — derruba e restabelece o WebSocket.
    await page.reload()
    await expect(page).toHaveURL(orderUrl)
    await expect(page.getByText(/Processando seu pedido|Seus NFTs agora estão na sua carteira|Pagamento recusado/)).toBeVisible()

    const declined = page.getByText('Pagamento recusado')
    const confirmed = page.getByText('Seus NFTs agora estão na sua carteira')
    await expect(declined.or(confirmed)).toBeVisible({ timeout: 15_000 })

    const orders = await fetchOrders(page)
    expect(orders.items).toHaveLength(1)
    expect(orders.items[0].status).not.toBe('pending')
  })
})
