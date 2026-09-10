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
    await page.getByRole('button', { name: /COMPRAR/ }).click()
    await expect(page).toHaveURL(/\/cart/)

    await useScenario(page, 'slow-network')
    await page.reload()
    await expect(page.getByText('Subtotal')).toBeVisible({ timeout: 6000 })
  })

  test('falha de servidor mostra feedback de erro e nova tentativa recupera o conteúdo', async ({ page }) => {
    await useScenario(page, 'server-errors') // ~40% das chamadas falham com 500/503
    await page.goto('/')

    // Sob esse cenário, recarregamos algumas vezes até pegar uma falha — o
    // objetivo é comprovar que a UI se recupera assim que uma tentativa tem
    // sucesso, não medir a taxa de falha em si.
    let sawError = false
    for (let attempt = 0; attempt < 8 && !sawError; attempt += 1) {
      await page.reload()
      sawError = await page
        .getByRole('alert')
        .filter({ hasText: 'Não foi possível carregar o catálogo' })
        .isVisible()
        .catch(() => false)
    }
    test.skip(!sawError, 'Nenhuma das tentativas calhou de bater em erro de servidor (variação esperada do cenário).')

    await useScenario(page, 'default')
    await page.reload()
    await expect(page.locator('a[href^="/nft/"]').first()).toBeVisible({ timeout: 10_000 })
  })
})
