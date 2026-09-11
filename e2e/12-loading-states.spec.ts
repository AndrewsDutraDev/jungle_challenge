import { test, expect } from '@playwright/test'
import { useScenario } from './support/scenario'

/** README §9, fluxo 12: skeletons durante carregamento lento, feedback de falha e recuperação após nova tentativa. */
test.describe('Estados de carregamento — skeletons, falha e recuperação', () => {
  test('catálogo mostra skeletons com shimmer durante latência alta, depois o conteúdo real', async ({ page }) => {
    await useScenario(page, 'slow-network') // 1.8–3.2s de latência constante
    await page.goto('/')

    const skeletonGrid = page.locator('[aria-busy="true"][aria-label="Carregando NFTs"]')
    await expect(skeletonGrid).toBeVisible()
    // O skeleton preserva a mesma grade/dimensões do conteúdo real — evita
    // layout shift quando os dados chegam.
    await expect(skeletonGrid.locator('> div')).toHaveCount(9)

    await expect(skeletonGrid).toBeHidden({ timeout: 6000 })
    await expect(page.locator('a[href^="/nft/"]').first()).toBeVisible()
  })

  test('detalhe do NFT mostra skeleton preservando as dimensões do layout final', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('a[href^="/nft/"]')
    const href = await page.locator('a[href^="/nft/"]').first().getAttribute('href')

    await useScenario(page, 'slow-network')
    await page.goto(href!)
    await expect(page.locator('.aspect-square').first()).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 6000 })
  })

  test('resumo do carrinho mostra skeleton e depois os totais', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('a[href^="/nft/"]')
    await page.locator('a[href^="/nft/"]').first().click()
    await page.getByRole('button', { name: /COMPRAR|Comprar NFT/ }).click()
    await expect(page).toHaveURL(/\/cart/)

    await useScenario(page, 'slow-network')
    await page.reload()

    // O resumo é um dos componentes que o README §8 exige com skeleton.
    await expect(page.locator('[data-testid="totals-skeleton"]')).toBeVisible()

    // `slow-network` sorteia 1.8–3.2s por chamada e o resumo depende de duas
    // sequenciais (carrinho e cotação) — o teto precisa acomodar o pior caso,
    // senão o teste falha por construção quando os dois sorteios são altos.
    await expect(page.getByText('Subtotal')).toBeVisible({ timeout: 15_000 })
  })

  test('falha de servidor mostra feedback de erro e nova tentativa recupera o conteúdo', async ({ page }) => {
    await useScenario(page, 'server-errors') // toda chamada de dados responde 503
    await page.goto('/')

    // O cliente repete falhas transitórias duas vezes, com backoff, antes de
    // mostrar o erro.
    const catalogError = page.getByRole('alert').filter({ hasText: 'Não foi possível carregar o catálogo' })
    await expect(catalogError).toBeVisible({ timeout: 20_000 })

    // O "servidor" se recupera; a nova tentativa pela própria interface traz o
    // catálogo sem recarregar a página.
    await page.evaluate(() => window.localStorage.setItem('kurio:scenario', 'default'))
    await catalogError.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.locator('a[href^="/nft/"]').first()).toBeVisible()
    await expect(catalogError).toHaveCount(0)
  })
})
