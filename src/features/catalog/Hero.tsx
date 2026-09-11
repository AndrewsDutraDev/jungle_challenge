import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { NftArt } from '@/components/nft/NftArt'
import { NFT_ARTWORKS } from '@/mocks/fixtures'

export function Hero() {
  return (
    <section className="border-b border-border bg-surface-dark">
      {/*
        O Figma tem um conteúdo de hero dedicado para mobile (Mobile / Início,
        node 70395:240): card compacto, headline e copy mais curtos, sem botão
        preenchido — não é só o hero desktop reduzido. Por isso os dois blocos
        abaixo, alternados por breakpoint, em vez de um único markup reflowed.
      */}
      <div className="container py-6 md:hidden">
        <div className="relative flex flex-col items-center gap-4 overflow-hidden rounded-xl bg-gradient-to-br from-primary/25 via-surface-dark to-surface-dark p-4">
          <div className="flex w-full items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium leading-4 text-text-primary">Bem-vindo à Kurio</p>
              <h1 className="mt-1.5 text-[18px] font-bold leading-[29px] text-text-primary">
                SEJA DONO DA
                <br />
                CULTURA DIGITAL
              </h1>
              <p className="mt-1.5 text-[12px] leading-[18px] text-text-secondary">
                Descubra NFTs selecionados de criadores do mundo todo.
              </p>
              <Link to="/" className="mt-2 inline-flex items-center gap-2 text-[12px] font-bold text-text-accent">
                EXPLORAR
                <span aria-hidden>→</span>
              </Link>
            </div>
            <div className="relative h-[138px] w-[138px] shrink-0">
              <div className="absolute inset-0 overflow-hidden rounded-2xl">
                <NftArt src={NFT_ARTWORKS[0]} sizes="(min-width: 768px) 450px, 138px" seed={4242} palette={['#E89B55', '#140D0A']} title="Destaque da Kurio" />
              </div>
              <div className="absolute -bottom-2 -left-3 h-[58px] w-[58px] overflow-hidden rounded-2xl border-2 border-surface-dark">
                <NftArt src={NFT_ARTWORKS[1]} seed={17} palette={['#D28A4C', '#241612']} title="" />
              </div>
            </div>
          </div>
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="h-1.5 w-1.5 rounded-full bg-border-soft" />
            <span className="h-1.5 w-4 rounded-full bg-primary" />
            <span className="h-1.5 w-1.5 rounded-full bg-border-soft" />
          </div>
        </div>
      </div>

      <div className="container hidden items-center gap-8 py-12 md:grid md:grid-cols-2 md:py-16">
        <div>
          <p className="mb-3 text-[14px] font-medium uppercase leading-4 tracking-[1.4px] text-text-secondary">Bem-vindo à Kurio</p>
          <h1 className="text-display leading-tight text-text-primary">SEJA DONO DO FUTURO DA ARTE DIGITAL</h1>
          <p className="mt-4 max-w-md text-body text-text-secondary">
            Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma
            parte da cultura da internet.
          </p>
          <Button asChild size="lg" className="mt-6 text-[16px] font-bold">
            <Link to="/">EXPLORAR</Link>
          </Button>
          <div className="mt-11 flex justify-end gap-1.5" aria-hidden="true">
            <span className="h-1.5 w-4 rounded-full bg-primary" />
            <span className="h-1.5 w-1.5 rounded-full bg-border-soft" />
            <span className="h-1.5 w-1.5 rounded-full bg-border-soft" />
          </div>
        </div>
        <div className="aspect-square overflow-hidden rounded-3xl">
          <NftArt src={NFT_ARTWORKS[0]} sizes="(min-width: 768px) 450px, 138px" seed={4242} palette={['#E89B55', '#140D0A']} title="Destaque da Kurio" />
        </div>
      </div>
    </section>
  )
}
