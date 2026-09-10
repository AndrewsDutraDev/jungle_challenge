import { test, expect } from '@playwright/test'

/** README §9, fluxo 11: navegação por teclado, foco de diálogos e validação de formulários. */
test.describe('Acessibilidade — teclado, diálogos e formulários', () => {
  test('teclado alcança busca, carrinho e login em ordem lógica a partir do topo', async ({ page }) => {
    // Fixamos a largura desktop porque a ordem esperada abaixo depende da
    // navegação horizontal (`md:flex`) — no layout mobile os mesmos links
    // vivem dentro do diálogo do menu, testado à parte logo abaixo.
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')
    await page.locator('a[href^="/nft/"]').first().waitFor()

    // Primeiro Tab pula direto para o conteúdo (skip link) antes de qualquer
    // outra coisa — obrigatório pelo README §8.
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused()

    await page.keyboard.press('Tab') // logo "KURIO"
    await page.keyboard.press('Tab') // link "Início"
    await page.keyboard.press('Tab') // link "Mercado"
    await page.keyboard.press('Tab') // botão "Buscar"
    await expect(page.getByRole('button', { name: 'Buscar', exact: true })).toBeFocused()

    await page.keyboard.press('Tab') // link do carrinho
    await expect(page.getByLabel(/Carrinho,/)).toBeFocused()

    await page.keyboard.press('Tab') // botão "Entrar"
    await expect(page.getByRole('link', { name: 'Entrar' }).first()).toBeFocused()
  })

  test('diálogo do menu mobile prende o foco e Esc devolve o foco ao gatilho', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')

    const menuButton = page.getByRole('button', { name: 'Abrir menu' })
    await menuButton.click()

    const dialog = page.getByRole('dialog', { name: 'Menu de navegação' })
    await expect(dialog).toBeVisible()

    // O foco deve estar dentro do diálogo assim que ele abre (Radix Dialog
    // move o foco para o próprio contêiner do diálogo por padrão — um
    // padrão de foco válido; o que importa é que o foco fique preso lá
    // dentro, não qual elemento específico o recebe primeiro).
    await expect(dialog).toContainText('Início')
    const focusInsideDialog = () =>
      page.evaluate(() => {
        const active = document.activeElement
        const dialogEl = document.querySelector('[role="dialog"]')
        return Boolean(dialogEl && active && dialogEl.contains(active))
      })
    expect(await focusInsideDialog()).toBe(true)

    // Tab repetidamente não deve escapar do diálogo.
    for (let i = 0; i < 6; i += 1) await page.keyboard.press('Tab')
    expect(await focusInsideDialog()).toBe(true)

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(menuButton).toBeFocused()
  })

  test('formulário de login valida e associa erros aos campos, tudo por teclado', async ({ page }) => {
    await page.goto('/login')
    await page.locator('#login-email').focus()
    await page.keyboard.type('gente@kurio.test')
    await page.keyboard.press('Tab')
    await page.keyboard.type('senha-errada')
    await page.keyboard.press('Enter')

    // A API mockada não encontra o usuário e associa o erro ao campo de
    // senha (`E-mail ou senha inválidos.`) — a mensagem precisa estar
    // conectada ao campo via aria-describedby, não solta na página.
    const passwordField = page.locator('#login-password')
    await expect(passwordField).toHaveAttribute('aria-invalid', 'true')
    const describedBy = await passwordField.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    await expect(page.locator(`#${describedBy}`)).toBeVisible()
    await expect(page.locator(`#${describedBy}`)).toContainText('inválidos')
  })
})
