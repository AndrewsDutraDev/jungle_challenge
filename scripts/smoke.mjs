import { chromium } from '@playwright/test'

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true })
const page = await browser.newPage()
const errors = []
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text())
})
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))

async function step(name, fn) {
  try {
    await fn()
    console.log(`OK   ${name}`)
  } catch (e) {
    console.log(`FAIL ${name}: ${e.message}`)
  }
}

await step('load home', async () => {
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle', timeout: 15000 })
  await page.waitForSelector('text=SEJA DONO DO FUTURO', { timeout: 10000 })
})

await step('catalog renders NFT cards', async () => {
  await page.waitForSelector('a[href^="/nft/"]', { timeout: 10000 })
  const count = await page.locator('a[href^="/nft/"]').count()
  if (count < 3) throw new Error(`only ${count} cards found`)
})

await step('search updates URL and results', async () => {
  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  const searchBox = page.getByPlaceholder('Buscar NFTs, coleções, criadores…')
  await searchBox.fill('Ape')
  await searchBox.press('Enter')
  await page.waitForURL(/q=Ape/, { timeout: 5000 })
})

await step('go to nft detail', async () => {
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
  await page.locator('a[href^="/nft/"]').first().click()
  await page.waitForSelector('button:has-text("COMPRAR")', { timeout: 10000 })
})

await step('add to cart navigates to cart with item', async () => {
  await page.getByRole('button', { name: /COMPRAR/ }).click()
  await page.waitForURL(/\/cart/, { timeout: 10000 })
  await page.waitForSelector('table', { timeout: 10000 })
})

await step('go to login and sign in with seed user', async () => {
  await page.goto('http://localhost:4173/login', { waitUntil: 'networkidle' })
  await page.locator('#login-email').fill('ana@kurio.test')
  await page.locator('#login-password').fill('kurio123')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL('http://localhost:4173/', { timeout: 10000 })
  await page.waitForSelector('[aria-label="Menu da conta"]', { timeout: 10000 })
})

await step('cart persisted after login, proceed to checkout', async () => {
  await page.goto('http://localhost:4173/cart', { waitUntil: 'networkidle' })
  await page.waitForSelector('table', { timeout: 10000 })
  await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
  await page.waitForURL(/\/checkout/, { timeout: 10000 })
  await page.waitForSelector('text=Perfil do colecionador', { timeout: 10000 })
})

await step('complete checkout end-to-end', async () => {
  await page.getByLabel('Nome de exibição *').fill('Ana Teste')
  await page.getByLabel('Nome de usuário *').fill('ana.teste')
  const connectBtn = page.getByRole('button', { name: 'Conectar' })
  if (await connectBtn.count()) {
    await connectBtn.click()
    await page.waitForSelector('text=Carteira conectada', { timeout: 5000 })
  }
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await page.waitForURL(/\/pedido\//, { timeout: 10000 })
  await page.waitForSelector('text=/Processando seu pedido|Seus NFTs agora estão na sua carteira|Pagamento recusado/', { timeout: 15000 })
})

await step('order resolves to a terminal state', async () => {
  await page.waitForSelector('text=/Seus NFTs agora estão na sua carteira|Pagamento recusado/', { timeout: 15000 })
})

console.log('\n--- console/page errors captured ---')
console.log(errors.length ? errors.join('\n') : '(none)')

await browser.close()
