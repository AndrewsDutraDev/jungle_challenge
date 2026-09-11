/**
 * Contratos REST/eventos da Kurio. Documentados também em ARCHITECTURE.md § Contrato REST.
 * Valores em ETH trafegam como string decimal (nunca number) para preservar precisão.
 */

export type EthAmount = string

export type Network = 'ethereum' | 'polygon' | 'solana'

export type SortOption = 'recent' | 'price_asc' | 'price_desc' | 'trending'

export interface Paginated<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface ApiErrorBody {
  error: {
    code:
      | 'VALIDATION_ERROR'
      | 'UNAUTHORIZED'
      | 'SESSION_EXPIRED'
      | 'FORBIDDEN'
      | 'NOT_FOUND'
      | 'CONFLICT'
      | 'AVAILABILITY_CONFLICT'
      | 'TRANSIENT_FAILURE'
      | 'IDEMPOTENCY_MISMATCH'
      | 'RATE_LIMITED'
    message: string
    fields?: Record<string, string>
  }
}

// ---------------------------------------------------------------------------
// Sessão e conta
// ---------------------------------------------------------------------------

export interface User {
  id: string
  username: string
  displayName: string
  email: string
  avatarUrl: string | null
  createdAt: string
}

export interface Session {
  user: User
  expiresAt: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface SignupPayload {
  username: string
  email: string
  password: string
}

// ---------------------------------------------------------------------------
// NFTs
// ---------------------------------------------------------------------------

export type NftCategory =
  | 'arte-digital'
  | 'fotografia'
  | 'musica'
  | 'arte-3d'
  | 'colecionaveis'
  | 'generativa'
  | 'jogos'
  | 'assinaturas'
  | 'utilidade'

export interface NftAttribute {
  trait: string
  value: string
}

export interface Nft {
  id: string
  tokenId: string
  slug: string
  name: string
  description: string
  collection: string
  creator: string
  category: NftCategory
  network: Network
  priceEth: EthAmount
  previousPriceEth: EthAmount | null
  editionIndex: number
  editionSize: number
  editionsAvailable: number
  rating: number
  reviewsCount: number
  attributes: NftAttribute[]
  contractAddress: string
  royaltyBps: number
  /** Arte do NFT (as quatro ilustrações do Figma, em public/nft). */
  imageUrl: string
  /** Mantidos como fallback da arte procedural quando a imagem não carrega. */
  seed: number
  palette: [string, string]
  createdAt: string
  version: number
}

export interface NftFacets {
  categories: Record<NftCategory, number>
  networks: Record<Network, number>
  priceRange: { min: number; max: number }
}

export interface NftListParams {
  q?: string
  category?: NftCategory[]
  minPrice?: number
  maxPrice?: number
  network?: Network[]
  sort?: SortOption
  page?: number
  pageSize?: number
}

// ---------------------------------------------------------------------------
// Favoritos
// ---------------------------------------------------------------------------

export interface FavoriteItem {
  nftId: string
  createdAt: string
}

// ---------------------------------------------------------------------------
// Carrinho
// ---------------------------------------------------------------------------

export interface CartItem {
  nftId: string
  quantity: number
  nft: Nft
}

export interface Cart {
  id: string
  items: CartItem[]
  couponCode: string | null
  updatedAt: string
}

export interface CartMutationPayload {
  nftId: string
  quantity: number
}

// ---------------------------------------------------------------------------
// Cotação
// ---------------------------------------------------------------------------

export interface QuoteLine {
  nftId: string
  quantity: number
  unitPriceEth: EthAmount
  subtotalEth: EthAmount
  availableEditions: number
  nftVersion: number
  priceChanged: boolean
  availabilityChanged: boolean
}

export interface Quote {
  lines: QuoteLine[]
  subtotalEth: EthAmount
  discountEth: EthAmount
  networkFeeEth: EthAmount
  totalEth: EthAmount
  couponCode: string | null
  couponValid: boolean
  isStale: boolean
  quotedAt: string
}

// ---------------------------------------------------------------------------
// Pedidos
// ---------------------------------------------------------------------------

export type OrderStatus = 'pending' | 'confirmed' | 'declined'

export interface OrderItem {
  nftId: string
  name: string
  imageUrl: string
  imageSeed: number
  palette: [string, string]
  tokenId: string
  quantity: number
  unitPriceEth: EthAmount
  subtotalEth: EthAmount
}

/** Dados do colecionador informados no pagamento. Opcionais vazios trafegam como `null`. */
export interface CollectorDetails {
  displayName: string
  username: string
  profileName: string
  ensName: string | null
  secondaryEns: string | null
  referralCode: string | null
  note: string | null
}

export interface Order {
  id: string
  status: OrderStatus
  items: OrderItem[]
  subtotalEth: EthAmount
  discountEth: EthAmount
  networkFeeEth: EthAmount
  totalEth: EthAmount
  walletId: string
  network: Network
  transactionHash: string | null
  /** Retrato dos dados do colecionador no momento da compra. */
  collector: CollectorDetails | null
  /** Carteira que recebe os NFTs, quando diferente da carteira de pagamento. */
  recipientAddress: string | null
  createdAt: string
  updatedAt: string
  version: number
}

export interface CreateOrderPayload {
  walletId: string
  network: Network
  couponCode: string | null
  idempotencyKey: string
  /** Versões dos NFTs vistas na última cotação — usadas para detectar mudanças de preço/disponibilidade. */
  quotedVersions: Record<string, number>
  quotedTotalEth: EthAmount
  collector: CollectorDetails
  /** Preenchido quando o colecionador marca "Usar outra carteira". */
  recipientAddress: string | null
}

// ---------------------------------------------------------------------------
// Explorador de blocos (simulado)
// ---------------------------------------------------------------------------

/** Só o que seria público numa blockchain real — nunca dados da conta. */
export interface ExplorerTransaction {
  hash: string
  network: Network
  status: 'success'
  blockNumber: number
  timestamp: string
  from: string | null
  to: string | null
  valueEth: EthAmount
  feeEth: EthAmount
  tokens: Array<{ nftId: string; name: string; tokenId: string; quantity: number }>
}

// ---------------------------------------------------------------------------
// Perfil
// ---------------------------------------------------------------------------

export interface UpdateProfilePayload {
  displayName: string
  username: string
}

export interface ChangePasswordPayload {
  currentPassword: string
  newPassword: string
}

// ---------------------------------------------------------------------------
// Carteiras
// ---------------------------------------------------------------------------

export type WalletProvider = 'metamask' | 'walletconnect' | 'coinbase'
export type WalletRole = 'primary' | 'secondary'

export interface Wallet {
  id: string
  role: WalletRole
  provider: WalletProvider
  network: Network
  address: string
  ensName: string | null
  connected: boolean
  createdAt: string
}

export interface UpsertWalletPayload {
  role: WalletRole
  provider: WalletProvider
  network: Network
  address: string
  ensName?: string
}

export interface WalletConnectionResult {
  /** `declined` quando o usuário recusa na carteira simulada (cenário `wallet-declined`). */
  status: 'connected' | 'declined'
  wallet: Wallet
}

// ---------------------------------------------------------------------------
// Eventos Socket.IO
// ---------------------------------------------------------------------------

export interface NftUpdatedEvent {
  type: 'nft.updated'
  eventId: string
  nftId: string
  version: number
  priceEth: EthAmount
  previousPriceEth: EthAmount
  editionsAvailable: number
  emittedAt: string
}

export interface OrderUpdatedEvent {
  type: 'order.updated'
  eventId: string
  orderId: string
  userId: string
  version: number
  status: OrderStatus
  transactionHash: string | null
  emittedAt: string
}

export type RealtimeEvent = NftUpdatedEvent | OrderUpdatedEvent
