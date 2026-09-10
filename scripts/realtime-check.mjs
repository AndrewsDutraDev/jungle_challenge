import { chromium } from '@playwright/test'

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true })
const page = await browser.newPage()
const allConsole = []
const errors = []
page.on('console', (msg) => {
  allConsole.push(`[${msg.type()}] ${msg.text()}`)
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

await step('load home, wait for realtime socket to settle', async () => {
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle', timeout: 15000 })
  await page.waitForTimeout(1500)
})

await step('go to nft detail, add to cart', async () => {
  await page.locator('a[href^="/nft/"]').first().click()
  await page.waitForSelector('button:has-text("COMPRAR")', { timeout: 10000 })
  await page.getByRole('button', { name: /COMPRAR/ }).click()
  await page.waitForURL(/\/cart/, { timeout: 10000 })
})

await step('login', async () => {
  await page.goto('http://localhost:4173/login', { waitUntil: 'networkidle' })
  await page.locator('#login-email').fill('ana@kurio.test')
  await page.locator('#login-password').fill('kurio123')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL('http://localhost:4173/', { timeout: 10000 })
})

await step('checkout end-to-end (triggers emitNftUpdated + emitOrderUpdated on the mock side)', async () => {
  await page.goto('http://localhost:4173/cart', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
  await page.waitForURL(/\/checkout/, { timeout: 10000 })
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
  // dá tempo pro servidor mock emitir os eventos via WS após resolver o pedido
  await page.waitForTimeout(4000)
})

console.log('\n--- WebSocket handshake errors (should be NONE now) ---')
const wsErrors = errors.filter((e) => /websocket|handshake/i.test(e))
console.log(wsErrors.length ? wsErrors.join('\n') : '(none — good)')

console.log('\n--- MSW WS frame logs (evidence realtime events reached the client) ---')
const wsFrames = allConsole.filter((l) => /nft\.updated|order\.updated|socket\.io/i.test(l))
console.log(wsFrames.length ? wsFrames.join('\n') : '(none found — realtime may not be working)')

console.log('\n--- all other errors ---')
const otherErrors = errors.filter((e) => !/websocket|handshake/i.test(e))
console.log(otherErrors.length ? otherErrors.join('\n') : '(none)')

await browser.close()
