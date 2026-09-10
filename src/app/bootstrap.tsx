import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { createQueryClient } from '@/lib/query/client'
import { createAppRouter } from './router'
import { onSessionExpired } from '@/lib/api/client'
import { useRealtime } from '@/lib/socket/useRealtime'
import { queryKeys } from '@/lib/query/keys'

const queryClient = createQueryClient()
const router = createAppRouter(queryClient)

onSessionExpired(() => {
  queryClient.setQueryData(queryKeys.session(), null)
  const current = router.state.location
  if (!current.pathname.startsWith('/login')) {
    router.navigate({ to: '/login', search: { redirect: current.href } })
  }
})

function RealtimeMount() {
  useRealtime()
  return null
}

export function renderApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeMount />
      <RouterProvider router={router} />
      <Toaster theme="dark" position="top-right" richColors closeButton />
    </QueryClientProvider>
  )
}
