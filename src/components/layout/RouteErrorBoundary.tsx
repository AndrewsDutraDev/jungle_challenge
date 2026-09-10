import { Link, type ErrorComponentProps } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export function RouteErrorBoundary({ error, reset }: ErrorComponentProps) {
  return (
    <div className="container flex min-h-[50vh] flex-col items-center justify-center gap-4 py-20 text-center" role="alert">
      <p className="text-tiny font-bold uppercase tracking-widest text-danger">Algo deu errado</p>
      <h1 className="text-heading font-bold text-text-primary">Não conseguimos carregar esta página</h1>
      <p className="max-w-md text-body text-text-secondary">{error instanceof Error ? error.message : 'Tente novamente.'}</p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => reset()}>
          Tentar novamente
        </Button>
        <Button asChild>
          <Link to="/">Voltar ao início</Link>
        </Button>
      </div>
    </div>
  )
}
