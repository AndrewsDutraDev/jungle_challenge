import { test, expect } from '@playwright/test'
import { SEED_USERS, loginAs } from './support/auth'

/**
 * README §9: "Inclua regressão visual de início, detalhe, carrinho e
 * pagamento, com baselines versionadas e dados estáveis."
 *
 * Dados estáveis: os fixtures são gerados por PRNG determinístico (mulberry32,
 * ver `src/mocks/prng.ts`), então o catálogo, preços e a arte procedural dos
 * NFTs são sempre os mesmos para um contexto de navegador novo (storage
 * vazio). O painel de cenários (`data-testid="scenario-panel"`) é mascarado
 * por ser um afetivo de desenvolvimento, não parte do layout do desafio.
 */
test.describe('Regressão visual', () => {
  test('início', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('a[href^="/nft/"]')
    await expect(page).toHaveScreenshot('inicio.png', {
      fullPage: true,
      mask: [page.getByTestId('scenario-panel')],
    })
  })

  test('detalhe do NFT', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('a[href^="/nft/"]')
    const href = await page.locator('a[href^="/nft/"]').first().getAttribute('href')
    await page.goto(href!)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page).toHaveScreenshot('detalhe.png', {
      fullPage: true,
      mask: [page.getByTestId('scenario-panel')],
    })
  })

  test('carrinho', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('a[href^="/nft/"]')
    await page.locator('a[href^="/nft/"]').first().click()
    await page.getByRole('button', { name: /COMPRAR|Comprar NFT/ }).click()
    await expect(page).toHaveURL(/\/cart/)
    await expect(page.getByText('Subtotal')).toBeVisible()
    await expect(page).toHaveScreenshot('carrinho.png', {
      fullPage: true,
      mask: [page.getByTestId('scenario-panel')],
    })
  })

  test('pagamento', async ({ page }) => {
    await loginAs(page, SEED_USERS.ana)
    await page.goto('/')
    await page.waitForSelector('a[href^="/nft/"]')
    await page.locator('a[href^="/nft/"]').first().click()
    await page.getByRole('button', { name: /COMPRAR|Comprar NFT/ }).click()
    await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
    await expect(page).toHaveURL(/\/checkout/)
    await expect(page.getByText('Perfil do colecionador')).toBeVisible()
    await expect(page.getByText('Carteira e rede')).toBeVisible()
    await expect(page).toHaveScreenshot('pagamento.png', {
      fullPage: true,
      mask: [page.getByTestId('scenario-panel')],
    })
  })
})
