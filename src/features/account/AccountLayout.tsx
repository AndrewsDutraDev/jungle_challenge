import type { ReactNode } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

const LINKS = [
  { to: '/profile' as const, label: 'Meu perfil' },
  { to: '/wallets' as const, label: 'Carteiras' },
]

export function AccountLayout({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <div className="container py-10">
      <div className="mb-8">
        <h1 className="text-heading font-bold text-text-primary">{title}</h1>
        <p className="mt-1 text-caption text-text-secondary">{description}</p>
      </div>
      <div className="grid gap-8 md:grid-cols-[220px_1fr]">
        <nav aria-label="Navegação da conta" className="flex gap-2 overflow-x-auto md:flex-col">
          {LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                'shrink-0 rounded-md px-3 py-2 text-body font-medium text-text-secondary hover:bg-surface-card hover:text-text-primary',
                pathname === link.to && 'bg-surface-card text-primary',
              )}
              aria-current={pathname === link.to ? 'page' : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div>{children}</div>
      </div>
    </div>
  )
}
