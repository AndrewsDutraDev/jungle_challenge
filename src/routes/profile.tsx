import { createFileRoute } from '@tanstack/react-router'
import { requireSession } from '@/lib/auth/require-session'
import { ProfilePage } from '@/features/account/ProfilePage'

export const Route = createFileRoute('/profile')({
  beforeLoad: async ({ context, location }) => {
    await requireSession(context.queryClient, location.href)
  },
  component: ProfilePage,
})
