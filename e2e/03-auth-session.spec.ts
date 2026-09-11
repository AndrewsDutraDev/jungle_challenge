import { test, expect } from '@playwright/test'
import { useScenario } from './support/scenario'
import { SEED_USERS, loginAs, logout } from './support/auth'

/** README §9, fluxo 3: cadastro, login, expiração de sessão, logout e troca de usuário. */
test.describe('Autenticação e sessão', () => {
  test('cadastro cria conta e autentica automaticamente', async ({ page }) => {
    const unique = Date.now()
    await page.goto('/signup')
    // As abas existem só no modal desktop; no mobile a tela de cadastro é inteira.
    const signupTab = page.getByRole('tab', { name: 'Criar conta' })
    if (await signupTab.count()) await signupTab.click()
    await page.locator('#signup-username').fill(`teste${unique}`)
    await page.locator('#signup-email').fill(`teste${unique}@kurio.test`)
    await page.locator('#signup-password').fill('senha123')
    await page.locator('#signup-confirm').fill('senha123')
    await page.getByRole('button', { name: /Criar conta|Criar perfil/ }).click()
    await expect(page).toHaveURL('/')
    await expect(page.getByLabel('Menu da conta')).toBeVisible()
  })

  test('cadastro com e-mail já usado retorna conflito nos campos', async ({ page }) => {
    const unique = Date.now()
    await page.goto('/signup')
    await page.locator('#signup-username').fill(`outro${unique}`)
    await page.locator('#signup-email').fill(SEED_USERS.ana.email)
    await page.locator('#signup-password').fill('senha123')
    await page.locator('#signup-confirm').fill('senha123')
    await page.getByRole('button', { name: /Criar conta|Criar perfil/ }).click()
    await expect(page.locator('#signup-email-error')).toContainText('já cadastrado')
  })

  test('login com credenciais inválidas mostra erro e não autentica', async ({ page }) => {
    await page.goto('/login')
    await page.locator('#login-email').fill(SEED_USERS.ana.email)
    await page.locator('#login-password').fill('senha-errada')
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page.locator('#login-password-error')).toContainText('inválidos')
    await expect(page.getByLabel('Menu da conta')).toHaveCount(0)
  })

  test('login válido, logout limpa a sessão', async ({ page }) => {
    await loginAs(page, SEED_USERS.ana)
    await logout(page)
    await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible()
  })

  test('sessão expirada durante a navegação redireciona ao login preservando o destino', async ({ page }) => {
    await loginAs(page, SEED_USERS.ana)
    await useScenario(page, 'session-expired')
    // Qualquer rota protegida deve reagir à expiração — o painel de cenários
    // já está ativo nesta mesma aba, sem precisar de novo login.
    await page.goto('/profile')
    await expect(page).toHaveURL(/\/login/)
    await expect(page).toHaveURL(/redirect=/)
  })

  test('troca de usuário isola dados privados (favoritos não vazam entre contas)', async ({ page }) => {
    await loginAs(page, SEED_USERS.ana)
    await page.goto('/')
    await page.waitForSelector('a[href^="/nft/"]')
    const firstCard = page.locator('div.group').first()
    await firstCard.hover()
    await firstCard.getByRole('button', { name: 'Adicionar aos favoritos' }).click()
    await expect(firstCard.getByRole('button', { name: 'Remover dos favoritos' })).toBeVisible()

    await logout(page)
    await loginAs(page, SEED_USERS.marcos)
    await page.goto('/')
    await page.waitForSelector('a[href^="/nft/"]')
    const firstCardAsMarcos = page.locator('div.group').first()
    await firstCardAsMarcos.hover()
    // Marcos nunca favoritou nada neste NFT — a sessão anterior de Ana não pode vazar.
    await expect(firstCardAsMarcos.getByRole('button', { name: 'Adicionar aos favoritos' })).toBeVisible()
  })
})
