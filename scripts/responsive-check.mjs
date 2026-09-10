import { chromium } from '@playwright/test'

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true, args: ['--no-sandbox'] })
const page = await browser.newPage()

const widths = [390, 768, 1440]
const paths = ['/', '/nft/nft_206', '/cart', '/login', '/profile', '/wallets']

for (const width of widths) {
  await page.setViewportSize({ width, height: 900 })
  for (const path of paths) {
    await page.goto(`http://localhost:4173${path}`, { waitUntil: 'networkidle' }).catch(() => {})
    const overflow = await page.evaluate(() => {
      const docWidth = document.documentElement.scrollWidth
      const winWidth = document.documentElement.clientWidth
      return { docWidth, winWidth, overflowing: docWidth > winWidth + 1 }
    })
    console.log(`${width}px ${path.padEnd(20)} doc=${overflow.docWidth} win=${overflow.winWidth} ${overflow.overflowing ? '!! OVERFLOW' : 'ok'}`)
  }
}

await browser.close()
