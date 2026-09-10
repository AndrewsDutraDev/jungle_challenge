import { createFileRoute } from '@tanstack/react-router'
import { requireSession } from '@/lib/auth/require-session'
import { WalletsPage } from '@/features/account/WalletsPage'

export const Route = createFileRoute('/wallets')({
  beforeLoad: async ({ context, location }) => {
    await requireSession(context.queryClient, location.href)
  },
  component: WalletsPage,
})
