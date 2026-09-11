import type { Socket } from 'socket.io-client'

let socket: Socket | null = null
let socketPromise: Promise<Socket> | null = null

/**
 * Cliente Socket.IO único da aplicação — importado DINAMICAMENTE de
 * propósito (ver nota abaixo). `transports: ['websocket']` é obrigatório
 * contra o mock: a binding `@mswjs/socket.io-binding` intercepta apenas
 * WebSocket, não o handshake de long-polling do Engine.IO.
 *
 * CRÍTICO — por que o import é dinâmico: `engine.io-client` (usado
 * internamente pelo `socket.io-client`) resolve o construtor nativo em uma
 * constante de módulo avaliada uma única vez, na primeira vez que o módulo é
 * carregado:
 *
 *   const WebSocketCtor = globalThis.WebSocket || globalThis.MozWebSocket
 *
 * Se `socket.io-client` fosse importado estaticamente no topo deste arquivo,
 * essa captura aconteceria durante a avaliação síncrona do grafo de módulos
 * do bundle — ou seja, ANTES de `enableMocking()` (em `main.tsx`) ter a
 * chance de aguardar `worker.start()` e fazer o MSW aplicar seu patch sobre
 * `globalThis.WebSocket`. O resultado é uma referência permanentemente
 * "congelada" para o WebSocket nativo: toda conexão do socket.io-client
 * passaria a ignorar o mock e tentar uma conexão real (que falha contra o
 * servidor estático do Vite com "Unexpected response code: 200").
 *
 * Adiando o `import('socket.io-client')` para dentro de `getSocket()` — só
 * chamado depois que a árvore React monta, que por sua vez só acontece
 * depois que `main.tsx` aguarda `enableMocking()` — garantimos que a
 * constante acima seja avaliada depois do patch do MSW já estar em vigor.
 */
export async function getSocket(): Promise<Socket> {
  if (socket) return socket
  if (!socketPromise) {
    socketPromise = import('socket.io-client').then(({ io }) =>
      io({
        path: '/socket.io',
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 500,
        reconnectionDelayMax: 4000,
        autoConnect: true,
      }),
    )
  }
  const pending = socketPromise
  const created = await pending
  // Se `disconnectSocket()` rodou enquanto este socket nascia (troca de
  // sessão), ele já não é o atual — não pode sobrescrever o novo.
  if (socketPromise === pending) socket = created
  return created
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
  socketPromise = null
}
