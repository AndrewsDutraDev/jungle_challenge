import { useId, useMemo } from 'react'
import { mulberry32 } from '@/mocks/prng'
import { cn } from '@/lib/utils'

interface NftArtProps {
  seed: number
  palette: [string, string]
  className?: string
  title?: string
}

/**
 * Arte placeholder gerada proceduralmente a partir do `seed` do NFT —
 * nunca reproduzimos a ilustração original do Figma (personagens ilustrados),
 * só a paleta e a composição. Decisão registrada em ARCHITECTURE.md.
 */
export function NftArt({ seed, palette, className, title }: NftArtProps) {
  const shapes = useMemo(() => {
    const rng = mulberry32(seed)
    const count = 3 + Math.floor(rng() * 3)
    return Array.from({ length: count }, (_, i) => {
      const kind = rng()
      return {
        id: i,
        cx: 10 + rng() * 80,
        cy: 10 + rng() * 80,
        r: 12 + rng() * 30,
        rotate: rng() * 360,
        kind: kind > 0.6 ? 'circle' : kind > 0.3 ? 'square' : 'triangle',
        opacity: 0.25 + rng() * 0.45,
      }
    })
  }, [seed])

  /*
    O id precisa ser único por instância, não por seed: o mesmo NFT aparece em
    mais de um lugar (banner de destaque e card do catálogo) e ids repetidos
    fazem o navegador resolver `url(#id)` para o primeiro do documento — que
    pode estar dentro de uma subárvore oculta, deixando a arte sem pintura.
  */
  const gradientId = `nft-grad-${useId().replace(/:/g, '')}`

  return (
    <svg viewBox="0 0 100 100" role="img" aria-label={title ?? 'Arte do NFT'} className={cn('h-full w-full', className)}>
      <title>{title ?? 'Arte do NFT'}</title>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={palette[0]} />
          <stop offset="100%" stopColor={palette[1]} />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${gradientId})`} />
      {shapes.map((shape) => {
        const commonProps = {
          key: shape.id,
          fill: palette[1],
          opacity: shape.opacity,
          transform: `rotate(${shape.rotate} ${shape.cx} ${shape.cy})`,
        }
        if (shape.kind === 'circle') return <circle {...commonProps} cx={shape.cx} cy={shape.cy} r={shape.r / 2.4} />
        if (shape.kind === 'square')
          return (
            <rect
              {...commonProps}
              x={shape.cx - shape.r / 2.4}
              y={shape.cy - shape.r / 2.4}
              width={shape.r / 1.2}
              height={shape.r / 1.2}
              rx={4}
            />
          )
        const r = shape.r / 2
        return (
          <polygon
            {...commonProps}
            points={`${shape.cx},${shape.cy - r} ${shape.cx + r},${shape.cy + r} ${shape.cx - r},${shape.cy + r}`}
          />
        )
      })}
    </svg>
  )
}
