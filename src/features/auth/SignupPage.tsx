import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Route } from '@/routes/signup'
import { AuthCard } from './AuthCard'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useSignupMutation } from '@/lib/api/auth'
import { KurioApiError } from '@/lib/api/client'
import { useIsMobile } from '@/lib/use-media-query'

export function SignupPage() {
  const { redirect } = Route.useSearch()
  const navigate = useNavigate()
  const signup = useSignupMutation()
  const isMobile = useIsMobile()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFieldErrors({})
    setFormError(null)

    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: 'As senhas não coincidem.' })
      return
    }

    try {
      await signup.mutateAsync({ username, email, password })
      navigate({ to: redirect ?? '/' })
    } catch (err) {
      if (err instanceof KurioApiError) {
        setFieldErrors(err.fields ?? {})
        setFormError(err.message)
      } else {
        setFormError('Não foi possível criar sua conta agora. Verifique sua conexão e tente novamente.')
      }
    }
  }

  return (
    <AuthCard mode="signup" redirect={redirect}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <Label htmlFor="signup-username" className="sr-only md:not-sr-only">Nome de usuário</Label>
          <Input
            id="signup-username"
            placeholder="Nome de usuário"
            required
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            aria-invalid={Boolean(fieldErrors.username)}
            aria-describedby={fieldErrors.username ? 'signup-username-error' : undefined}
            className="mt-1.5"
          />
          {fieldErrors.username && (
            <p id="signup-username-error" className="mt-1 text-tiny text-danger">
              {fieldErrors.username}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="signup-email" className="sr-only md:not-sr-only">Digite seu e-mail</Label>
          <Input
            id="signup-email"
            placeholder="Digite seu e-mail"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? 'signup-email-error' : undefined}
            className="mt-1.5"
          />
          {fieldErrors.email && (
            <p id="signup-email-error" className="mt-1 text-tiny text-danger">
              {fieldErrors.email}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="signup-password" className="sr-only md:not-sr-only">Senha</Label>
          <PasswordInput
            id="signup-password"
            placeholder="Senha"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? 'signup-password-error' : undefined}
            className="mt-1.5"
          />
          {fieldErrors.password && (
            <p id="signup-password-error" className="mt-1 text-tiny text-danger">
              {fieldErrors.password}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="signup-confirm" className="sr-only md:not-sr-only">Confirmar senha</Label>
          <PasswordInput
            id="signup-confirm"
            placeholder="Confirmar senha"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            aria-invalid={Boolean(fieldErrors.confirmPassword)}
            aria-describedby={fieldErrors.confirmPassword ? 'signup-confirm-error' : undefined}
            className="mt-1.5"
          />
          {fieldErrors.confirmPassword && (
            <p id="signup-confirm-error" className="mt-1 text-tiny text-danger">
              {fieldErrors.confirmPassword}
            </p>
          )}
        </div>

        {formError && (
          <p role="alert" className="text-caption text-danger">
            {formError}
          </p>
        )}

        <Button type="submit" className="h-14 w-full rounded-[10px] text-[16px] font-bold md:h-11" disabled={signup.isPending}>
          {signup.isPending ? 'Criando conta…' : isMobile ? 'Criar perfil' : 'Criar conta'}
        </Button>
      </form>
    </AuthCard>
  )
}
