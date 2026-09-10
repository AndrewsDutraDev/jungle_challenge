import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'
import { getSocket } from './client'
import { queryKeys } from '@/lib/query/keys'
import type { Nft, NftUpdatedEvent, Order, OrderUpdatedEvent, Paginated } from '@/types/api'
import { decodeUserIdFromSession } from '@/lib/auth/session-user'

/**
 * Assina `nft.updated` e `order.updated`, mantém o cache do TanStack Query
 * sincronizado e reconcilia via REST após reconectar. Deve ser montado uma
 * única vez, próximo da raiz da árvore.
 */
export function useRealtime() {
  const queryClient = useQueryClient()
  const seenEvents = useRef(new Set<string>())
  const nftVersions = useRef(new Map<string, number>())
  const orderVersions = useRef(new Map<string, number>())
  const wasDisconnected = useRef(false)

  useEffect(() => {
    let cancelled = false
    let socketRef: Socket | null = null

    function handleNftUpdated(event: NftUpdatedEvent) {
      if (seenEvents.current.has(event.eventId)) return
      seenEvents.current.add(event.eventId)

      const known = nftVersions.current.get(event.nftId) ?? 0
      if (event.version <= known) return // evento antigo/duplicado — nunca regride estado mais recente
      nftVersions.current.set(event.nftId, event.version)

      queryClient.setQueryData<Nft>(queryKeys.nfts.detail(event.nftId), (prev) =>
        prev && prev.version < event.version
          ? { ...prev, priceEth: event.priceEth, previousPriceEth: event.previousPriceEth, editionsAvailable: event.editionsAvailable, version: event.version }
          : prev,
      )

      queryClient.setQueriesData<Paginated<Nft>>({ queryKey: ['nfts', 'list'] }, (prev) => {
        if (!prev) return prev
        return {
          ...prev,
          items: prev.items.map((n) =>
            n.id === event.nftId && n.version < event.version
              ? { ...n, priceEth: event.priceEth, previousPriceEth: event.previousPriceEth, editionsAvailable: event.editionsAvailable, version: event.version }
              : n,
          ),
        }
      })

      // Carrinho e cotação dependem do preço/disponibilidade ao vivo dos NFTs.
      queryClient.invalidateQueries({ queryKey: queryKeys.cart() })
      queryClient.invalidateQueries({ queryKey: queryKeys.quote() })
    }

    function handleOrderUpdated(event: OrderUpdatedEvent) {
      if (seenEvents.current.has(event.eventId)) return
      seenEvents.current.add(event.eventId)

      // A binding não modela rooms: todo cliente recebe o evento e descarta
      // o que não é da própria sessão (ver ARCHITECTURE.md § Tempo real).
      const currentUserId = decodeUserIdFromSession(queryClient)
      if (!currentUserId || currentUserId !== event.userId) return

      const known = orderVersions.current.get(event.orderId) ?? 0
      if (event.version <= known) return
      orderVersions.current.set(event.orderId, event.version)

      queryClient.setQueryData<Order>(queryKeys.orders.detail(event.orderId), (prev) =>
        prev && prev.version < event.version
          ? { ...prev, status: event.status, transactionHash: event.transactionHash, version: event.version }
          : prev,
      )
      if (event.status !== 'pending') {
        queryClient.invalidateQueries({ queryKey: queryKeys.cart() })
      }
    }

    function handleConnect() {
      if (wasDisconnected.current) {
        // Reconciliação pós-reconexão: refaz as consultas ativas via REST.
        queryClient.invalidateQueries({ queryKey: ['nfts'] })
        queryClient.invalidateQueries({ queryKey: queryKeys.cart() })
        queryClient.invalidateQueries({ queryKey: queryKeys.quote() })
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() })
        wasDisconnected.current = false
      }
    }

    function handleDisconnect() {
      wasDisconnected.current = true
    }

    // `getSocket()` é assíncrono de propósito — importa `socket.io-client`
    // dinamicamente para não capturar `globalThis.WebSocket` antes do MSW
    // aplicar seu patch (ver comentário em `lib/socket/client.ts`). Por isso
    // a inscrição nos eventos só acontece quando a Promise resolve, com uma
    // flag `cancelled` para não vazar listeners se o componente desmontar
    // (ou os efeitos re-executarem) antes disso.
    getSocket().then((socket) => {
      if (cancelled) return
      socketRef = socket
      socket.on('nft.updated', handleNftUpdated)
      socket.on('order.updated', handleOrderUpdated)
      socket.on('connect', handleConnect)
      socket.on('disconnect', handleDisconnect)
    })

    return () => {
      cancelled = true
      if (socketRef) {
        socketRef.off('nft.updated', handleNftUpdated)
        socketRef.off('order.updated', handleOrderUpdated)
        socketRef.off('connect', handleConnect)
        socketRef.off('disconnect', handleDisconnect)
      }
    }
  }, [queryClient])
}
