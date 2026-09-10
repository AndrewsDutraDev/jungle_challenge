import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { NftArt } from '@/components/nft/NftArt'

export function Hero() {
  return (
    <section className="border-b border-border bg-surface-dark">
      <div className="container grid items-center gap-8 py-12 md:grid-cols-2 md:py-16">
        <div>
          <p className="mb-3 text-tiny font-bold uppercase tracking-[0.3em] text-text-secondary">Bem-vindo à Kurio</p>
          <h1 className="text-display leading-tight text-text-primary">SEJA DONO DO FUTURO DA ARTE DIGITAL</h1>
          <p className="mt-4 max-w-md text-body text-text-secondary">
            Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e entre para a
            cultura do colecionador.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link to="/">EXPLORAR</Link>
          </Button>
        </div>
        <div className="aspect-square overflow-hidden rounded-xl border border-border">
          <NftArt seed={4242} palette={['#E89B55', '#140D0A']} title="Destaque da Kurio" />
        </div>
      </div>
    </section>
  )
}
