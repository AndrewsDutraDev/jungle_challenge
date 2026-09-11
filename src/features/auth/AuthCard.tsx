import type { ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useIsMobile } from '@/lib/use-media-query'
import { cn } from '@/lib/utils'

interface AuthCardProps {
  mode: 'login' | 'signup'
  redirect?: string
  children: ReactNode
}

const COPY = {
  login: 'Entre para gerenciar sua carteira, coleção e perfil de criador.',
  signup: 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.',
}

/**
 * O Figma apresenta entrar/criar conta como um modal sobre o catálogo. Aqui o
 * modal continua atrelado a uma rota própria (/login, /signup) — é o que
 * preserva deep link, refresh e o retorno ao fluxo anterior via ?redirect.
 */
export function AuthCard({ mode, redirect, children }: AuthCardProps) {
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  /*
    No mobile (Figma 16:1022 e 16:1228) não é um modal sobre o catálogo: é uma
    tela inteira com a marca no topo, título próprio e a troca entre entrar e
    criar conta num link no rodapé, no lugar das abas.
  */
  if (isMobile) {
    return (
      <div className="flex min-h-[calc(100vh-68px)] flex-col gap-10 px-7 pb-6 pt-20">
        <p className="text-center text-[32px] font-bold tracking-[3.2px] text-foreground">KURIO</p>

        <h1 className="text-center text-[20px] font-bold leading-4 text-foreground">
          {mode === 'login' ? 'Entrar' : 'Criar perfil de colecionador'}
        </h1>

        {children}

        <SocialBlock />

        <p className="rounded-md border border-border-soft bg-surface-card p-3 text-tiny text-text-secondary">
          Credenciais de teste: <strong className="text-text-primary">ana@kurio.test</strong> ou{' '}
          <strong className="text-text-primary">marcos@kurio.test</strong> · senha <strong className="text-text-primary">kurio123</strong>
        </p>

        <p className="text-center text-[15px] text-text-secondary">
          {mode === 'login' ? (
            <>
              Novo na Kurio?{' '}
              <Link to="/signup" search={{ redirect }} className="text-text-accent hover:underline">
                Crie uma conta
              </Link>
            </>
          ) : (
            <>
              Já tem uma conta?{' '}
              <Link to="/login" search={{ redirect }} className="text-text-accent hover:underline">
                Entre
              </Link>
            </>
          )}
        </p>
      </div>
    )
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (open) return
        /*
          Fechar leva de volta ao catálogo, mas só quando o fechamento parte do
          usuário (X, Esc, clique fora). Depois de um login bem-sucedido a rota
          já mudou, e navegar aqui cancelaria a navegação em curso.
        */
        const path = window.location.pathname
        if (path === '/login' || path === '/signup') navigate({ to: '/' })
      }}
    >
      <DialogContent className="max-w-md" aria-describedby="auth-subtitle">
        <DialogTitle className="sr-only">{mode === 'login' ? 'Entrar' : 'Criar conta'}</DialogTitle>

        <div className="flex justify-center gap-3" role="tablist" aria-label="Entrar ou criar conta">
          <Link
            to="/login"
            search={{ redirect }}
            role="tab"
            aria-selected={mode === 'login'}
            className={cn('text-body-lg font-bold', mode === 'login' ? 'text-text-accent' : 'text-text-secondary')}
          >
            Entrar
          </Link>
          <span aria-hidden className="text-body-lg text-border-soft">
            |
          </span>
          <Link
            to="/signup"
            search={{ redirect }}
            role="tab"
            aria-selected={mode === 'signup'}
            className={cn('text-body-lg font-bold', mode === 'signup' ? 'text-text-accent' : 'text-text-secondary')}
          >
            Criar conta
          </Link>
        </div>

        <p id="auth-subtitle" className="text-center text-body text-text-secondary">
          {COPY[mode]}
        </p>

        {children}

        <SocialBlock />

        <p className="rounded-md border border-border-soft bg-surface-card p-3 text-tiny text-text-secondary">
          Credenciais de teste: <strong className="text-text-primary">ana@kurio.test</strong> ou{' '}
          <strong className="text-text-primary">marcos@kurio.test</strong> · senha <strong className="text-text-primary">kurio123</strong>
        </p>
      </DialogContent>
    </Dialog>
  )
}

function SocialBlock() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5 text-caption text-foreground">
        <span className="h-px flex-1 bg-border" />
        Ou continue com
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="grid gap-4">
        <Button
          variant="outline"
          className="h-10 rounded-[5px] border-border text-caption font-medium text-text-secondary"
          disabled
          title="Fora do escopo desta entrega (dados simulados)"
        >
          <GoogleMark /> Continuar com Google
        </Button>
        <Button
          variant="outline"
          className="h-10 rounded-[5px] border-border text-caption font-medium text-text-secondary"
          disabled
          title="Fora do escopo desta entrega (dados simulados)"
        >
          <FacebookMark /> Continuar com Facebook
        </Button>
      </div>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path fill="#4285F4" d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.2a5.3 5.3 0 0 1-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.6Z" />
      <path fill="#34A853" d="M12 23.5c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.7H1.8v3C3.7 21 7.6 23.5 12 23.5Z" />
      <path fill="#FBBC05" d="M5.6 14.2a6.9 6.9 0 0 1 0-4.4v-3H1.8a11.5 11.5 0 0 0 0 10.4l3.8-3Z" />
      <path fill="#EA4335" d="M12 5.1c1.7 0 3.2.6 4.4 1.7l3.3-3.3C17.7 1.6 15.1.5 12 .5 7.6.5 3.7 3 1.8 6.8l3.8 3c.9-2.7 3.4-4.7 6.4-4.7Z" />
    </svg>
  )
}

function FacebookMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path
        fill="#1877F2"
        d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.3 2.7.3v2.9h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12Z"
      />
    </svg>
  )
}
