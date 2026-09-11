import { useSyncExternalStore } from 'react'

/**
 * Usado onde mobile e desktop não são o mesmo layout reflowed — caso da barra
 * de compra do detalhe, que no Figma vira uma barra fixa no rodapé. Alternar
 * por CSS deixaria os dois botões de compra no DOM ao mesmo tempo.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Mesmo breakpoint do `md:` do Tailwind. */
export const useIsMobile = () => useMediaQuery('(max-width: 767px)')
