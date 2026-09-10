import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { NftArt } from '@/components/nft/NftArt'

const PROMOS = [
  {
    seed: 17,
    palette: ['#D28A4C', '#241612'] as [string, string],
    title: 'Lançamentos gênesis de edição limitada',
    copy: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
  },
  {
    seed: 16,
    palette: ['#E89B55', '#140D0A'] as [string, string],
    title: 'Arte digital selecionada e muito mais',
    copy: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.',
  },
]

export function PromoCards() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {PROMOS.map((promo) => (
        <div key={promo.title} className="relative flex h-[250px] overflow-hidden rounded-lg bg-surface-card">
          <div className="h-full w-2/5 shrink-0">
            <NftArt seed={promo.seed} palette={promo.palette} title="" />
          </div>
          <div className="flex flex-1 flex-col items-end justify-between p-6 text-right">
            <div>
              <p className="text-body-lg font-bold leading-snug text-text-primary">{promo.title}</p>
              <p className="mt-3 text-body text-text-secondary">{promo.copy}</p>
            </div>
            <Link
              to="/"
              className="flex h-10 w-[140px] items-center justify-between rounded-md bg-primary px-4 text-body font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Explorar
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}
