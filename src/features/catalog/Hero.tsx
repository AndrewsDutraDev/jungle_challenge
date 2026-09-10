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
            Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma
            parte da cultura da internet.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link to="/">EXPLORAR</Link>
          </Button>
          <div className="mt-8 flex gap-1.5" aria-hidden="true">
            <span className="h-1.5 w-4 rounded-full bg-primary" />
            <span className="h-1.5 w-1.5 rounded-full bg-border-soft" />
            <span className="h-1.5 w-1.5 rounded-full bg-border-soft" />
          </div>
        </div>
        <div className="aspect-square overflow-hidden rounded-3xl">
          <NftArt seed={4242} palette={['#E89B55', '#140D0A']} title="Destaque da Kurio" />
        </div>
      </div>
    </section>
  )
}
