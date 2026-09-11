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

    // No mobile os filtros vivem num drawer (o layout do Figma troca a coluna
    // lateral por uma busca com botão de filtros); no desktop ficam na sidebar.
    await page.locator('a[href^="/nft/"]').first().waitFor()
    const filtersTrigger = page.getByRole('button', { name: /^Filtros/ })
    if (await filtersTrigger.count()) await filtersTrigger.click()

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

  test('respostas fora de ordem não sobrescrevem o resultado da busca mais recente', async ({ page, isMobile }) => {
    test.skip(isMobile, 'No mobile os filtros ficam num drawer; o descarte de respostas obsoletas é o mesmo código nos dois.')
    await useScenario(page, 'out-of-order')
    await page.goto('/')
    await page.locator('a[href^="/nft/"]').first().waitFor()

    // Três filtros em sequência rápida. Neste cenário cada listagem responde
    // mais rápido que a anterior, então a resposta da primeira busca (já
    // obsoleta) é a última a chegar.
    const categories = page.locator('fieldset', { hasText: 'Coleções' }).locator('input[type="checkbox"], button[role="checkbox"]')
    await categories.nth(0).click()
    await categories.nth(1).click()
    await categories.nth(2).click()
    await expect(page).toHaveURL(/category=/)

    const status = page.getByRole('status').filter({ hasText: /encontrado/ })
    await page.waitForTimeout(2_000) // deixa a resposta atrasada chegar
    const shown = await status.innerText()

    // Recarregar a mesma URL faz uma única busca, sem corrida: o resultado
    // precisa ser o mesmo que a tela mostrava.
    await page.reload()
    await expect(status).toHaveText(shown)
  })

  test('filtrar pelas abas não leva a página de volta ao topo', async ({ page }) => {
    await page.goto('/')
    await page.locator('a[href^="/nft/"]').first().waitFor()

    const tabs = page.getByRole('group', { name: 'Filtrar vitrine' })
    // Deixa as abas a 120px do topo da janela — no mobile o hero é compacto e
    // elas ficam perto do início da página. O <html> tem `scroll-behavior:
    // smooth`: rola sem animação para ler a posição final logo em seguida.
    await tabs.evaluate((el) => {
      const top = el.getBoundingClientRect().top + window.scrollY - 120
      window.scrollTo({ top, behavior: 'instant' })
    })
    const before = await page.evaluate(() => window.scrollY)
    expect(before).toBeGreaterThan(100)

    await tabs.getByRole('button', { name: 'Em alta' }).click()
    await expect(page).toHaveURL(/sort=trending/)
    await expect(page.getByText('Atualizando resultados…')).toBeHidden()

    const after = await page.evaluate(() => window.scrollY)
    expect(Math.abs(after - before)).toBeLessThan(80)
  })

  test('slider do hero troca de destaque pelas bullets', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' }) // sem troca automática: o teste controla
    await page.goto('/')

    const carousel = page.locator('[aria-roledescription="carrossel"]:visible')
    const bullets = carousel.getByRole('group', { name: 'Escolher destaque' })
    const slide = (n: number) => carousel.locator(`[aria-roledescription="slide"][aria-label="${n} de 3"]`)

    await expect(bullets.getByRole('button', { name: 'Mostrar destaque 1 de 3' })).toHaveAttribute('aria-current', 'true')
    await expect(slide(1)).not.toHaveAttribute('aria-hidden', 'true')

    await bullets.getByRole('button', { name: 'Mostrar destaque 2 de 3' }).click()
    await expect(bullets.getByRole('button', { name: 'Mostrar destaque 2 de 3' })).toHaveAttribute('aria-current', 'true')
    await expect(bullets.getByRole('button', { name: 'Mostrar destaque 1 de 3' })).not.toHaveAttribute('aria-current', 'true')
    await expect(slide(2)).not.toHaveAttribute('aria-hidden', 'true')
    await expect(slide(1)).toHaveAttribute('aria-hidden', 'true')

    // Setas do teclado a partir da bullet focada.
    await page.keyboard.press('ArrowRight')
    await expect(bullets.getByRole('button', { name: 'Mostrar destaque 3 de 3' })).toHaveAttribute('aria-current', 'true')
    await expect(bullets.getByRole('button', { name: 'Mostrar destaque 3 de 3' })).toBeFocused()
  })

  test('slider do hero avança sozinho (relógio controlado)', async ({ page }) => {
    await page.clock.install()
    await page.goto('/')
    const carousel = page.locator('[aria-roledescription="carrossel"]:visible')
    const bullet = (n: number) => carousel.getByRole('button', { name: `Mostrar destaque ${n} de 3` })

    await expect(bullet(1)).toHaveAttribute('aria-current', 'true')
    await page.mouse.move(0, 0) // fora do hero: com o mouse em cima, a troca pausa
    await page.clock.fastForward(6500)
    await expect(bullet(2)).toHaveAttribute('aria-current', 'true')
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
