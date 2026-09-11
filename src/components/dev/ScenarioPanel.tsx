import { useState } from 'react'
import { FlaskConical, X } from 'lucide-react'
import { SCENARIOS, getScenarioId, setScenarioId, type ScenarioId } from '@/mocks/scenarios'
import { apiClient } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Painel visível apenas quando os mocks estão ativos (`VITE_ENABLE_MOCKS=true`).
 * Troca o cenário de rede/negócio ativo (persistido em localStorage) e permite
 * restaurar os dados simulados para o estado inicial — usado tanto manualmente
 * quanto pelos testes Playwright (`page.addInitScript`) para reproduzir cada
 * cenário do README de forma determinística.
 */
export function ScenarioPanel() {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<ScenarioId>(() => getScenarioId())
  const [resetting, setResetting] = useState(false)

  async function handleReset() {
    setResetting(true)
    try {
      await apiClient.post('/mocks/reset')
    } finally {
      window.location.reload()
    }
  }

  function handleSelect(id: ScenarioId) {
    setScenarioId(id)
    setActive(id)
  }

  // No mobile as barras fixas (tab bar e barra de compra) ocupam o rodapé.
  return (
    <div className="fixed right-4 top-20 z-[60] md:bottom-4 md:top-auto" data-testid="scenario-panel">
      {open ? (
        <div className="w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-surface-dark p-4 shadow-popover">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-body font-bold text-text-primary">Cenários de teste</h2>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Fechar painel de cenários">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="max-h-80 space-y-1 overflow-y-auto pr-1" role="radiogroup" aria-label="Cenário ativo">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                role="radio"
                aria-checked={active === s.id}
                onClick={() => handleSelect(s.id)}
                className={cn(
                  'block w-full rounded-md border px-3 py-2 text-left transition-colors',
                  active === s.id ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-surface-card',
                )}
              >
                <span className="text-caption font-bold text-text-primary">{s.label}</span>
                <span className="block text-tiny text-text-secondary">{s.description}</span>
              </button>
            ))}
          </div>
          <Button size="sm" variant="secondary" className="mt-3 w-full" onClick={handleReset} disabled={resetting}>
            {resetting ? 'Restaurando…' : 'Restaurar dados simulados'}
          </Button>
        </div>
      ) : (
        <Button
          size="icon"
          className="h-12 w-12 rounded-full shadow-popover"
          onClick={() => setOpen(true)}
          aria-label="Abrir painel de cenários de teste"
        >
          <FlaskConical className="h-5 w-5" />
        </Button>
      )}
    </div>
  )
}
