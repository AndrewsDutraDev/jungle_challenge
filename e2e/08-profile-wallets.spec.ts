import { test, expect } from '@playwright/test'
import { SEED_USERS, loginAs } from './support/auth'

/** README §9, fluxo 8: edição de perfil, avatar, senha e carteiras, com erros de validação. */
test.describe('Perfil e carteiras', () => {
  test('editar dados do perfil e escolher avatar', async ({ page }) => {
    await loginAs(page, SEED_USERS.marcos)
    await page.goto('/profile')

    await page.locator('#profile-displayName').fill('Marcos D. Editado')
    await page.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Perfil atualizado.' })).toBeVisible()

    await page.reload()
    await expect(page.locator('#profile-displayName')).toHaveValue('Marcos D. Editado')

    const avatarButtons = page.getByRole('radio', { name: /^Avatar / })
    await avatarButtons.nth(1).click()
    await expect(avatarButtons.nth(1)).toHaveAttribute('aria-checked', 'true')
  })

  test('perfil com nome de usuário em conflito mostra erro de validação', async ({ page }) => {
    await loginAs(page, SEED_USERS.marcos)
    await page.goto('/profile')
    await page.locator('#profile-username').fill(SEED_USERS.ana.username)
    await page.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(page.getByText('Nome de usuário já em uso.')).toBeVisible()
  })

  test('alterar senha valida senha atual incorreta e senha nova curta', async ({ page }) => {
    await loginAs(page, SEED_USERS.ana)
    await page.goto('/profile')

    await page.locator('#current-password').fill('senha-errada')
    await page.locator('#new-password').fill('novaSenha123')
    await page.locator('#confirm-password').fill('novaSenha123')
    await page.getByRole('button', { name: 'Alterar senha' }).click()
    await expect(page.getByText('Senha atual incorreta.')).toBeVisible()

    await page.locator('#current-password').fill(SEED_USERS.ana.password)
    await page.locator('#new-password').fill('123')
    await page.locator('#confirm-password').fill('123')
    await page.getByRole('button', { name: 'Alterar senha' }).click()
    await expect(page.getByText('Senha muito curta.')).toBeVisible()

    // A confirmação é validada no cliente, antes de chamar a API.
    await page.locator('#new-password').fill('novaSenha123')
    await page.locator('#confirm-password').fill('outraSenha123')
    await page.getByRole('button', { name: 'Alterar senha' }).click()
    await expect(page.getByText('As senhas não coincidem.')).toBeVisible()
  })

  test('cadastrar carteira valida endereço e persiste após criação', async ({ page }) => {
    await loginAs(page, SEED_USERS.marcos)
    await page.goto('/wallets')

    await page.locator('#wallet-address').fill('endereco-invalido')
    await page.getByRole('button', { name: 'Cadastrar carteira' }).click()
    await expect(page.getByText('Endereço de carteira inválido')).toBeVisible()

    await page.locator('#wallet-address').fill('0x1234567890abcdef1234567890abcdef12345678')
    await page.getByRole('button', { name: 'Cadastrar carteira' }).click()
    await expect(page.getByText('Carteira cadastrada.')).toBeVisible()

    await page.reload()
    // Radix Select mantém um <select> nativo oculto (para autofill) com as
    // mesmas opções — por isso miramos especificamente no parágrafo da
    // carteira cadastrada, não em qualquer texto "MetaMask" da página.
    await expect(page.locator('p.font-medium', { hasText: /MetaMask|WalletConnect|Coinbase Wallet/ })).toBeVisible()
  })
})
