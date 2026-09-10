import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

/** Credenciais fictícias — mesmas do painel de login e do README da solução. */
export const SEED_USERS = {
  ana: { email: 'ana@kurio.test', password: 'kurio123', displayName: 'Ana Ferreira', username: 'ana.colecionadora' },
  marcos: { email: 'marcos@kurio.test', password: 'kurio123', displayName: 'Marcos Duarte', username: 'marcos.nft' },
} as const

export async function loginAs(page: Page, user: (typeof SEED_USERS)[keyof typeof SEED_USERS], redirect?: string) {
  await page.goto(redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login')
  await page.locator('#login-email').fill(user.email)
  await page.locator('#login-password').fill(user.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByLabel('Menu da conta')).toBeVisible({ timeout: 10_000 })
}

export async function logout(page: Page) {
  await page.getByLabel('Menu da conta').click()
  await page.getByRole('menuitem', { name: 'Sair' }).click()
  await expect(page.getByLabel('Menu da conta')).toHaveCount(0)
}
