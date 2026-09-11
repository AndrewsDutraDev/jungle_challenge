import { createFileRoute } from '@tanstack/react-router'
import { requireSession } from '@/lib/auth/require-session'
import { FavoritesPage } from '@/features/account/FavoritesPage'

export const Route = createFileRoute('/favorites')({
  beforeLoad: async ({ context, location }) => {
    await requireSession(context.queryClient, location.href)
  },
  component: FavoritesPage,
})
