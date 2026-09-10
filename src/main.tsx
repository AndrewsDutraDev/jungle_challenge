import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { renderApp } from './app/bootstrap'

async function enableMocking() {
  // Mocks ligados por padrão — não existe backend real neste projeto.
  // VITE_ENABLE_MOCKS=false permite desligar explicitamente (ex.: debugging).
  if (import.meta.env.VITE_ENABLE_MOCKS === 'false') {
    return
  }
  const { worker } = await import('./mocks/browser')
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: '/mockServiceWorker.js' },
  })
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
    createRoot(rootElement).render(
      <StrictMode>{renderApp()}</StrictMode>,
    )
  })
