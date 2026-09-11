import type { CollectorDetails, Nft, Network, OrderStatus, WalletProvider, WalletRole } from '@/types/api'
import { generateNftFixtures, SEED_COUPONS, SEED_USERS } from './fixtures'
import { hashPassword } from './hash'

const STORAGE_KEY = 'kurio:db:v3'
const GUEST_ID_KEY = 'kurio:guestId'

export interface DbUser {
  id: string
  username: string
  displayName: string
  email: string
  passwordHash: string
  avatarUrl: string | null
  createdAt: string
}

export interface DbSession {
  token: string
  userId: string
  expiresAt: string
}

export interface DbFavorite {
  userId: string
  nftId: string
  createdAt: string
}

export interface DbCartItem {
  nftId: string
  quantity: number
  /** Snapshot da última cotação vista pelo cliente — usado para sinalizar mudanças de preço/disponibilidade. */
  lastQuotedPriceEth?: string
  lastQuotedAvailable?: number
}

export interface DbCart {
  ownerKey: string
  items: DbCartItem[]
  couponCode: string | null
  updatedAt: string
}

export interface DbCoupon {
  code: string
  kind: 'percent'
  value: number
  expiresAt: string | null
}

export interface DbOrderItem {
  nftId: string
  quantity: number
  unitPriceEth: string
}

export interface DbOrder {
  id: string
  userId: string
  status: OrderStatus
  items: DbOrderItem[]
  subtotalEth: string
  discountEth: string
  networkFeeEth: string
  totalEth: string
  walletId: string
  network: Network
  transactionHash: string | null
  createdAt: string
  updatedAt: string
  version: number
  idempotencyKey: string
  outcomeAt: number // timestamp (ms) em que o pedido deve resolver (confirmado/recusado)
  // Opcionais: pedidos gravados antes destes campos existirem continuam válidos.
  collector?: CollectorDetails | null
  recipientAddress?: string | null
}

export interface DbWallet {
  id: string
  userId: string
  role: WalletRole
  provider: WalletProvider
  network: Network
  address: string
  ensName: string | null
  connected: boolean
  createdAt: string
}

export interface DbState {
  nfts: Nft[]
  users: DbUser[]
  sessions: DbSession[]
  favorites: DbFavorite[]
  carts: DbCart[]
  coupons: DbCoupon[]
  orders: DbOrder[]
  wallets: DbWallet[]
}

function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
}

async function buildSeedState(): Promise<DbState> {
  const users: DbUser[] = []
  for (const seed of SEED_USERS) {
    users.push({
      id: seed.id,
      username: seed.username,
      displayName: seed.displayName,
      email: seed.email,
      passwordHash: await hashPassword(seed.password),
      avatarUrl: null,
      createdAt: new Date().toISOString(),
    })
  }

  const coupons: DbCoupon[] = SEED_COUPONS.map((c) => ({
    code: c.code,
    kind: c.kind,
    value: c.value,
    expiresAt: c.expired ? new Date(Date.now() - 86_400_000).toISOString() : null,
  }))

  const wallets: DbWallet[] = [
    {
      id: randomId('wallet'),
      userId: 'user_1',
      role: 'primary',
      provider: 'metamask',
      network: 'ethereum',
      address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976',
      ensName: 'ana.eth',
      connected: true,
      createdAt: new Date().toISOString(),
    },
  ]

  return {
    nfts: generateNftFixtures(),
    users,
    sessions: [],
    favorites: [],
    carts: [],
    coupons,
    orders: [],
    wallets,
  }
}

let state: DbState | null = null
let loading: Promise<DbState> | null = null

function persist() {
  if (!state) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // localStorage indisponível (modo privado, quota) — segue só em memória.
  }
}

export async function getDb(): Promise<DbState> {
  if (state) return state
  if (loading) return loading

  loading = (async () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        state = JSON.parse(raw) as DbState
        return state
      }
    } catch {
      // ignora e recria
    }
    state = await buildSeedState()
    persist()
    return state
  })()

  return loading
}

export async function resetDb(): Promise<DbState> {
  state = await buildSeedState()
  persist()
  return state
}

export function saveDb() {
  persist()
}

export function getGuestId(): string {
  try {
    let id = localStorage.getItem(GUEST_ID_KEY)
    if (!id) {
      id = randomId('guest')
      localStorage.setItem(GUEST_ID_KEY, id)
    }
    return id
  } catch {
    return 'guest_ephemeral'
  }
}

export function createId(prefix: string): string {
  return randomId(prefix)
}
