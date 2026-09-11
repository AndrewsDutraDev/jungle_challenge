import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { renderApp } from './app/bootstrap'

async function startWorker() {
  const { worker } = await import('./mocks/browser')
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: '/mockServiceWorker.js' },
  })
}

async function enableMocking() {
  // Mocks ligados por padrão — não existe backend real neste projeto.
  // VITE_ENABLE_MOCKS=false permite desligar explicitamente (ex.: debugging).
  if (import.meta.env.VITE_ENABLE_MOCKS === 'false') {
    return
  }
  // Sem os mocks não há API: uma falha transitória ao baixar o chunk do MSW
  // ou registrar o Service Worker merece novas tentativas antes de desistir.
  const attempts = 3
  for (let attempt = 1; ; attempt += 1) {
    try {
      await startWorker()
      return
    } catch (err) {
      if (attempt >= attempts) throw err
      await new Promise((resolve) => setTimeout(resolve, 400 * attempt))
    }
  }
}

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Elemento #root não encontrado.')
}

enableMocking()
  .catch((err) => {
    // Nunca falhar silenciosamente: como não existe backend real, um erro
    // aqui (ex.: Service Worker bloqueado) deixaria a aplicação inteira sem
    // dados sem nenhuma pista no console.
    // eslint-disable-next-line no-console
    console.error('[mocks] Falha ao habilitar o MSW:', err)
  })
  .finally(() => {
    createRoot(rootElement).render(<StrictMode>{renderApp()}</StrictMode>)
  })
