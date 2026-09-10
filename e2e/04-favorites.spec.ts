import { test, expect } from '@playwright/test'
import { SEED_USERS, loginAs } from './support/auth'

/**
 * README §9, fluxo 4: favoritos, incluindo falha de mutation e recuperação
 * do estado.
 *
 * Também exercita a atualização otimista com rollback exigida pelo README
 * §4 ("aplique atualização otimista em pelo menos uma interação, com
 * rollback em caso de falha") — `useToggleFavoriteMutation` remove o item
 * otimisticamente e desfaz a remoção se a chamada falhar.
 */
test.describe('Favoritos', () => {
  test('favoritar/desfavoritar persiste para o usuário autenticado', async ({ page }) => {
    await loginAs(page, SEED_USERS.ana)
    await page.goto('/')
    await page.waitForSelector('a[href^="/nft/"]')
    await page.locator('a[href^="/nft/"]').first().click()

    const favoriteButton = page.getByRole('button', { name: 'Favoritar' })
    await favoriteButton.click()
    await expect(favoriteButton).toHaveAttribute('aria-pressed', 'true')

    await page.reload()
    await expect(page.getByRole('button', { name: 'Favoritar' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('falha de mutation ao remover favorito reverte para o estado anterior (rollback otimista)', async ({ page }) => {
    await loginAs(page, SEED_USERS.ana)
    await page.goto('/')
    await page.waitForSelector('a[href^="/nft/"]')
    await page.locator('a[href^="/nft/"]').first().click()

    const favoriteButton = page.getByRole('button', { name: 'Favoritar' })
    await favoriteButton.click()
    await expect(favoriteButton).toHaveAttribute('aria-pressed', 'true')

    // Simula queda de conexão SEM recarregar a página — o cenário é lido do
    // localStorage a cada requisição pelos handlers MSW.
    await page.evaluate(() => window.localStorage.setItem('kurio:scenario', 'offline'))

    await favoriteButton.click() // tenta desfavoritar — a remoção via DELETE vai falhar
    // Remoção otimista acontece imediatamente...
    await expect(favoriteButton).toHaveAttribute('aria-pressed', 'false')
    // ...mas a chamada falha e o rollback restaura o estado favoritado.
    await expect(favoriteButton).toHaveAttribute('aria-pressed', 'true', { timeout: 5000 })

    await page.evaluate(() => window.localStorage.setItem('kurio:scenario', 'default'))
    await favoriteButton.click()
    await expect(favoriteButton).toHaveAttribute('aria-pressed', 'false')
  })

  test('favoritar exige autenticação — visitante é direcionado ao login', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('a[href^="/nft/"]')
    await page.locator('a[href^="/nft/"]').first().click()
    await page.getByRole('link', { name: /Favoritar/ }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})
