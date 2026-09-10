import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Menu, Search, ShoppingCart, User as UserIcon, X } from 'lucide-react'
import { useSessionQuery } from '@/lib/api/auth'
import { useCartQuery } from '@/lib/api/cart'
import { useLogoutMutation } from '@/lib/api/auth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

const ENABLED_NAV_LINKS = [
  { label: 'Início', to: '/' as const },
  { label: 'Mercado', to: '/' as const },
]

const DISABLED_NAV_LINKS = ['Criadores', 'Aprenda']

export function Header() {
  const { data: session } = useSessionQuery()
  const { data: cart } = useCartQuery()
  const logout = useLogoutMutation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus()
  }, [searchOpen])

  const cartCount = cart?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0
  const initials = session?.user.displayName?.slice(0, 1).toUpperCase() ?? '?'

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearchOpen(false)
    navigate({ to: '/', search: (prev) => ({ ...prev, q: searchValue || undefined, page: 1 }) })
  }

  return (
    <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
      <header className="sticky top-0 z-40 border-b border-border bg-ink/95 backdrop-blur">
        <a href="#main-content" className="sr-only-focusable">
          Pular para o conteúdo
        </a>
        <div className="container flex h-[68px] items-center justify-between gap-4">
          <Link to="/" className="text-body-lg font-bold tracking-[0.2em] text-text-primary">
            KURIO
          </Link>

          <nav className="hidden items-center gap-8 md:flex" aria-label="Navegação principal">
            {ENABLED_NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className="text-body font-medium text-text-secondary transition-colors hover:text-text-primary [&.active]:text-primary"
                activeOptions={{ exact: true }}
              >
                {link.label}
              </Link>
            ))}
            {DISABLED_NAV_LINKS.map((label) => (
              <span
                key={label}
                aria-disabled="true"
                title="Fora do escopo desta entrega"
                className="cursor-not-allowed text-body font-medium text-text-secondary/40"
              >
                {label}
              </span>
            ))}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-3">
            <Button variant="ghost" size="icon" aria-label="Buscar" onClick={() => setSearchOpen((v) => !v)}>
              <Search />
            </Button>
            <Button variant="ghost" size="icon" aria-label={`Carrinho, ${cartCount} itens`} asChild className="relative">
              <Link to="/cart">
                <ShoppingCart />
                {cartCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-tiny font-bold text-primary-foreground">
                    {cartCount}
                  </span>
                )}
              </Link>
            </Button>

            {session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Menu da conta">
                    <Avatar className="h-8 w-8">
                      {session.user.avatarUrl && <AvatarImage src={session.user.avatarUrl} alt="" />}
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="px-3 py-2 text-caption text-text-secondary">{session.user.displayName}</div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile">Meu perfil</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/wallets">Carteiras</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => logout.mutate()}>Sair</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link to="/login">
                  <UserIcon className="h-4 w-4" /> Entrar
                </Link>
              </Button>
            )}

            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menu">
                {mobileOpen ? <X /> : <Menu />}
              </Button>
            </DialogTrigger>
          </div>
        </div>

        {searchOpen && (
          <div className="border-t border-border bg-surface-dark">
            <form onSubmit={submitSearch} className="container flex items-center gap-2 py-3">
              <Search className="h-4 w-4 shrink-0 text-text-secondary" aria-hidden />
              <input
                ref={searchInputRef}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Buscar NFTs, coleções, criadores…"
                className="w-full bg-transparent text-body text-text-primary placeholder:text-text-secondary/60 focus:outline-none"
                aria-label="Buscar NFTs"
              />
              <Button type="submit" size="sm">
                Buscar
              </Button>
            </form>
          </div>
        )}

        {/*
          Menu mobile como diálogo modal (Radix Dialog) — não apenas um <nav>
          revelado inline. O gatilho é um DialogTrigger (não um botão solto
          com onClick próprio) justamente para que o Radix saiba devolver o
          foco a ele ao fechar. Isso dá de graça o comportamento exigido pelo
          README (§8) para diálogos/drawers: foco movido para o conteúdo ao
          abrir, Tab/Shift+Tab presos dentro dele, Esc fecha, e o foco volta
          ao botão que abriu o menu.
        */}
        <DialogContent
          className="top-0 max-w-none translate-y-0 gap-0 rounded-none border-x-0 border-t-0 p-0 data-[state=closed]:slide-out-to-top-4 data-[state=open]:slide-in-from-top-4 sm:hidden"
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">Menu de navegação</DialogTitle>
          <nav className="container flex flex-col gap-1 py-3" aria-label="Navegação móvel">
            {ENABLED_NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className="rounded-md px-3 py-2 text-body text-text-primary hover:bg-surface-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {!session && (
              <Link
                to="/login"
                className="rounded-md px-3 py-2 text-body font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={() => setMobileOpen(false)}
              >
                Entrar
              </Link>
            )}
          </nav>
        </DialogContent>
      </header>
    </Dialog>
  )
}
