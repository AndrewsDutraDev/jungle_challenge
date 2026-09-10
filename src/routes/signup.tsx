import { createFileRoute } from '@tanstack/react-router'
import { authRedirectSchema } from '@/routes/login'
import { SignupPage } from '@/features/auth/SignupPage'

export const Route = createFileRoute('/signup')({
  validateSearch: authRedirectSchema,
  component: SignupPage,
})
