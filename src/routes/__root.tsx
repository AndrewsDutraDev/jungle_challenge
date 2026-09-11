import { createRootRouteWithContext, Outlet, useRouterState } from '@tanstack/react-router'
import type { RouterContext } from '@/app/router-context'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { MobileTabBar } from '@/components/layout/MobileTabBar'
import { ScenarioPanel } from '@/components/dev/ScenarioPanel'
import { NotFound } from '@/components/layout/NotFound'
import { RouteErrorBoundary } from '@/components/layout/RouteErrorBoundary'

const MOCKS_ENABLED = import.meta.env.VITE_ENABLE_MOCKS !== 'false'

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  notFoundComponent: () => (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1">
        <NotFound />
      </main>
      <Footer />
    </div>
  ),
  errorComponent: RouteErrorBoundary,
})

function RootComponent() {
  const isFetching = useRouterState({ select: (s) => s.status === 'pending' })

  return (
    <div className="flex min-h-screen flex-col">
      {isFetching && (
        <div aria-hidden className="fixed left-0 top-0 z-[70] h-0.5 w-full overflow-hidden bg-transparent">
          <div className="h-full w-1/3 animate-[shimmer_1s_ease-in-out_infinite] bg-primary" />
        </div>
      )}
      <Header />
      <main id="main-content" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      {/* Espaço para a barra fixa do mobile não cobrir o fim da página. */}
      <div aria-hidden className="h-[68px] md:hidden" />
      <MobileTabBar />
      {MOCKS_ENABLED && <ScenarioPanel />}
    </div>
  )
}
