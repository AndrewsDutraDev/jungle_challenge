import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).slice(Math.max(0, page - 3), page + 2)

  return (
    <nav className="mt-8 flex items-center justify-center gap-1.5" aria-label="Paginação do catálogo">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Página anterior">
        ‹
      </Button>
      {pages.map((p) => (
        <Button
          key={p}
          size="sm"
          variant={p === page ? 'default' : 'outline'}
          aria-current={p === page ? 'page' : undefined}
          onClick={() => onPageChange(p)}
          className={cn('min-w-9')}
        >
          {p}
        </Button>
      ))}
      <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="Próxima página">
        ›
      </Button>
    </nav>
  )
}
