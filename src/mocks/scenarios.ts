/**
 * Seletor de cenários de rede/negócio para a camada de mocks (MSW).
 *
 * O cenário ativo fica em `localStorage["kurio:scenario"]`, então é:
 *  - configurável pela UI (painel "Cenários de teste", visível com mocks ativos);
 *  - reproduzível pelo Playwright via `page.addInitScript` antes de navegar.
 *
 * Cenários com efeito determinístico (cupom inválido, conflito de cadastro,
 * validação de formulário) não dependem deste seletor — são sempre avaliados
 * a partir do payload recebido, então não precisam de um "modo" para acontecer.
 */

export type ScenarioId =
  | 'default'
  | 'empty-catalog'
  | 'slow-network'
  | 'flaky-network'
  | 'offline'
  | 'server-errors'
  | 'session-expired'
  | 'price-drift'
  | 'order-timeout'
  | 'order-declined'

export interface ScenarioDefinition {
  id: ScenarioId
  label: string
  description: string
}

export const SCENARIOS: ScenarioDefinition[] = [
  { id: 'default', label: 'Padrão', description: 'Latência realista, sucesso na maior parte das operações.' },
  { id: 'empty-catalog', label: 'Catálogo vazio', description: 'Toda busca no catálogo retorna zero resultados.' },
  { id: 'slow-network', label: 'Rede lenta', description: 'Latência alta e constante (1.8s–3.2s) em todas as chamadas.' },
  {
    id: 'flaky-network',
    label: 'Latência variável',
    description: 'Latência aleatória (0.2s–2.6s) — respostas podem chegar fora de ordem.',
  },
  { id: 'offline', label: 'Sem conexão', description: 'Todas as chamadas falham por indisponibilidade de conexão.' },
  { id: 'server-errors', label: 'Erros de servidor', description: '~40% das chamadas retornam 500/503.' },
  { id: 'session-expired', label: 'Sessão expirada', description: 'Qualquer rota protegida responde 401 SESSION_EXPIRED.' },
  {
    id: 'price-drift',
    label: 'Preço/edição mudando',
    description: 'Itens no carrinho recebem eventos nft.updated com preço/disponibilidade alterados.',
  },
  {
    id: 'order-timeout',
    label: 'Timeout no pedido',
    description: 'Criação de pedido demora além do timeout do cliente, mas o pedido é criado — a repetição com a mesma idempotency key recupera o mesmo pedido.',
  },
  { id: 'order-declined', label: 'Pagamento recusado', description: 'Todo pedido novo é recusado na simulação.' },
]

const STORAGE_KEY = 'kurio:scenario'
const DEFAULT_SCENARIO: ScenarioId = 'default'

export function getScenarioId(): ScenarioId {
  try {
    const value = localStorage.getItem(STORAGE_KEY) as ScenarioId | null
    if (value && SCENARIOS.some((s) => s.id === value)) return value
  } catch {
    // ignora
  }
  return DEFAULT_SCENARIO
}

export function setScenarioId(id: ScenarioId) {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // ignora
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Aplica a latência do cenário ativo. Chamado no início de cada handler. */
export async function applyNetworkDelay(): Promise<void> {
  const id = getScenarioId()
  let [min, max] = [90, 320]
  if (id === 'slow-network') [min, max] = [1800, 3200]
  if (id === 'flaky-network') [min, max] = [200, 2600]
  const ms = min + Math.random() * (max - min)
  await sleep(ms)
}

export class ConnectionFailureError extends Error {
  constructor() {
    super('Falha de conexão simulada')
    this.name = 'ConnectionFailureError'
  }
}

/** Lança para simular queda de conexão — o chamador deve tratar como erro de rede. */
export function maybeFailConnection(): void {
  const id = getScenarioId()
  if (id === 'offline') throw new ConnectionFailureError()
  if (id === 'flaky-network' && Math.random() < 0.12) throw new ConnectionFailureError()
}

/** Retorna um status HTTP de erro transitório quando o cenário injeta falhas de servidor. */
export function maybeServerError(): number | null {
  const id = getScenarioId()
  if (id === 'server-errors' && Math.random() < 0.4) {
    return Math.random() < 0.5 ? 500 : 503
  }
  return null
}

export function isScenario(...ids: ScenarioId[]): boolean {
  return ids.includes(getScenarioId())
}
