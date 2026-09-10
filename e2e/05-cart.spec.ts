import { test, expect } from '@playwright/test'
import { SEED_USERS, loginAs } from './support/auth'

/** README §9, fluxo 5: carrinho — quantidades, remoção, cupom e persistência após refresh/login. */
test.describe('Carrinho', () => {
  test('adicionar, alterar quantidade e remover item', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('a[href^="/nft/"]')
    await page.locator('a[href^="/nft/"]').first().click()
    await page.getByRole('button', { name: /COMPRAR/ }).click()
    await expect(page).toHaveURL(/\/cart/)

    const row = page.locator('tbody tr').first()
    await expect(row).toBeVisible()

    const increaseBtn = row.locator('button[aria-label^="Aumentar quantidade"]')
    await increaseBtn.click()
    await expect(row.locator('span[aria-live="polite"]')).toHaveText('2')

    await row.locator('button[aria-label^="Remover"]').click()
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
  })

  test('cupom válido aplica desconto, cupom inválido/expirado mostra erro', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('a[href^="/nft/"]')
    await page.locator('a[href^="/nft/"]').first().click()
    await page.getByRole('button', { name: /COMPRAR/ }).click()
    await expect(page).toHaveURL(/\/cart/)

    await page.locator('#coupon').fill('CODIGO-INVALIDO')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.locator('#coupon-error')).toContainText('inválido')

    await page.locator('#coupon').fill('PROMO2025') // cupom seed expirado
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.locator('#coupon-error')).toContainText('expirado')

    await page.locator('#coupon').fill('KURIO10')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByText('Cupom KURIO10 aplicado.')).toBeVisible()
    await expect(page.getByText(/^\(−\)/)).toBeVisible() // valor do desconto passa a aparecer com o prefixo "(−)"
  })

  test('carrinho sobrevive a refresh e itens de visitante migram ao autenticar', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('a[href^="/nft/"]')
    await page.locator('a[href^="/nft/"]').first().click()
    await page.getByRole('button', { name: /COMPRAR/ }).click()
    await expect(page).toHaveURL(/\/cart/)
    await expect(page.locator('tbody tr')).toHaveCount(1)
    const nftName = (await page.locator('tbody tr').first().locator('td').first().locator('a').innerText()).trim()

    await page.reload()
    await expect(page.locator('tbody tr')).toHaveCount(1)
    await expect(page.locator('tbody')).toContainText(nftName)

    await loginAs(page, SEED_USERS.marcos, '/cart')
    await expect(page).toHaveURL(/\/cart/)
    await expect(page.locator('tbody tr')).toHaveCount(1) // carrinho de visitante migrou para a conta
    await expect(page.locator('tbody')).toContainText(nftName)
  })

  test('resumo reflete subtotal, taxa de rede e total coerentes com a API', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('a[href^="/nft/"]')
    await page.locator('a[href^="/nft/"]').first().click()
    await page.getByRole('button', { name: /COMPRAR/ }).click()
    await expect(page).toHaveURL(/\/cart/)

    const summary = page.getByRole('complementary')
    await expect(summary.getByText('Subtotal')).toBeVisible()
    await expect(summary.getByText('Taxa de rede')).toBeVisible()
    await expect(summary.getByText('Total', { exact: true })).toBeVisible()
  })
})
