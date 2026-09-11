/**
 * Seletor de cenários de rede/negócio para a camada de mocks (MSW).
 *
 * O cenário ativo fica em `localStorage["kurio:scenario"]`, então é:
 *  - configurável pela UI (painel "Cenários de teste", visível com mocks ativos);
 *  - reproduzível pelo Playwright via `page.addInitScript` antes de navegar.
 *
 * Todos os cenários são determinísticos. Onde há variação (latência, quedas
 * de conexão), ela sai de um PRNG com semente fixa, reiniciado a cada
 * carregamento da página e a cada reset — a mesma sequência de requisições
 * produz sempre a mesma sequência de latências e falhas.
 *
 * Casos que não dependem deste seletor (cupom inválido/expirado, conflito de
 * cadastro, validação de formulário, acesso a recurso de outra conta) são
 * sempre avaliados a partir do payload e do estado do banco.
 */
import { mulberry32 } from './prng'

export type ScenarioId =
  | 'default'
  | 'empty-catalog'
  | 'slow-network'
  | 'flaky-network'
  | 'out-of-order'
  | 'offline'
  | 'server-errors'
  | 'session-expired'
  | 'price-drift'
  | 'sold-out'
  | 'wallet-declined'
  | 'order-timeout'
  | 'order-declined'

export interface ScenarioDefinition {
  id: ScenarioId
  label: string
  description: string
}

export const SCENARIOS: ScenarioDefinition[] = [
  {
    id: 'default',
    label: 'Padrão',
    description: 'Latência realista (90–320ms); a carteira conecta e o pagamento é confirmado.',
  },
  { id: 'empty-catalog', label: 'Catálogo vazio', description: 'Toda busca no catálogo retorna zero resultados.' },
  { id: 'slow-network', label: 'Rede lenta', description: 'Latência alta (1.8s–3.2s) em todas as chamadas.' },
  {
    id: 'flaky-network',
    label: 'Latência variável',
    description: 'Latência de 0.2s a 2.6s e ~12% de quedas de conexão, numa sequência reproduzível.',
  },
  {
    id: 'out-of-order',
    label: 'Respostas fora de ordem',
    description:
      'Após cada carregamento, as listagens do catálogo respondem cada vez mais rápido (1.8s, 1.2s, 0.6s, depois 150ms): filtros aplicados em sequência recebem as respostas na ordem inversa.',
  },
  { id: 'offline', label: 'Sem conexão', description: 'Todas as chamadas falham por indisponibilidade de conexão.' },
  { id: 'server-errors', label: 'Erros de servidor', description: 'Toda chamada de dados responde 503 (falha transitória).' },
  { id: 'session-expired', label: 'Sessão expirada', description: 'Qualquer rota protegida responde 401 SESSION_EXPIRED.' },
  {
    id: 'price-drift',
    label: 'Preço/edição mudando',
    description: 'A cada 2.5s um NFT do carrinho muda de preço (±15%) e, a cada três mudanças, perde uma edição.',
  },
  {
    id: 'sold-out',
    label: 'Edição esgota na compra',
    description: 'Ao confirmar a compra, a última edição de um item do carrinho é vendida para outro colecionador.',
  },
  { id: 'wallet-declined', label: 'Carteira recusa', description: 'A carteira simulada recusa toda solicitação de conexão.' },
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

export function isScenario(...ids: ScenarioId[]): boolean {
  return ids.includes(getScenarioId())
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ---------------------------------------------------------------------------
// Variação reproduzível
// ---------------------------------------------------------------------------

const SCENARIO_SEED = 0x6b75726f
let random = mulberry32(SCENARIO_SEED)
let catalogListRequests = 0

/** Volta a sequência pseudoaleatória ao início — chamado pelo reset dos mocks. */
export function resetScenarioRandom() {
  random = mulberry32(SCENARIO_SEED)
  catalogListRequests = 0
}

/** Aplica a latência do cenário ativo. Chamado no início de cada handler. */
export async function applyNetworkDelay(): Promise<void> {
  const id = getScenarioId()
  let [min, max] = [90, 320]
  if (id === 'slow-network') [min, max] = [1800, 3200]
  if (id === 'flaky-network') [min, max] = [200, 2600]
  await sleep(min + random() * (max - min))
}

const OUT_OF_ORDER_LATENCIES_MS = [1800, 1200, 600]

/**
 * Latência das listagens do catálogo. No cenário `out-of-order`, cada uma das
 * primeiras listagens após carregar a página responde mais rápido que a
 * anterior — buscas disparadas em sequência chegam na ordem inversa, e a mais
 * antiga chega por último. O cliente precisa descartá-la em vez de
 * sobrescrever a tela com um resultado obsoleto.
 */
export async function applyCatalogListDelay(): Promise<void> {
  if (getScenarioId() !== 'out-of-order') return applyNetworkDelay()
  await sleep(OUT_OF_ORDER_LATENCIES_MS[catalogListRequests++] ?? 150)
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
  if (id === 'flaky-network' && random() < 0.12) throw new ConnectionFailureError()
}

/** Retorna um status HTTP de erro transitório quando o cenário injeta falhas de servidor. */
export function maybeServerError(): number | null {
  return getScenarioId() === 'server-errors' ? 503 : null
}
