import { mulberry32 } from '@/mocks/prng'

/** Gera um avatar abstrato (SVG inline como data URI) a partir de um seed + paleta. */
export function buildAvatarDataUri(seed: number, palette: [string, string]): string {
  const rng = mulberry32(seed)
  const shapes = Array.from({ length: 3 }, () => ({
    cx: 20 + rng() * 60,
    cy: 20 + rng() * 60,
    r: 14 + rng() * 18,
  }))
  const circles = shapes
    .map((s) => `<circle cx="${s.cx.toFixed(1)}" cy="${s.cy.toFixed(1)}" r="${s.r.toFixed(1)}" fill="${palette[1]}" opacity="0.5" />`)
    .join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${palette[0]}" />${circles}</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export const AVATAR_PRESETS: Array<{ seed: number; palette: [string, string] }> = [
  { seed: 101, palette: ['#D28A4C', '#241612'] },
  { seed: 202, palette: ['#E89B55', '#38220F'] },
  { seed: 303, palette: ['#B39463', '#140D0A'] },
  { seed: 404, palette: ['#7FB88A', '#241612'] },
  { seed: 505, palette: ['#E0654F', '#140D0A'] },
  { seed: 606, palette: ['#CFB28C', '#38220F'] },
]
