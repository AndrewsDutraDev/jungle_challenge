import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { CATEGORY_OPTIONS, NETWORK_OPTIONS } from '@/mocks/fixtures'
import { CatalogPage } from '@/features/catalog/CatalogPage'
import type { NftCategory, Network } from '@/types/api'

const sortSchema = z.enum(['recent', 'price_asc', 'price_desc', 'trending']).catch('recent')

const categoryTuple = CATEGORY_OPTIONS as unknown as [NftCategory, ...NftCategory[]]
const networkTuple = NETWORK_OPTIONS as unknown as [Network, ...Network[]]

export const catalogSearchSchema = z.object({
  q: z.string().trim().min(1).optional().catch(undefined),
  category: z.array(z.enum(categoryTuple)).optional().catch(undefined),
  network: z.array(z.enum(networkTuple)).optional().catch(undefined),
  minPrice: z.number().nonnegative().optional().catch(undefined),
  maxPrice: z.number().nonnegative().optional().catch(undefined),
  sort: sortSchema.optional(),
  page: z.number().int().min(1).optional().catch(1),
})

export type CatalogSearch = z.infer<typeof catalogSearchSchema>

export const Route = createFileRoute('/')({
  validateSearch: catalogSearchSchema,
  component: CatalogPage,
})
