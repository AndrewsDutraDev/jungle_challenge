import { existsSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

/**
 * Alguns ambientes de CI/sandbox pré-instalam apenas o binário completo do
 * Chromium (sem o "headless shell" que o Playwright baixaria por padrão) em
 * um caminho fixo, sinalizado por `PLAYWRIGHT_CHROMIUM_PATH`. Em qualquer
 * outra máquina (checkout limpo padrão) essa variável não existe e o
 * Playwright usa sua resolução normal — nunca dependemos de um caminho fixo
 * que só faz sentido neste sandbox.
 */
const pinnedChromium = process.env.PLAYWRIGHT_CHROMIUM_PATH
const executablePath = pinnedChromium && existsSync(pinnedChromium) ? pinnedChromium : undefined

/**
 * Configuração dos testes E2E (requisito #9 do README).
 *
 * - `webServer` builda e serve a versão de produção (`vite preview`) para que
 *   os testes rodem contra o mesmo bundle que seria publicado — inclui build
 *   a partir de um checkout limpo, sem depender de `vite dev`.
 * - Os mocks (MSW) ficam sempre ativos nesse build (`VITE_ENABLE_MOCKS` não é
 *   `false`), então os testes de REST e tempo real exercitam os handlers MSW
 *   e o cliente `socket.io-client` de verdade — nunca chamadas diretas a
 *   setters/cache (isso seria eliminatório, ver README §6/§9).
 * - `chromium-desktop` e `chromium-mobile` cobrem os fluxos principais nos
 *   dois viewports pedidos; testes de responsividade específicos (390/768/
 *   1440px) usam `test.use({ viewport })`/`page.setViewportSize` pontualmente
 *   dentro do próprio projeto `chromium-desktop` (ver e2e/11-accessibility-
 *   keyboard.spec.ts), então essa cobertura de breakpoint não depende do
 *   projeto `chromium-mobile` conseguir rodar.
 * - Nota sobre este sandbox específico: `chromium-mobile` (emulação de
 *   dispositivo via `devices['iPhone 13']`) falha aqui na etapa de
 *   `browserType.launch` mesmo com `--no-sandbox` — o binário pré-instalado
 *   é uma revisão (1194) mais antiga que a que este `@playwright/test`
 *   espera (1243, só o "headless shell" que não está presente), e não há
 *   dbus/D-Bus no container. Um `chromium.launch()` avulso funciona (assim
 *   como o projeto `chromium-desktop`, que passa 100%), então isto é uma
 *   particularidade deste ambiente de build, não um bug do app ou dos
 *   testes — em uma máquina normal (`npx playwright install` baixando a
 *   revisão correta), `chromium-mobile` deve rodar normalmente sem nenhuma
 *   mudança de código.
 * - Screenshots (`toHaveScreenshot`) usam baselines versionadas em
 *   `e2e/*.spec.ts-snapshots/`, com animações desabilitadas para reduzir
 *   flakiness.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['list'],
  ],
  timeout: 30_000,
  expect: {
    timeout: 8_000,
    toHaveScreenshot: {
      animations: 'disabled',
      maxDiffPixelRatio: 0.02,
    },
  },
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // `--no-sandbox` só é necessário no mesmo sandbox de CI pinado acima
    // (roda como root, onde o Chromium recusa iniciar a zygote sandbox) —
    // fica atrelado à mesma variável para nunca alterar o comportamento
    // padrão em uma máquina de desenvolvimento normal.
    launchOptions: executablePath ? { executablePath, args: ['--no-sandbox'] } : {},
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      // README §9 pede os dois viewports em Chromium. `devices['iPhone 13']`
      // é WebKit — além de contrariar o enunciado, ele trazia instabilidades
      // próprias no Windows (`Frame load interrupted` em navegações) que não
      // vinham da aplicação. Pixel 5 é o equivalente Chromium (mobile + touch),
      // com o viewport fixado em 390px, uma das larguras exigidas na §8.
      name: 'chromium-mobile',
      use: { ...devices['Pixel 5'], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
