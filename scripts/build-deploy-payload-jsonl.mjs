// Scratch helper (not part of the delivered project) — builds the exact
// deploy_to_vercel `files` payload as JSONL (one compact JSON object per
// line) so it can be paginated by line via Read(offset,limit) without
// hitting the per-call character cap that a single-line JSON array hits.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve('.')
const TEXT_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.svg', '.html', '.md'])

function walk(dir, out) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) walk(full, out)
    else out.push(full)
  }
}

const files = []

for (const dir of ['src', 'public']) {
  const list = []
  walk(path.join(ROOT, dir), list)
  list.sort()
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

files.push({ file: 'index.html', data: readFileSync(path.join(ROOT, 'index.html'), 'utf-8'), encoding: 'utf-8' })

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
pkg.scripts = { dev: pkg.scripts.dev, build: pkg.scripts.build, preview: pkg.scripts.preview }
files.push({ file: 'package.json', data: JSON.stringify(pkg, null, 2) + '\n', encoding: 'utf-8' })

for (const f of ['tsconfig.json', 'tsconfig.app.json', 'vite.config.ts', 'tailwind.config.ts', 'postcss.config.js', '.env.production']) {
  files.push({ file: f, data: readFileSync(path.join(ROOT, f), 'utf-8'), encoding: 'utf-8' })
}

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

const vercelJson = { rewrites: [{ source: '/(.*)', destination: '/index.html' }] }
files.push({ file: 'vercel.json', data: JSON.stringify(vercelJson, null, 2) + '\n', encoding: 'utf-8' })

const outDir = path.join(ROOT, 'scripts', '.deploy-out')
mkdirSync(outDir, { recursive: true })

const lines = files.map((f) => JSON.stringify(f))
writeFileSync(path.join(outDir, 'payload.jsonl'), lines.join('\n') + '\n')
writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify({ numFiles: files.length, files: files.map((f) => f.file) }, null, 2))

console.log(`Wrote ${files.length} lines to ${outDir}/payload.jsonl`)
let totalBytes = 0
for (const l of lines) totalBytes += l.length
console.log(`Payload size: ${(totalBytes / 1024).toFixed(1)} KB`)
