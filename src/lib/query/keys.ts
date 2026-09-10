import type { NftListParams } from '@/types/api'

/** Fábrica de query keys — mantém invalidação e cache previsíveis em todo o app. */
export const queryKeys = {
  session: () => ['session'] as const,
  nfts: {
    list: (params: NftListParams) => ['nfts', 'list', params] as const,
    facets: (params: Omit<NftListParams, 'page' | 'pageSize' | 'sort'>) => ['nfts', 'facets', params] as const,
    detail: (id: string) => ['nfts', 'detail', id] as const,
    related: (id: string) => ['nfts', 'related', id] as const,
  },
  favorites: () => ['favorites'] as const,
  cart: () => ['cart'] as const,
  quote: () => ['quote'] as const,
  orders: {
    all: () => ['orders'] as const,
    detail: (id: string) => ['orders', 'detail', id] as const,
  },
  profile: () => ['profile'] as const,
  wallets: () => ['wallets'] as const,
}
