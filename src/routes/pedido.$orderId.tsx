import { createFileRoute } from '@tanstack/react-router'
import { requireSession } from '@/lib/auth/require-session'
import { OrderConfirmationPage } from '@/features/checkout/OrderConfirmationPage'

export const Route = createFileRoute('/pedido/$orderId')({
  beforeLoad: async ({ context, location }) => {
    await requireSession(context.queryClient, location.href)
  },
  component: OrderConfirmationPage,
})
