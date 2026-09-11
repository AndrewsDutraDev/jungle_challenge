import { nftHandlers } from './nfts'
import { authHandlers } from './auth'
import { favoritesHandlers } from './favorites'
import { cartHandlers } from './cart'
import { quoteHandlers } from './quote'
import { orderHandlers } from './orders'
import { profileHandlers } from './profile'
import { walletHandlers } from './wallets'
import { metaHandlers } from './meta'
import { explorerHandlers } from './explorer'
import { socketHandler } from '../socket'

export const handlers = [
  ...nftHandlers,
  ...authHandlers,
  ...favoritesHandlers,
  ...cartHandlers,
  ...quoteHandlers,
  ...orderHandlers,
  ...profileHandlers,
  ...walletHandlers,
  ...explorerHandlers,
  ...metaHandlers,
  socketHandler,
]
