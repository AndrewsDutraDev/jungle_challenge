import { useState } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { Heart, Home, Search, ShoppingBag, User as UserIcon } from 'lucide-react'
import { useCartQuery } from '@/lib/api/cart'
import { useSessionQuery } from '@/lib/api/auth'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Barra de navegação inferior do mobile (Figma "Tab Bar", node 70395:245).
 * O detalhe do NFT tem a própria barra de compra fixa no rodapé — as duas não
 * podem coexistir, então lá esta some.
 */
export function MobileTabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { data: cart } = useCartQuery()
  const { data: session } = useSessionQuery()
  const navigate = useNavigate()
  const [searchOpen, setSearchOpen] = useState(false)
  const [term, setTerm] = useState('')

  // Telas com rodapé próprio (barra de compra, resumo do carrinho, botão de
  // confirmar do pagamento) ou que ocupam a tela inteira.
  const HIDDEN_ON = ['/login', '/signup', '/cart', '/checkout']
  if (pathname.startsWith('/nft/') || HIDDEN_ON.includes(pathname)) return null

  const cartCount = cart?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearchOpen(false)
    navigate({ to: '/', search: (prev) => ({ ...prev, q: term || undefined, page: 1 }) })
  }

  return (
    <nav
      aria-label="Navegação principal (mobile)"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface-card md:hidden"
    >
      <ul className="mx-auto flex h-[68px] max-w-lg items-center justify-around px-2">
        <TabItem to="/" label="Início" active={pathname === '/'} icon={Home} />
        <TabItem to="/favorites" label="Favoritos" active={pathname === '/favorites'} icon={Heart} />

        <li className="relative -mt-8">
          <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                aria-label="Buscar NFTs"
                className="flex size-[58px] items-center justify-center rounded-full border-4 border-ink bg-primary text-primary-foreground shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Search className="size-5" />
              </button>
            </DialogTrigger>
            <DialogContent className="top-24 translate-y-0" aria-describedby={undefined}>
              <DialogTitle className="text-body-lg font-bold text-text-primary">Buscar</DialogTitle>
              <form onSubmit={submitSearch} className="flex items-center gap-2">
                <label htmlFor="tabbar-search" className="sr-only">
                  Buscar NFTs
                </label>
                <input
                  id="tabbar-search"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="Explorar coleções"
                  className="h-11 w-full rounded-md border border-border-soft bg-surface-dark px-3 text-body text-text-primary placeholder:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
                <Button type="submit" className="h-11 shrink-0">
                  Buscar
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </li>

        <TabItem to="/cart" label="Carrinho" active={pathname === '/cart'} icon={ShoppingBag} badge={cartCount} />
        <TabItem
          to={session ? '/profile' : '/login'}
          label={session ? 'Perfil' : 'Entrar'}
          active={pathname === '/login'}
          icon={UserIcon}
        />
      </ul>
    </nav>
  )
}

function TabItem({
  to,
  label,
  icon: Icon,
  active,
  badge = 0,
}: {
  to: '/' | '/cart' | '/favorites' | '/profile' | '/login'
  label: string
  icon: typeof Home
  active: boolean
  badge?: number
}) {
  return (
    <li>
      <Link
        to={to}
        aria-label={badge > 0 ? `${label}, ${badge} itens` : label}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'relative flex h-14 w-14 flex-col items-center justify-center gap-1 rounded-md text-[10px]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          active ? 'text-text-accent' : 'text-text-secondary',
        )}
      >
        <Icon className={cn('size-5', active && 'fill-current')} />
        <span>{label}</span>
        {badge > 0 && (
          <span className="absolute right-2 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
            {badge}
          </span>
        )}
      </Link>
    </li>
  )
}
