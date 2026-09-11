import { test, expect } from '@playwright/test'
import { useScenario } from './support/scenario'
import { SEED_USERS, loginAs } from './support/auth'
import { connectWallet } from './support/wallet'
import { nftIdFromUrl, updateNftOnServer } from './support/api'

/**
 * README §9, fluxo 9 + cenário do §7: alteração de preço/disponibilidade via
 * Socket.IO durante o checkout. Os eventos saem do servidor mockado e chegam
 * pelo `socket.io-client` real — nunca por uma chamada direta ao cache (isso
 * seria eliminatório).
 */
test.describe('Tempo real — preço/disponibilidade mudam durante a navegação', () => {
  test('mudança de preço no instante do checkout atualiza o resumo e bloqueia a confirmação', async ({ page }) => {
    await loginAs(page, SEED_USERS.ana)
    await page.goto('/')
    await page.waitForSelector('a[href^="/nft/"]')
    await page.locator('a[href^="/nft/"]').first().click()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const nftId = nftIdFromUrl(page.url())

    await page.getByRole('button', { name: /COMPRAR|Comprar NFT/ }).click()
    await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
    await expect(page).toHaveURL(/\/checkout/)
    await connectWallet(page)

    const confirm = page.getByRole('button', { name: 'Confirmar compra' })
    const total = page.locator('[data-testid="order-total"]:visible')
    await expect(confirm).toBeEnabled()
    const totalBefore = await total.innerText()

    // Instante escolhido pelo teste: o "servidor" muda o preço com o
    // colecionador já na tela de pagamento.
    await updateNftOnServer(page, nftId, { priceEth: '9.99' })

    await expect(page.getByText(/Preço, disponibilidade ou taxas mudaram/)).toBeVisible()
    await expect(confirm).toBeDisabled()
    await expect(total).not.toHaveText(totalBefore)

    // A confirmação só volta depois de o colecionador aceitar os novos valores.
    await page.getByRole('button', { name: 'Aceitar novos valores' }).click()
    await expect(confirm).toBeEnabled()
  })

  test('cenário price-drift: carrinho e checkout refletem nft.updated e bloqueiam confirmação', async ({ page }) => {
    test.setTimeout(45_000)
    await useScenario(page, 'price-drift')
    await loginAs(page, SEED_USERS.ana)

    await page.goto('/')
    await page.waitForSelector('a[href^="/nft/"]')
    await page.locator('a[href^="/nft/"]').first().click()
    await page.getByRole('button', { name: /COMPRAR|Comprar NFT/ }).click()
    await expect(page).toHaveURL(/\/cart/)

    // O driver do cenário muda o NFT do carrinho a cada 2.5s — o aviso chega
    // via WebSocket, sem refresh.
    await expect(page.getByText(/Alguns preços ou disponibilidades mudaram/)).toBeVisible({ timeout: 10_000 })

    await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
    await expect(page).toHaveURL(/\/checkout/)
    await connectWallet(page)

    // Cotação desatualizada: o botão de confirmar deve permanecer bloqueado.
    await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeDisabled()
    await expect(page.getByText(/Preço, disponibilidade ou taxas mudaram/)).toBeVisible()
  })
})
