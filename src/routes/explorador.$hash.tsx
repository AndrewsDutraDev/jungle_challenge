import { createFileRoute } from '@tanstack/react-router'
import { ExplorerPage } from '@/features/explorer/ExplorerPage'

// Público, como um explorador de blocos real — não exige sessão.
export const Route = createFileRoute('/explorador/$hash')({
  component: ExplorerPage,
})
