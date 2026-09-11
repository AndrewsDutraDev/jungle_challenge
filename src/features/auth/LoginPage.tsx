import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Route } from '@/routes/login'
import { AuthCard } from './AuthCard'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useLoginMutation } from '@/lib/api/auth'
import { KurioApiError } from '@/lib/api/client'

export function LoginPage() {
  const { redirect } = Route.useSearch()
  const navigate = useNavigate()
  const login = useLoginMutation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFieldErrors({})
    setFormError(null)
    try {
      await login.mutateAsync({ email, password })
      navigate({ to: redirect ?? '/' })
    } catch (err) {
      if (err instanceof KurioApiError) {
        setFieldErrors(err.fields ?? {})
        setFormError(err.message)
      } else {
        setFormError('Não foi possível entrar agora. Verifique sua conexão e tente novamente.')
      }
    }
  }

  return (
    <AuthCard mode="login" redirect={redirect}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <Label htmlFor="login-email">E-mail</Label>
          <Input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
            className="mt-1.5"
          />
          {fieldErrors.email && (
            <p id="login-email-error" className="mt-1 text-tiny text-danger">
              {fieldErrors.email}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="login-password">Senha</Label>
          <PasswordInput
            id="login-password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
            className="mt-1.5"
          />
          {fieldErrors.password && (
            <p id="login-password-error" className="mt-1 text-tiny text-danger">
              {fieldErrors.password}
            </p>
          )}
          <p className="mt-1.5 text-right">
            <span className="cursor-not-allowed text-tiny text-text-accent" title="Fora do escopo desta entrega">
              Esqueceu a senha?
            </span>
          </p>
        </div>

        {formError && !Object.keys(fieldErrors).length && (
          <p role="alert" className="text-caption text-danger">
            {formError}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={login.isPending}>
          {login.isPending ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </AuthCard>
  )
}
