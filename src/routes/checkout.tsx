import { createFileRoute } from '@tanstack/react-router'
import { requireSession } from '@/lib/auth/require-session'
import { CheckoutPage } from '@/features/checkout/CheckoutPage'

export const Route = createFileRoute('/checkout')({
  beforeLoad: async ({ context, location }) => {
    await requireSession(context.queryClient, location.href)
  },
  component: CheckoutPage,
})
