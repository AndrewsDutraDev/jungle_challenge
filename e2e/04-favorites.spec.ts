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

  test('a página de favoritos lista o NFT favoritado e permite removê-lo', async ({ page }) => {
    await loginAs(page, SEED_USERS.ana)
    await page.goto('/')
    await page.waitForSelector('a[href^="/nft/"]')
    await page.locator('a[href^="/nft/"]').first().click()
    await expect(page).toHaveURL(/\/nft\//)
    const title = page.getByRole('heading', { level: 1 })
    await expect(title).not.toHaveText(/SEJA DONO/) // o h1 da página inicial some quando o detalhe carrega
    const name = await title.innerText()

    await page.getByRole('button', { name: 'Favoritar' }).click()
    await expect(page.getByRole('button', { name: 'Favoritar' })).toHaveAttribute('aria-pressed', 'true')

    await page.goto('/favorites')
    await expect(page.getByRole('link', { name: `Ver detalhes de ${name}` })).toBeVisible()

    // Desfavoritar pelo card tira o item da lista na hora (atualização otimista).
    await page.getByRole('button', { name: 'Remover dos favoritos' }).click()
    await expect(page.getByText('Você ainda não favoritou nenhum NFT.')).toBeVisible()

    // Só recarrega depois de a API confirmar a remoção: o servidor simulado
    // roda na página, e recarregar no meio da chamada a interromperia.
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const token = window.localStorage.getItem('kurio:token')
          const res = await fetch('/api/favorites', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
          return ((await res.json()) as { items: unknown[] }).items.length
        }),
      )
      .toBe(0)

    await page.reload()
    await expect(page.getByText('Você ainda não favoritou nenhum NFT.')).toBeVisible()
  })

  test('favoritar exige autenticação — visitante é direcionado ao login', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('a[href^="/nft/"]')
    await page.locator('a[href^="/nft/"]').first().click()
    await page.getByRole('link', { name: /Favoritar/ }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})
