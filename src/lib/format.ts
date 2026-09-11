import { toWei, fromWei } from '@/lib/eth'

const ONE_ETH = toWei('1')

/** Até 1 ETH mostra 4 casas, acima 2 — arredondando a partir da string, nunca via `number`. */
export function formatEth(value: string): string {
  let wei: bigint
  try {
    wei = toWei(value)
  } catch {
    return '0 ETH'
  }
  return `${fromWei(wei, wei < ONE_ETH ? 4 : 2)} ETH`
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso))
}

export function truncateAddress(address: string): string {
  if (address.length <= 12) return address
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}
