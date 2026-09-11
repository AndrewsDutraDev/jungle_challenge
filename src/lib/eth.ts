/**
 * Aritmética de ETH em inteiros (wei, 18 casas decimais), sem `number`.
 * Valores trafegam como string decimal e são somados, multiplicados e
 * arredondados sem erro de ponto flutuante. Usado pela API simulada (cotação,
 * pedidos, variação de preço) e pela formatação na interface.
 */

const DECIMALS = 18
const SCALE = 10n ** 18n
const DECIMAL_RE = /^(\d+)(?:\.(\d+))?$/

/** "1.25" → 1250000000000000000n. Casas além da 18ª são descartadas. */
export function toWei(value: string): bigint {
  const match = DECIMAL_RE.exec(value.trim())
  if (!match) throw new Error(`Valor em ETH inválido: "${value}"`)
  const [, int, frac = ''] = match
  return BigInt(int) * SCALE + BigInt(frac.slice(0, DECIMALS).padEnd(DECIMALS, '0'))
}

/** Arredonda para `decimals` casas (meio para cima). */
export function roundWei(wei: bigint, decimals: number): bigint {
  if (decimals >= DECIMALS) return wei
  const step = 10n ** BigInt(DECIMALS - decimals)
  const sign = wei < 0n ? -1n : 1n
  const abs = wei * sign
  return (((abs + step / 2n) / step) * step) * sign
}

/** String decimal com no máximo `decimals` casas (arredondando), sem zeros à direita. */
export function fromWei(wei: bigint, decimals = DECIMALS): string {
  const rounded = roundWei(wei, decimals)
  const negative = rounded < 0n
  const abs = negative ? -rounded : rounded
  const int = abs / SCALE
  const frac = (abs % SCALE).toString().padStart(DECIMALS, '0').slice(0, decimals).replace(/0+$/, '')
  return `${negative ? '-' : ''}${int}${frac ? `.${frac}` : ''}`
}

/** `wei × numerator ÷ denominator` — porcentagens e variações sem sair dos inteiros. */
export function mulDiv(wei: bigint, numerator: bigint, denominator: bigint): bigint {
  return (wei * numerator) / denominator
}

export function maxWei(a: bigint, b: bigint): bigint {
  return a > b ? a : b
}

export function compareWei(a: bigint, b: bigint): number {
  return a < b ? -1 : a > b ? 1 : 0
}
