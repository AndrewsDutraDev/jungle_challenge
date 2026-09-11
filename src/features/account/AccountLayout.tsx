import type { ReactNode } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { Activity, Download, Heart, LifeBuoy, LogOut, Tag, User, Wallet } from 'lucide-react'
import { useLogoutMutation } from '@/lib/api/auth'
import { cn } from '@/lib/utils'

const LINKS = [
  { to: '/profile' as const, label: 'Dados do perfil', icon: User },
  { to: '/wallets' as const, label: 'Carteiras', icon: Wallet },
]

/*
  A navegação do Figma também lista Atividade, Lista de interesse, Ofertas,
  Arquivos baixados e Suporte. Essas áreas não fazem parte do escopo da
  entrega, então aparecem desabilitadas — mesmo tratamento dado a "Criadores" e
  "Aprenda" no header, em vez de sumirem da navegação.
*/
const OUT_OF_SCOPE = [
  { label: 'Atividade', icon: Activity },
  { label: 'Lista de interesse', icon: Heart },
  { label: 'Ofertas', icon: Tag },
  { label: 'Arquivos baixados', icon: Download },
  { label: 'Suporte', icon: LifeBuoy },
]

export function AccountLayout({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const logout = useLogoutMutation()

  return (
    <div className="container py-10">
      <div className="grid gap-8 md:grid-cols-[240px_1fr]">
        <nav aria-label="Navegação da conta" className="h-fit bg-surface-card">
          <p className="px-4 py-3 text-body-lg font-bold text-foreground">Meu perfil</p>
          <ul>
            {LINKS.map((link) => {
              const active = pathname === link.to
              return (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 border-l-2 px-4 py-3 text-body',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                      active
                        ? 'border-primary bg-surface-raised text-text-accent'
                        : 'border-transparent text-text-secondary hover:text-text-primary',
                    )}
                  >
                    <link.icon aria-hidden className="size-4" />
                    {link.label}
                  </Link>
                </li>
              )
            })}
            {OUT_OF_SCOPE.map((item) => (
              <li key={item.label}>
                <span
                  aria-disabled="true"
                  title="Fora do escopo desta entrega"
                  className="flex cursor-not-allowed items-center gap-3 border-l-2 border-transparent px-4 py-3 text-body text-text-secondary/40"
                >
                  <item.icon aria-hidden className="size-4" />
                  {item.label}
                </span>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => logout.mutate()}
                className="flex w-full items-center gap-3 border-l-2 border-transparent px-4 py-3 text-body text-text-accent hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <LogOut aria-hidden className="size-4" />
                Sair
              </button>
            </li>
          </ul>
        </nav>

        <div>
          <div className="mb-6">
            <h1 className="text-body-lg font-bold text-foreground">{title}</h1>
            <p className="mt-1 text-body text-text-secondary">{description}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
