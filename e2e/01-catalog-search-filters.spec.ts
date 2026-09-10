import { test, expect } from '@playwright/test'
import { useScenario } from './support/scenario'

/**
 * README §9, fluxo 1: busca, filtros combinados, ordenação, paginação e
 * restauração pelo histórico.
 */
test.describe('Catálogo — busca, filtros, ordenação e paginação', () => {
  test('busca compõe a URL e sobrevive a refresh', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Buscar', exact: true }).click()
    const searchBox = page.getByPlaceholder('Buscar NFTs, coleções, criadores…')
    await searchBox.fill('Ape')
    await searchBox.press('Enter')
    await expect(page).toHaveURL(/q=Ape/)

    await page.reload()
    await expect(page).toHaveURL(/q=Ape/)
    await expect(searchBox).toHaveCount(0) // painel de busca fecha, mas o termo permanece na URL
  })

  test('filtros de categoria e rede são combináveis e reiniciam a paginação', async ({ page }) => {
    await page.goto('/?page=2')
    await expect(page).toHaveURL(/page=2/)

    const firstCategory = page.locator('fieldset', { hasText: 'Coleções' }).locator('input[type="checkbox"], button[role="checkbox"]').first()
    await firstCategory.click()
    await expect(page).toHaveURL(/category=/)
    await expect(page).not.toHaveURL(/page=2/)

    const firstNetwork = page.locator('fieldset', { hasText: 'Rede' }).locator('input[type="checkbox"], button[role="checkbox"]').first()
    await firstNetwork.click()
    await expect(page).toHaveURL(/category=/)
    await expect(page).toHaveURL(/network=/)
  })

  test('ordenação muda a URL e reordena os resultados', async ({ page }) => {
    const priceOf = (text: string) => Number(text.replace(/[^\d.,]/g, '').replace(',', '.'))
    const firstCardPrice = () => page.getByTestId('catalog-grid').locator('> div').first().locator('span.font-bold').first().innerText()

    await page.goto('/?sort=price_asc')
    await page.waitForSelector('a[href^="/nft/"]')
    const ascFirst = priceOf(await firstCardPrice())

    await page.getByLabel('Ordenar por:').click()
    await page.getByRole('option', { name: 'Maior preço' }).click()
    await expect(page).toHaveURL(/sort=price_desc/)
    await expect(page.locator('a[href^="/nft/"]').first()).toBeVisible()
    const descFirst = priceOf(await firstCardPrice())

    // A garantia funcional fina está nos handlers MSW (nfts.ts ordena por
    // preço); aqui validamos que a UI refletiu de fato a troca de critério.
    expect(descFirst).toBeGreaterThanOrEqual(ascFirst)
  })

  test('paginação navega e o histórico do navegador restaura a página', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('nav[aria-label="Paginação do catálogo"]')

    await page.getByRole('button', { name: 'Próxima página' }).click()
    await expect(page).toHaveURL(/page=2/)

    await page.goBack()
    await expect(page).toHaveURL((url) => !url.search.includes('page=2'))

    await page.goForward()
    await expect(page).toHaveURL(/page=2/)
  })

  test('resultado vazio mostra estado dedicado e ação de limpar filtros', async ({ page }) => {
    await useScenario(page, 'empty-catalog')
    await page.goto('/?q=inexistente')
    await expect(page.getByText('Nenhum NFT encontrado')).toBeVisible()
    await page.getByRole('button', { name: 'Limpar filtros' }).click()
    await expect(page).not.toHaveURL(/q=inexistente/)
  })

  test('falha de rede no catálogo mostra estado de erro', async ({ page }) => {
    await useScenario(page, 'offline')
    await page.goto('/')
    await expect(page.getByRole('alert')).toContainText('Não foi possível carregar o catálogo')
  })
})
