import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent, type PointerEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { NftArt } from '@/components/nft/NftArt'
import { NFT_ARTWORKS } from '@/mocks/fixtures'
import { useMediaQuery } from '@/lib/use-media-query'
import { cn } from '@/lib/utils'

interface HeroSlide {
  src: string
  seed: number
  palette: [string, string]
  title: string
}

const SLIDES: HeroSlide[] = [
  { src: NFT_ARTWORKS[0], seed: 4242, palette: ['#E89B55', '#140D0A'], title: 'Destaque da Kurio' },
  { src: NFT_ARTWORKS[1], seed: 17, palette: ['#D28A4C', '#241612'], title: 'Coleção em alta' },
  { src: NFT_ARTWORKS[2], seed: 311, palette: ['#CFB28C', '#38220F'], title: 'Lançamento da semana' },
]

const AUTOPLAY_MS = 6000
const SWIPE_THRESHOLD_PX = 40

type HeroSlider = ReturnType<typeof useHeroSlider>

/**
 * Estado do slider do hero, compartilhado pelos layouts mobile e desktop.
 *
 * - Troca sozinho a cada 6s, pausa com o mouse ou o foco no hero e para de
 *   vez quando o colecionador escolhe um destaque (bullet, seta ou arrasto).
 *   Com `prefers-reduced-motion`, nunca troca sozinho.
 * - Só a imagem do 1º destaque entra no carregamento da página (é a candidata
 *   a LCP). A do próximo é montada depois do `load`, para já estar pronta na
 *   troca; as demais, quando são exibidas.
 */
function useHeroSlider() {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [userTookControl, setUserTookControl] = useState(false)
  const [visited, setVisited] = useState<ReadonlySet<number>>(() => new Set([0]))
  const [preloadNext, setPreloadNext] = useState(false)
  const swipeStartX = useRef<number | null>(null)

  const autoplay = !reducedMotion && !userTookControl && !paused
  const next = (index + 1) % SLIDES.length

  useEffect(() => {
    if (!autoplay) return
    const id = window.setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), AUTOPLAY_MS)
    return () => window.clearInterval(id)
  }, [autoplay])

  useEffect(() => {
    setVisited((prev) => (prev.has(index) ? prev : new Set(prev).add(index)))
  }, [index])

  useEffect(() => {
    let timer: number | undefined
    const schedule = () => {
      timer = window.setTimeout(() => setPreloadNext(true), 1500)
    }
    if (document.readyState === 'complete') schedule()
    else window.addEventListener('load', schedule, { once: true })
    return () => {
      window.removeEventListener('load', schedule)
      window.clearTimeout(timer)
    }
  }, [])

  function goTo(target: number) {
    setUserTookControl(true)
    setIndex(((target % SLIDES.length) + SLIDES.length) % SLIDES.length)
  }

  return {
    index,
    next,
    autoplay,
    goTo,
    isMounted: (i: number) => visited.has(i) || (preloadNext && i === next),
    pauseHandlers: {
      onMouseEnter: () => setPaused(true),
      onMouseLeave: () => setPaused(false),
      onFocus: () => setPaused(true),
      onBlur: (e: FocusEvent<HTMLElement>) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false)
      },
    },
    swipeHandlers: {
      onPointerDown: (e: PointerEvent<HTMLElement>) => {
        swipeStartX.current = e.clientX
      },
      onPointerUp: (e: PointerEvent<HTMLElement>) => {
        if (swipeStartX.current === null) return
        const dx = e.clientX - swipeStartX.current
        swipeStartX.current = null
        if (Math.abs(dx) >= SWIPE_THRESHOLD_PX) goTo(index + (dx < 0 ? 1 : -1))
      },
      onPointerCancel: () => {
        swipeStartX.current = null
      },
    },
  }
}

/** Imagens empilhadas com troca em fade; só o destaque ativo fica exposto à tecnologia assistiva. */
function HeroSlides({ slider, sizes, className, rounded }: { slider: HeroSlider; sizes: string; className?: string; rounded: string }) {
  return (
    <div className={cn('relative touch-pan-y select-none', className)} aria-live={slider.autoplay ? 'off' : 'polite'} {...slider.swipeHandlers}>
      {SLIDES.map((slide, i) => {
        const active = i === slider.index
        return (
          <div
            key={slide.src}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} de ${SLIDES.length}`}
            aria-hidden={active ? undefined : true}
            className={cn(
              'absolute inset-0 overflow-hidden bg-surface-card transition-opacity duration-500 motion-reduce:transition-none',
              rounded,
              active ? 'opacity-100' : 'opacity-0',
            )}
          >
            {slider.isMounted(i) && (
              <NftArt src={slide.src} sizes={sizes} priority={i === 0} seed={slide.seed} palette={slide.palette} title={slide.title} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/**
 * Bullets do slider: a ativa é a barra laranja. A área clicável tem 24px de
 * altura, mas a margem negativa mantém a linha com os 6px do Figma.
 */
function HeroBullets({ slider, className }: { slider: HeroSlider; className?: string }) {
  const buttons = useRef<Array<HTMLButtonElement | null>>([])

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const target = (slider.index + step + SLIDES.length) % SLIDES.length
    slider.goTo(target)
    buttons.current[target]?.focus()
  }

  return (
    <div role="group" aria-label="Escolher destaque" className={cn('-my-[9px] flex', className)}>
      {SLIDES.map((slide, i) => {
        const active = i === slider.index
        return (
          <button
            key={slide.src}
            ref={(el) => {
              buttons.current[i] = el
            }}
            type="button"
            aria-label={`Mostrar destaque ${i + 1} de ${SLIDES.length}`}
            aria-current={active ? 'true' : undefined}
            onClick={() => slider.goTo(i)}
            onKeyDown={handleKeyDown}
            className="group/bullet flex h-6 items-center px-[3px] focus-visible:outline-none"
          >
            <span
              className={cn(
                'block h-1.5 rounded-full transition-all duration-300 motion-reduce:transition-none',
                'group-focus-visible/bullet:ring-2 group-focus-visible/bullet:ring-primary group-focus-visible/bullet:ring-offset-2 group-focus-visible/bullet:ring-offset-surface-dark',
                active ? 'w-4 bg-primary' : 'w-1.5 bg-border-soft group-hover/bullet:bg-secondary',
              )}
            />
          </button>
        )
      })}
    </div>
  )
}

export function Hero() {
  const slider = useHeroSlider()
  const nextSlide = SLIDES[slider.next]

  return (
    <section className="border-b border-border bg-surface-dark">
      {/*
        O Figma tem um conteúdo de hero dedicado para mobile (Mobile / Início,
        node 70395:240): card compacto, headline e copy mais curtos, sem botão
        preenchido — não é só o hero desktop reduzido. Por isso os dois blocos
        abaixo, alternados por breakpoint, em vez de um único markup reflowed.
      */}
      <div className="container py-6 md:hidden">
        <div
          role="region"
          aria-roledescription="carrossel"
          aria-label="Destaques da Kurio"
          className="relative flex flex-col items-center gap-4 overflow-hidden rounded-xl bg-gradient-to-br from-primary/25 via-surface-dark to-surface-dark p-4"
          {...slider.pauseHandlers}
        >
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
              <HeroSlides slider={slider} sizes="138px" className="absolute inset-0" rounded="rounded-2xl" />
              {/* Miniatura do próximo destaque, como no Figma. */}
              <div aria-hidden className="absolute -bottom-2 -left-3 z-10 h-[58px] w-[58px] overflow-hidden rounded-2xl border-2 border-surface-dark">
                <NftArt src={nextSlide.src} sizes="58px" seed={nextSlide.seed} palette={nextSlide.palette} title="" />
              </div>
            </div>
          </div>
          <HeroBullets slider={slider} />
        </div>
      </div>

      <div
        role="region"
        aria-roledescription="carrossel"
        aria-label="Destaques da Kurio"
        className="container hidden items-center gap-8 py-12 md:grid md:grid-cols-2 md:py-16"
        {...slider.pauseHandlers}
      >
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
          <HeroBullets slider={slider} className="mt-11 justify-end" />
        </div>
        <HeroSlides slider={slider} sizes="(min-width: 768px) 450px, 138px" className="aspect-square" rounded="rounded-3xl" />
      </div>
    </section>
  )
}
