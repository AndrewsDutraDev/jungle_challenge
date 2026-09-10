export function formatEth(value: string | number): string {
  const num = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(num)) return '0 ETH'
  const formatted = num % 1 === 0 ? num.toFixed(0) : num.toFixed(num < 1 ? 4 : 2).replace(/0+$/, '').replace(/\.$/, '')
  return `${formatted} ETH`
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
