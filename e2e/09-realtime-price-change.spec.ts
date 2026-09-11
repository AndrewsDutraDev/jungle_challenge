import { test, expect } from '@playwright/test'
import { useScenario } from './support/scenario'
import { SEED_USERS, loginAs } from './support/auth'
import { connectWallet } from './support/wallet'

/**
 * README §9, fluxo 9 + cenário do §7: alteração de preço/disponibilidade via
 * Socket.IO durante o checkout. O evento é emitido pelo servidor mockado
 * (`price-drift`, ver `src/mocks/socket.ts`) e chega pelo `socket.io-client`
 * real — nunca por uma chamada direta ao cache (isso seria eliminatório).
 */
test.describe('Tempo real — preço/disponibilidade mudam durante a navegação', () => {
  test('carrinho e checkout refletem nft.updated e bloqueiam confirmação com cotação desatualizada', async ({ page }) => {
    test.setTimeout(45_000)
    await useScenario(page, 'price-drift')
    await loginAs(page, SEED_USERS.ana)

    await page.goto('/')
    await page.waitForSelector('a[href^="/nft/"]')
    await page.locator('a[href^="/nft/"]').first().click()
    await page.getByRole('button', { name: /COMPRAR|Comprar NFT/ }).click()
    await expect(page).toHaveURL(/\/cart/)

    // O driver de price-drift muda o preço/disponibilidade de um NFT no
    // carrinho a cada ~2.5s enquanto o cenário estiver ativo — aguardamos o
    // aviso de "preços ou disponibilidades mudaram" aparecer via WebSocket,
    // sem dar refresh na página.
    await expect(page.getByText(/Alguns preços ou disponibilidades mudaram/)).toBeVisible({ timeout: 20_000 })

    await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
    await expect(page).toHaveURL(/\/checkout/)
    await connectWallet(page)

    // Cotação desatualizada: o botão de confirmar deve permanecer bloqueado.
    await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeDisabled()
    await expect(page.getByText(/Preço, disponibilidade ou taxas mudaram/)).toBeVisible()
  })
})
