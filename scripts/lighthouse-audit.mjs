// Auditoria de performance/qualidade com Lighthouse (README §10).
//
// - Audita "/" (Início) e o detalhe de um NFT fixo, nos perfis mobile e
//   desktop, contra o build de produção (`vite preview`) com os mocks no
//   cenário padrão — nunca contra `vite dev` nem com simplificações.
// - Três execuções por página/perfil; reporta a MEDIANA de cada categoria
//   (Performance/Accessibility/Best Practices/SEO) e de LCP/CLS/TBT.
// - Salva relatórios HTML e JSON individuais (todas as execuções, não só a
//   mediana) em reports/lighthouse/, versionados junto do código.
// - Este próprio arquivo É a configuração versionada da auditoria — os
//   presets de perfil abaixo (`PROFILES`) são a única customização em
//   relação aos padrões do Lighthouse.
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'
import path from 'node:path'
import * as chromeLauncher from 'chrome-launcher'
import lighthouse from 'lighthouse'

const BASE_URL = process.env.LH_BASE_URL ?? 'http://localhost:4173'
const RUNS_PER_COMBO = 3
const OUT_DIR = path.resolve('reports/lighthouse')
const CHROME_PATH = process.env.PLAYWRIGHT_CHROMIUM_PATH && existsSync(process.env.PLAYWRIGHT_CHROMIUM_PATH)
  ? process.env.PLAYWRIGHT_CHROMIUM_PATH
  : undefined

const PAGES = [
  { key: 'inicio', path: '/', label: 'Início' },
  // nft_206 é o primeiro item do seed determinístico (ver TOTAL_FIXTURE_NFTS
  // em src/mocks/fixtures.ts) — sempre existe, com disponibilidade > 0.
  { key: 'detalhe', path: '/nft/nft_206', label: 'Detalhe do NFT' },
]

// Perfis padrão do próprio Lighthouse (`lighthouse:default`), só ajustando
// formFactor/screenEmulation/throttling para desktop — sem nenhuma
// simplificação (imagens, fontes e funcionalidades da entrega carregam
// normalmente em ambos).
const PROFILES = {
  mobile: {
    label: 'Mobile',
    configExtras: {}, // usa o preset mobile padrão do Lighthouse (Moto G Power emulado, throttling 4G lento)
  },
  desktop: {
    label: 'Desktop',
    configExtras: {
      formFactor: 'desktop',
      screenEmulation: { mobile: false, width: 1440, height: 900, deviceScaleFactor: 1, disabled: false },
      throttling: {
        rttMs: 40,
        throughputKbps: 10 * 1024,
        cpuSlowdownMultiplier: 1,
        requestLatencyMs: 0,
        downloadThroughputKbps: 0,
        uploadThroughputKbps: 0,
      },
    },
  },
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

async function runOnce(chrome, url, profileKey) {
  const profile = PROFILES[profileKey]
  const result = await lighthouse(
    url,
    { port: chrome.port, output: ['html', 'json'], logLevel: 'error' },
    {
      extends: 'lighthouse:default',
      settings: { formFactor: profileKey === 'desktop' ? 'desktop' : 'mobile', ...profile.configExtras },
    },
  )
  return result
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })

  const chrome = await chromeLauncher.launch({
    chromePath: CHROME_PATH,
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'],
  })

  const allRuns = [] // { page, profile, run, categories, lcp, cls, tbt }

  try {
    for (const page of PAGES) {
      for (const profileKey of Object.keys(PROFILES)) {
        for (let run = 1; run <= RUNS_PER_COMBO; run += 1) {
          const url = `${BASE_URL}${page.path}`
          process.stdout.write(`Lighthouse: ${page.label} / ${PROFILES[profileKey].label} / run ${run}... `)
          const { lhr, report } = await runOnce(chrome, url, profileKey)
          const [html, json] = report
          const baseName = `${page.key}-${profileKey}-run${run}`
          writeFileSync(path.join(OUT_DIR, `${baseName}.html`), html)
          writeFileSync(path.join(OUT_DIR, `${baseName}.json`), json)

          const categories = Object.fromEntries(
            Object.entries(lhr.categories).map(([id, cat]) => [id, Math.round((cat.score ?? 0) * 100)]),
          )
          const lcp = lhr.audits['largest-contentful-paint']?.numericValue ?? null
          const cls = lhr.audits['cumulative-layout-shift']?.numericValue ?? null
          const tbt = lhr.audits['total-blocking-time']?.numericValue ?? null

          allRuns.push({ page: page.key, pageLabel: page.label, profile: profileKey, run, categories, lcp, cls, tbt })
          console.log(`perf=${categories.performance} a11y=${categories.accessibility} bp=${categories['best-practices']} seo=${categories.seo} LCP=${Math.round(lcp)}ms CLS=${cls?.toFixed(3)} TBT=${Math.round(tbt)}ms`)
        }
      }
    }
  } finally {
    await chrome.kill()
  }

  // Medianas por página/perfil.
  const summary = []
  for (const page of PAGES) {
    for (const profileKey of Object.keys(PROFILES)) {
      const runs = allRuns.filter((r) => r.page === page.key && r.profile === profileKey)
      summary.push({
        page: page.key,
        pageLabel: page.label,
        profile: profileKey,
        profileLabel: PROFILES[profileKey].label,
        performance: median(runs.map((r) => r.categories.performance)),
        accessibility: median(runs.map((r) => r.categories.accessibility)),
        bestPractices: median(runs.map((r) => r.categories['best-practices'])),
        seo: median(runs.map((r) => r.categories.seo)),
        lcpMs: Math.round(median(runs.map((r) => r.lcp))),
        clsScore: Number(median(runs.map((r) => r.cls)).toFixed(3)),
        tbtMs: Math.round(median(runs.map((r) => r.tbt))),
      })
    }
  }

  let nodeVersion = process.version
  let chromeVersion = 'desconhecida'
  try {
    chromeVersion = execSync(`${CHROME_PATH ?? 'chromium'} --version`).toString().trim()
  } catch {
    /* segue sem a versão exata do binário caso não seja possível invocá-lo diretamente */
  }

  const environment = {
    date: new Date().toISOString(),
    nodeVersion,
    lighthouseVersion: (await import('lighthouse/package.json', { with: { type: 'json' } })).default.version,
    chromeVersion,
    os: `${process.platform} ${process.arch}`,
    baseUrl: BASE_URL,
    runsPerCombo: RUNS_PER_COMBO,
    mockScenario: 'default',
  }

  writeFileSync(path.join(OUT_DIR, 'all-runs.json'), JSON.stringify(allRuns, null, 2))
  writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify({ environment, summary }, null, 2))

  console.log('\n=== Mediana (3 execuções) ===')
  for (const s of summary) {
    console.log(
      `${s.pageLabel} / ${s.profileLabel}: Performance=${s.performance} Accessibility=${s.accessibility} BestPractices=${s.bestPractices} SEO=${s.seo} | LCP=${s.lcpMs}ms CLS=${s.clsScore} TBT=${s.tbtMs}ms`,
    )
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
