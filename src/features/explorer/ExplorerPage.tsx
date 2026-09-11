import type { ReactNode } from 'react'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Route } from '@/routes/explorador.$hash'
import { useExplorerTransactionQuery } from '@/lib/api/explorer'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime, formatEth } from '@/lib/format'
import { NETWORK_LABELS } from '@/mocks/fixtures'

/**
 * Explorador de blocos simulado: mostra a transação que a "rede" registrou
 * para um pedido confirmado. É o destino do link do recibo — a referência de
 * transação e o explorador são simulados, não há blockchain real.
 */
export function ExplorerPage() {
  const { hash } = Route.useParams()
  const { data: tx, isLoading, error } = useExplorerTransactionQuery(hash)

  return (
    <div className="container max-w-3xl py-10">
      <button
        type="button"
        onClick={() => window.history.back()}
        className="mb-6 flex items-center gap-2 rounded-sm text-body text-text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ArrowLeft aria-hidden className="size-4" /> Voltar
      </button>

      <section aria-labelledby="explorer-title" className="rounded-lg border border-border bg-surface-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
          <h1 id="explorer-title" className="text-body-lg font-bold text-foreground">
            Kurio Scan
          </h1>
          <span className="rounded-full border border-border-soft px-3 py-1 text-tiny text-text-secondary">
            Explorador simulado — nenhuma transação real
          </span>
        </div>

        {isLoading && (
          <div className="space-y-3 p-6" aria-busy="true" aria-label="Carregando transação">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        )}

        {error && !tx && (
          <p role="alert" className="p-6 text-body text-text-secondary">
            {error instanceof Error ? error.message : 'Não foi possível carregar a transação.'}
          </p>
        )}

        {tx && (
          <dl className="divide-y divide-border">
            <Row label="Hash da transação">
              <span className="break-all">{tx.hash}</span>
            </Row>
            <Row label="Status">
              <span className="flex items-center gap-2 text-success">
                <CheckCircle2 aria-hidden className="size-4" /> Sucesso
              </span>
            </Row>
            <Row label="Bloco">{tx.blockNumber.toLocaleString('pt-BR')}</Row>
            <Row label="Data">{formatDateTime(tx.timestamp)}</Row>
            <Row label="Rede">{NETWORK_LABELS[tx.network]}</Row>
            <Row label="De">
              <span className="break-all">{tx.from ?? '—'}</span>
            </Row>
            <Row label="Para">
              <span className="break-all">{tx.to ?? '—'}</span>
            </Row>
            <Row label="Valor">{formatEth(tx.valueEth)}</Row>
            <Row label="Taxa de rede">{formatEth(tx.feeEth)}</Row>
            <Row label="Tokens transferidos">
              <ul className="space-y-1">
                {tx.tokens.map((token) => (
                  <li key={token.nftId}>
                    {token.name} · #{token.tokenId} (x {token.quantity})
                  </li>
                ))}
              </ul>
            </Row>
          </dl>
        )}
      </section>
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 px-6 py-3 sm:grid-cols-[180px_1fr]">
      <dt className="text-caption text-text-secondary">{label}</dt>
      <dd className="text-body text-foreground">{children}</dd>
    </div>
  )
}
