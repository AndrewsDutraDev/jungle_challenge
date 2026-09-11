import { test, expect } from '@playwright/test'
import { SEED_USERS, loginAs } from './support/auth'
import { connectWallet } from './support/wallet'
import { fetchOrders, nftIdFromUrl, replayEvent, updateNftOnServer } from './support/api'

/**
 * README §9, fluxo 10: eventos duplicados ou antigos, desconexão e retomada
 * de pedido pendente.
 */
test.describe('Tempo real — eventos repetidos, reconexão e pedido pendente', () => {
  test('eventos duplicados ou atrasados não regridem o estado exibido', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('a[href^="/nft/"]')
    await page.locator('a[href^="/nft/"]').first().click()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const nftId = nftIdFromUrl(page.url())

    const older = await updateNftOnServer(page, nftId, { priceEth: '7.77' })
    await expect(page.getByText('7.77 ETH').first()).toBeVisible()
    const latest = await updateNftOnServer(page, nftId, { priceEth: '8.88' })
    await expect(page.getByText('8.88 ETH').first()).toBeVisible()
    expect(latest.version).toBeGreaterThan(older.version)

    // O servidor reenvia o evento antigo (versão menor, entregue atrasado) e o
    // mais recente de novo (mesmo eventId). O cliente descarta os dois pela
    // versão/identidade — a tela nunca volta ao preço anterior.
    await replayEvent(page, older.eventId)
    await replayEvent(page, latest.eventId)
    for (let check = 0; check < 5; check += 1) {
      await page.waitForTimeout(100)
      await expect(page.getByText('8.88 ETH').first()).toBeVisible()
      await expect(page.getByText('7.77 ETH')).toHaveCount(0)
    }
  })

  test('recarregar a página com o pedido pendente recupera o mesmo pedido, sem duplicar', async ({ page }) => {
    test.setTimeout(45_000)
    // Relógio controlado: o pagamento é decidido 3s após a criação do pedido.
    // Avançar o relógio torna o desfecho imediato, sem depender de espera real.
    await page.clock.install()
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

    // "Desconexão": recarrega com o pedido ainda pendente — derruba e
    // restabelece o WebSocket; o estado volta pela reconciliação REST.
    await page.reload()
    await expect(page).toHaveURL(orderUrl)
    await expect(page.getByText(/Processando seu pedido|Seus NFTs agora estão na sua carteira/)).toBeVisible()

    await page.clock.fastForward(4000)
    await expect(page.getByText('Seus NFTs agora estão na sua carteira')).toBeVisible({ timeout: 10_000 })

    const orders = await fetchOrders(page)
    expect(orders.items).toHaveLength(1)
    expect(orders.items[0].status).toBe('confirmed')
  })
})
