// Gera o payload de arquivos para o deploy manual via Vercel MCP
// (deploy_to_vercel espera um array {file, data, encoding} — sem acesso a
// filesystem montado, então construímos a árvore a partir do disco real).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { readdirSync, statSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve('.')
const TEXT_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.svg', '.html', '.md'])

function walk(dir, out) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      walk(full, out)
    } else {
      out.push(full)
    }
  }
}

const files = []

// src/ e public/ inteiros
for (const dir of ['src', 'public']) {
  const list = []
  walk(path.join(ROOT, dir), list)
  for (const f of list) {
    const rel = path.relative(ROOT, f).split(path.sep).join('/')
    const ext = path.extname(f)
    if (TEXT_EXT.has(ext)) {
      files.push({ file: rel, data: readFileSync(f, 'utf-8'), encoding: 'utf-8' })
    } else {
      files.push({ file: rel, data: readFileSync(f).toString('base64'), encoding: 'base64' })
    }
  }
}

// index.html
files.push({ file: 'index.html', data: readFileSync(path.join(ROOT, 'index.html'), 'utf-8'), encoding: 'utf-8' })

// package.json trimado (sem devDependencies de teste/auditoria/lint, que não
// entram no build e só aumentam o tempo de install no Vercel)
const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf-8'))
const REMOVE_DEV = [
  '@playwright/test',
  'lighthouse',
  'chrome-launcher',
  'eslint',
  'eslint-plugin-jsx-a11y',
  'eslint-plugin-react-hooks',
  'eslint-plugin-react-refresh',
  '@typescript-eslint/eslint-plugin',
  '@typescript-eslint/parser',
]
for (const dep of REMOVE_DEV) delete pkg.devDependencies[dep]
// scripts: mantém só o necessário para o Vercel buildar
pkg.scripts = {
  dev: pkg.scripts.dev,
  build: pkg.scripts.build,
  preview: pkg.scripts.preview,
}
files.push({ file: 'package.json', data: JSON.stringify(pkg, null, 2) + '\n', encoding: 'utf-8' })

// tsconfig.json e tsconfig.app.json inalterados
for (const f of ['tsconfig.json', 'tsconfig.app.json', 'vite.config.ts', 'tailwind.config.ts', 'postcss.config.js', '.env.production']) {
  files.push({ file: f, data: readFileSync(path.join(ROOT, f), 'utf-8'), encoding: 'utf-8' })
}

// tsconfig.node.json trimado: só vite.config.ts (playwright.config.ts e
// scripts/ não fazem parte do payload de deploy)
const tsconfigNode = {
  compilerOptions: {
    tsBuildInfoFile: './node_modules/.tmp/tsconfig.node.tsbuildinfo',
    target: 'ES2022',
    lib: ['ES2023'],
    module: 'ESNext',
    skipLibCheck: true,
    moduleResolution: 'Bundler',
    allowImportingTsExtensions: true,
    isolatedModules: true,
    moduleDetection: 'force',
    noEmit: true,
    strict: true,
  },
  include: ['vite.config.ts'],
}
files.push({ file: 'tsconfig.node.json', data: JSON.stringify(tsconfigNode, null, 2) + '\n', encoding: 'utf-8' })

// vercel.json: fallback de SPA para qualquer rota (client-side routing do
// TanStack Router) — sem isso, acesso direto/refresh em /nft/:id, /cart etc
// retornaria 404 do Vercel em vez de servir o index.html.
const vercelJson = {
  rewrites: [{ source: '/(.*)', destination: '/index.html' }],
}
files.push({ file: 'vercel.json', data: JSON.stringify(vercelJson, null, 2) + '\n', encoding: 'utf-8' })

const outDir = path.join(ROOT, 'scripts', '.deploy-out')
mkdirSync(outDir, { recursive: true })

// Divide em pedaços < 150KB cada (JSON compacto, uma linha por pedaço) para
// caber no limite de 256KB por leitura da ferramenta Read — cada pedaço é um
// array de objetos {file, data, encoding} igual ao payload final, só que
// fatiado; concatenar os arrays de todos os pedaços reconstrói o payload
// completo.
const CHUNK_MAX_BYTES = 150_000
const chunks = []
let current = []
let currentSize = 2
for (const f of files) {
  const entrySize = JSON.stringify(f).length + 1
  if (currentSize + entrySize > CHUNK_MAX_BYTES && current.length > 0) {
    chunks.push(current)
    current = []
    currentSize = 2
  }
  current.push(f)
  currentSize += entrySize
}
if (current.length > 0) chunks.push(current)

chunks.forEach((chunk, i) => {
  writeFileSync(path.join(outDir, `chunk-${i}.json`), JSON.stringify(chunk))
})
writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify({ numChunks: chunks.length, files: files.map((f) => f.file) }, null, 2))
console.log(`Wrote ${chunks.length} chunk(s) to ${outDir}`)
chunks.forEach((c, i) => console.log(`  chunk-${i}.json: ${c.length} files, ${(JSON.stringify(c).length / 1024).toFixed(1)} KB`))
let totalBytes = 0
for (const f of files) totalBytes += f.data.length
console.log(`Approx total payload size (data only): ${(totalBytes / 1024).toFixed(1)} KB`)
