import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export function NotFound({ message = 'Página não encontrada.' }: { message?: string }) {
  return (
    <div className="container flex min-h-[50vh] flex-col items-center justify-center gap-4 py-20 text-center">
      <p className="text-tiny font-bold uppercase tracking-widest text-primary">Erro 404</p>
      <h1 className="text-heading font-bold text-text-primary">{message}</h1>
      <p className="max-w-md text-body text-text-secondary">
        O item que você procura pode ter sido removido ou o endereço está incorreto.
      </p>
      <Button asChild>
        <Link to="/">Voltar ao início</Link>
      </Button>
    </div>
  )
}
