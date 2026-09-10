import type { Nft, NftAttribute, NftCategory, Network } from '@/types/api'
import { hashStringToSeed, mulberry32, pick, range } from './prng'

const CATEGORIES: NftCategory[] = [
  'arte-digital',
  'fotografia',
  'musica',
  'arte-3d',
  'colecionaveis',
  'generativa',
  'jogos',
  'assinaturas',
  'utilidade',
]

export const CATEGORY_LABELS: Record<NftCategory, string> = {
  'arte-digital': 'Arte digital',
  fotografia: 'Fotografia',
  musica: 'Música',
  'arte-3d': 'Arte 3D',
  colecionaveis: 'Colecionáveis',
  generativa: 'Generativa',
  jogos: 'Jogos',
  assinaturas: 'Assinaturas',
  utilidade: 'Utilidade',
}

const NETWORKS: Network[] = ['ethereum', 'polygon', 'solana']

export const NETWORK_LABELS: Record<Network, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}

const COLLECTIONS = [
  'Kurio Editions',
  'Chroma Drift',
  'Nightframe Studio',
  'Static Bloom',
  'Halide Archive',
  'Origin Loop',
  'Faded Circuit',
  'Paper Static',
]

const CREATORS = [
  'ateliê.eth',
  'novabrut',
  'lumen_studio',
  'quietframe',
  'driftcollective',
  'paperghost',
  'coralcode',
  'moth.eth',
]

const NAME_PREFIXES = [
  'Emerald',
  'Cosmic',
  'Violet',
  'Ivory',
  'Golden',
  'Sage',
  'Neon',
  'Amber',
  'Static',
  'Faded',
  'Coral',
  'Quiet',
]

const NAME_SUFFIXES = [
  'Ape',
  'Nomad',
  'Baron',
  'Bloom',
  'Beat',
  'Vessel',
  'Signal',
  'Drift',
  'Circuit',
  'Frequency',
  'Echo',
  'Loop',
]

const PALETTES: Array<[string, string]> = [
  ['#D28A4C', '#241612'],
  ['#E89B55', '#38220F'],
  ['#B39463', '#140D0A'],
  ['#CFB28C', '#241612'],
  ['#E0654F', '#241612'],
  ['#7FB88A', '#140D0A'],
  ['#E8B155', '#38220F'],
  ['#D28A4C', '#55321F'],
]

const ATTRIBUTE_POOL: Record<string, string[]> = {
  Fundo: ['Estúdio', 'Névoa urbana', 'Vazio digital', 'Gradiente quente'],
  Textura: ['Granulada', 'Vetorial', 'Fotográfica', 'Procedural'],
  Edição: ['Rara', 'Padrão', 'Genesis', 'Colaborativa'],
  Formato: ['Estático', 'Loop 3s', 'Multicamada'],
}

function buildAttributes(rng: () => number): NftAttribute[] {
  const traits = Object.keys(ATTRIBUTE_POOL)
  const count = 2 + Math.floor(rng() * 2)
  const chosen = [...traits].sort(() => rng() - 0.5).slice(0, count)
  return chosen.map((trait) => ({ trait, value: pick(rng, ATTRIBUTE_POOL[trait]) }))
}

export const TOTAL_FIXTURE_NFTS = 42

/** id determinístico do único NFT do seed com editionsAvailable = 0 (ver generateNftFixtures). */
export const SOLD_OUT_FIXTURE_NFT_ID = `nft_${200 + TOTAL_FIXTURE_NFTS - 1}`

export function generateNftFixtures(): Nft[] {
  const nfts: Nft[] = []
  for (let i = 0; i < TOTAL_FIXTURE_NFTS; i++) {
    const tokenId = String(200 + i)
    const seedBase = hashStringToSeed(`kurio-nft-${tokenId}`)
    const rng = mulberry32(seedBase)
    const name = `${pick(rng, NAME_PREFIXES)} ${pick(rng, NAME_SUFFIXES)} #${String(pick(rng, [118, 314, 88, 42, 9, 207, 71, 160, 552, 884])).padStart(3, '0')}`
    const category = pick(rng, CATEGORIES)
    const network = pick(rng, NETWORKS)
    const editionSize = pick(rng, [1, 10, 25, 50, 100])
    // O último item do seed é deterministicamente esgotado (editionsAvailable
    // = 0) — sem isso, o RNG nunca zera a disponibilidade (sempre `Math.max(1, ...)`)
    // e o fluxo de "edição esgotada" do README §9 (fluxo 2) fica impossível de
    // exercitar de ponta a ponta.
    const isLastFixture = i === TOTAL_FIXTURE_NFTS - 1
    const editionsAvailable = isLastFixture
      ? 0
      : editionSize === 1
        ? 1
        : Math.max(1, Math.floor(range(rng, editionSize * 0.15, editionSize)))
    const price = Number(range(rng, 0.08, 3.6).toFixed(2))
    const id = `nft_${tokenId}`

    nfts.push({
      id,
      tokenId,
      slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${tokenId}`,
      name,
      description:
        'Colecionável digital finalizado à mão pelo estúdio, verificado na blockchain, com arte desbloqueável e acesso a colecionadores.',
      collection: pick(rng, COLLECTIONS),
      creator: pick(rng, CREATORS),
      category,
      network,
      priceEth: price.toFixed(2),
      previousPriceEth: null,
      editionIndex: 1,
      editionSize,
      editionsAvailable,
      rating: Number(range(rng, 3.6, 5).toFixed(1)),
      reviewsCount: Math.floor(range(rng, 3, 240)),
      attributes: buildAttributes(rng),
      contractAddress: `0x${Array.from({ length: 40 }, () => Math.floor(rng() * 16).toString(16)).join('')}`,
      royaltyBps: pick(rng, [250, 500, 750]),
      seed: seedBase,
      palette: pick(rng, PALETTES),
      createdAt: new Date(Date.now() - Math.floor(range(rng, 0, 90)) * 86_400_000).toISOString(),
      version: 1,
    })
  }
  return nfts
}

export const CATEGORY_OPTIONS = CATEGORIES
export const NETWORK_OPTIONS = NETWORKS

// ---------------------------------------------------------------------------
// Usuários de teste (credenciais fictícias — ver README da solução)
// ---------------------------------------------------------------------------

export const SEED_USERS = [
  {
    id: 'user_1',
    username: 'ana.colecionadora',
    displayName: 'Ana Ferreira',
    email: 'ana@kurio.test',
    password: 'kurio123',
  },
  {
    id: 'user_2',
    username: 'marcos.nft',
    displayName: 'Marcos Duarte',
    email: 'marcos@kurio.test',
    password: 'kurio123',
  },
] as const

export const SEED_COUPONS = [
  { code: 'KURIO10', kind: 'percent' as const, value: 10, expired: false },
  { code: 'BEMVINDO5', kind: 'percent' as const, value: 5, expired: false },
  { code: 'PROMO2025', kind: 'percent' as const, value: 15, expired: true },
]
