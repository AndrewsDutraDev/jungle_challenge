import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AuthCardProps {
  mode: 'login' | 'signup'
  redirect?: string
  children: ReactNode
}

export function AuthCard({ mode, redirect, children }: AuthCardProps) {
  return (
    <div className="container flex min-h-[70vh] items-center justify-center py-14">
      <Card className="w-full max-w-md bg-surface-dark p-6">
        <div className="mb-5 flex justify-center gap-6 border-b border-border pb-3" role="tablist" aria-label="Entrar ou criar conta">
          <Link
            to="/login"
            search={{ redirect }}
            role="tab"
            aria-selected={mode === 'login'}
            className={cn('text-body-lg font-bold', mode === 'login' ? 'text-primary' : 'text-text-secondary')}
          >
            Entrar
          </Link>
          <Link
            to="/signup"
            search={{ redirect }}
            role="tab"
            aria-selected={mode === 'signup'}
            className={cn('text-body-lg font-bold', mode === 'signup' ? 'text-primary' : 'text-text-secondary')}
          >
            Criar conta
          </Link>
        </div>

        {children}

        <div className="mt-5 flex items-center gap-3 text-caption text-text-secondary">
          <span className="h-px flex-1 bg-border" />
          Ou continue com
          <span className="h-px flex-1 bg-border" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="secondary" disabled title="Fora do escopo desta entrega (dados simulados)">
            Google
          </Button>
          <Button variant="secondary" disabled title="Fora do escopo desta entrega (dados simulados)">
            Facebook
          </Button>
        </div>

        <p className="mt-5 rounded-md border border-border-soft bg-surface-card p-3 text-tiny text-text-secondary">
          Credenciais de teste: <strong className="text-text-primary">ana@kurio.test</strong> ou{' '}
          <strong className="text-text-primary">marcos@kurio.test</strong> · senha <strong className="text-text-primary">kurio123</strong>
        </p>
      </Card>
    </div>
  )
}
