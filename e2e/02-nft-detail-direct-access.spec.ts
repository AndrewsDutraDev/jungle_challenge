import { test, expect } from '@playwright/test'

/** README §9, fluxo 2: acesso direto ao detalhe e tratamento de recurso inexistente. */
test.describe('Detalhe do NFT — acesso direto', () => {
  test('acesso direto a um NFT existente carrega os dados', async ({ page }) => {
    await page.goto('/')
    const href = await page.locator('a[href^="/nft/"]').first().getAttribute('href')
    expect(href).toBeTruthy()

    // Navegação "a frio": abre a URL direto, sem passar pelo catálogo.
    await page.goto(href!)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('button', { name: /COMPRAR|Comprar NFT|Esgotado/ })).toBeVisible()
  })

  test('NFT inexistente mostra estado 404 dedicado', async ({ page }) => {
    await page.goto('/nft/nft-que-nao-existe')
    await expect(page.getByText('Este NFT não existe ou foi removido.')).toBeVisible()
    await page.getByRole('link', { name: 'Voltar ao início' }).click()
    await expect(page).toHaveURL('/')
  })

  test('edição esgotada desabilita a compra e some o seletor de quantidade', async ({ page }) => {
    // `SOLD_OUT_FIXTURE_NFT_ID` em src/mocks/fixtures.ts (último item do seed,
    // `nft_${200 + TOTAL_FIXTURE_NFTS - 1}`) é forçado deterministicamente a
    // editionsAvailable = 0 — sem isso o gerador nunca zera a disponibilidade
    // (sempre `Math.max(1, ...)`) e este fluxo ficaria impossível de testar.
    await page.goto('/nft/nft_241')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Esgotado' })).toBeDisabled()
    await expect(page.getByLabel('Aumentar quantidade')).toHaveCount(0)
  })
})
