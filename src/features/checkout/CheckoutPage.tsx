import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { AlertTriangle, Loader2, Wifi, WifiOff } from 'lucide-react'
import { useCartQuery } from '@/lib/api/cart'
import { useQuoteQuery } from '@/lib/api/quote'
import { useSessionQuery } from '@/lib/api/auth'
import { useWalletsQuery } from '@/lib/api/wallets'
import { useCreateOrderMutation, isRecoverableNetworkError } from '@/lib/api/orders'
import { NftArt } from '@/components/nft/NftArt'
import { OrderTotals } from '@/features/cart/OrderTotals'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { formatEth, truncateAddress } from '@/lib/format'
import { getOrCreateIdempotencyKey, clearIdempotencyKey } from '@/lib/checkout/idempotency'
import { KurioApiError } from '@/lib/api/client'
import { NETWORK_LABELS, NETWORK_OPTIONS, PROVIDER_LABELS } from '@/mocks/fixtures'
import type { Network, Wallet } from '@/types/api'

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'declined'

export function CheckoutPage() {
  const { data: session } = useSessionQuery()
  const { data: cart, isLoading: cartLoading } = useCartQuery()
  const { data: quote, isLoading: quoteLoading, refetch: refetchQuote } = useQuoteQuery(Boolean(cart && cart.items.length > 0))
  const { data: wallets, isLoading: walletsLoading } = useWalletsQuery(true)
  const createOrder = useCreateOrderMutation()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState(session?.user.displayName ?? '')
  const [username, setUsername] = useState(session?.user.username ?? '')
  const [note, setNote] = useState('')
  const [network, setNetwork] = useState<Network | undefined>(undefined)
  const [secondaryEns, setSecondaryEns] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [profileName, setProfileName] = useState(session?.user.displayName ?? '')
  const [ensName, setEnsName] = useState('')
  const [useOtherWallet, setUseOtherWallet] = useState(false)
  const [otherAddress, setOtherAddress] = useState('')
  const [selectedWalletId, setSelectedWalletId] = useState<string | undefined>(undefined)
  const [connection, setConnection] = useState<ConnectionState>('idle')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [awaitingRecovery, setAwaitingRecovery] = useState(false)

  useEffect(() => {
    if (wallets && wallets.length > 0 && !selectedWalletId) {
      const primary = wallets.find((w) => w.role === 'primary') ?? wallets[0]
      setSelectedWalletId(primary.id)
      setNetwork(primary.network)
      setConnection(primary.connected ? 'connected' : 'idle')
    }
  }, [wallets, selectedWalletId])

  const selectedWallet = wallets?.find((w) => w.id === selectedWalletId)

  function handleSelectWallet(wallet: Wallet) {
    setSelectedWalletId(wallet.id)
    setNetwork(wallet.network)
    setConnection(wallet.connected ? 'connected' : 'idle')
  }

  function simulateConnect() {
    setConnection('connecting')
    setTimeout(() => {
      setConnection(Math.random() < 0.85 ? 'connected' : 'declined')
    }, 900)
  }

  function simulateDisconnect() {
    setConnection('idle')
  }

  const quotedVersions = useMemo(() => {
    const map: Record<string, number> = {}
    for (const line of quote?.lines ?? []) map[line.nftId] = line.nftVersion
    return map
  }, [quote])

  async function attemptSubmit() {
    if (!quote || !selectedWallet) return
    setSubmitError(null)
    setAwaitingRecovery(false)

    const idempotencyKey = getOrCreateIdempotencyKey()

    try {
      const order = await createOrder.mutateAsync({
        walletId: selectedWallet.id,
        network: network ?? selectedWallet.network,
        couponCode: quote.couponCode,
        idempotencyKey,
        quotedVersions,
        quotedTotalEth: quote.totalEth,
      })
      navigate({ to: '/pedido/$orderId', params: { orderId: order.id } })
    } catch (err) {
      if (isRecoverableNetworkError(err)) {
        // Timeout do cliente: o pedido pode ter sido criado no servidor.
        // A mesma idempotencyKey será reusada — nenhuma compra duplicada.
        setAwaitingRecovery(true)
        setSubmitError('Não recebemos confirmação a tempo. O pedido pode já ter sido processado — vamos verificar.')
      } else if (err instanceof KurioApiError && err.code === 'AVAILABILITY_CONFLICT') {
        clearIdempotencyKey()
        setSubmitError('Preço, disponibilidade ou taxas mudaram desde a última cotação. Revise o resumo e confirme novamente.')
        refetchQuote()
      } else if (err instanceof KurioApiError) {
        setSubmitError(err.message)
      } else {
        setSubmitError('Não foi possível confirmar a compra agora.')
      }
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    attemptSubmit()
  }

  // Enquanto aguardamos a recuperação de um pedido que pode já ter sido
  // processado (timeout do cliente), o carrinho pode legitimamente já estar
  // vazio no servidor (o pedido criado o esvaziou) — nesse caso não devemos
  // substituir a tela pelo estado de "carrinho vazio", ou a mensagem de
  // recuperação e o botão "Verificar status do pedido" ficariam inacessíveis.
  const isEmpty = !cartLoading && (!cart || cart.items.length === 0) && !awaitingRecovery
  const disableSubmit =
    createOrder.isPending || !selectedWallet || connection !== 'connected' || quoteLoading || !quote || quote.isStale || !displayName || !username

  if (isEmpty) {
    return (
      <div className="container py-14 text-center">
        <p className="text-body-lg font-bold text-text-primary">Seu carrinho está vazio</p>
        <Button className="mt-4" asChild>
          <Link to="/">Explorar catálogo</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="container py-10">
      <p className="mb-3 text-[15px] font-bold leading-4 text-foreground">
        <Link to="/" className="hover:text-text-accent">
          Início
        </Link>{' '}
        /{' '}
        <Link to="/cart" className="hover:text-text-accent">
          Carrinho
        </Link>{' '}
        / <span className="text-text-accent">Pagamento</span>
      </p>

      <form onSubmit={handleSubmit} className="grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          <section>
            <h2 className="mb-4 text-body-lg font-bold text-text-primary">Perfil do colecionador</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="displayName">Nome de exibição *</Label>
                <Input id="displayName" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="username">Nome de usuário *</Label>
                <Input id="username" required value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="network">Rede *</Label>
                <Select value={network} onValueChange={(v) => setNetwork(v as Network)}>
                  <SelectTrigger id="network" className="mt-1.5">
                    <SelectValue placeholder="Selecione uma rede" />
                  </SelectTrigger>
                  <SelectContent>
                    {NETWORK_OPTIONS.map((n) => (
                      <SelectItem key={n} value={n}>
                        {NETWORK_LABELS[n]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="profileName">Nome do perfil *</Label>
                <Input id="profileName" required value={profileName} onChange={(e) => setProfileName(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="walletAddress">Endereço da carteira *</Label>
                <Input
                  id="walletAddress"
                  readOnly={!useOtherWallet}
                  value={useOtherWallet ? otherAddress : (selectedWallet?.address ?? '')}
                  onChange={(e) => setOtherAddress(e.target.value)}
                  placeholder="Endereço 0x da carteira"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="secondaryEns">ENS ou carteira secundária (opcional)</Label>
                <Input
                  id="secondaryEns"
                  value={secondaryEns}
                  onChange={(e) => setSecondaryEns(e.target.value)}
                  placeholder={selectedWallet?.ensName ?? 'voce.eth'}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="walletType">Tipo de carteira *</Label>
                <Select
                  value={selectedWallet?.provider}
                  onValueChange={(provider) => {
                    const match = wallets?.find((w) => w.provider === provider)
                    if (match) handleSelectWallet(match)
                  }}
                >
                  <SelectTrigger id="walletType" className="mt-1.5">
                    <SelectValue placeholder="Selecione uma carteira" />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets?.map((w) => (
                      <SelectItem key={w.id} value={w.provider}>
                        {PROVIDER_LABELS[w.provider]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="referral">Código de indicação (opcional)</Label>
                <Input id="referral" value={referralCode} onChange={(e) => setReferralCode(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="email">E-mail *</Label>
                <Input id="email" type="email" required value={session?.user.email ?? ''} disabled className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="ensName">Nome ENS (opcional)</Label>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="flex h-11 shrink-0 items-center rounded-md border border-border-soft bg-surface-card px-3 text-body text-text-secondary">
                    .eth
                  </span>
                  <Input id="ensName" value={ensName} onChange={(e) => setEnsName(e.target.value)} />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="flex w-fit cursor-pointer items-center gap-2 text-body text-text-secondary">
                  <input
                    type="checkbox"
                    checked={useOtherWallet}
                    onChange={(e) => setUseOtherWallet(e.target.checked)}
                    className="size-4 accent-primary"
                  />
                  Usar outra carteira?
                </label>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="note">Observação do colecionador (opcional)</Label>
                <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} className="mt-1.5" />
              </div>
            </div>
          </section>

        </div>

        <aside className="h-fit space-y-4 rounded-lg border border-border bg-surface-card p-5">
          <div className="flex items-center justify-between text-[16px] text-foreground">
            <h2 className="font-bold">Seus NFTs</h2>
            <span className="font-medium">Subtotal</span>
          </div>
          <ul className="space-y-3">
            {cart?.items.map((item) => {
              const line = quote?.lines.find((l) => l.nftId === item.nftId)
              return (
                <li key={item.nftId} className="flex items-center gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md">
                    <NftArt seed={item.nft.seed} palette={item.nft.palette} title={item.nft.name} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-bold text-foreground">{item.nft.name}</p>
                    <p className="text-tiny text-secondary">
                      ID do token: #{item.nft.tokenId} (x {item.quantity})
                    </p>
                  </div>
                  <span className="shrink-0 text-[16px] font-bold text-text-accent">{formatEth(line?.subtotalEth ?? '0')}</span>
                </li>
              )
            })}
          </ul>

          <Link to="/cart" className="block text-[12px] text-text-accent hover:underline">
            Tem um código promocional? Aplique aqui
          </Link>

          <OrderTotals quote={quote} isLoading={quoteLoading} />

          <section>
            <h2 className="mb-3 text-body font-bold text-foreground">Carteira e rede</h2>
            {walletsLoading && <Skeleton className="h-24 w-full" />}
            {!walletsLoading && (!wallets || wallets.length === 0) && (
              <p className="rounded-md border border-border-soft bg-surface-card p-4 text-caption text-text-secondary">
                Você ainda não tem carteiras cadastradas.{' '}
                <Link to="/wallets" className="text-primary underline">
                  Cadastrar carteira
                </Link>
              </p>
            )}
            {wallets && wallets.length > 0 && (
              <RadioGroup value={selectedWalletId} onValueChange={(id) => handleSelectWallet(wallets.find((w) => w.id === id)!)}>
                {wallets.map((wallet) => (
                  <Label
                    key={wallet.id}
                    htmlFor={`wallet-${wallet.id}`}
                    className="flex cursor-pointer items-center gap-3 rounded-md border border-border-soft bg-surface-card p-3 has-[[data-state=checked]]:border-primary"
                  >
                    <RadioGroupItem id={`wallet-${wallet.id}`} value={wallet.id} />
                    <span className="flex-1">
                      <span className="block text-body font-medium text-text-primary">
                        {wallet.provider === 'metamask' ? 'MetaMask' : wallet.provider === 'coinbase' ? 'Coinbase Wallet' : 'WalletConnect'}
                        {wallet.role === 'primary' && <span className="ml-2 text-tiny text-primary">Principal</span>}
                      </span>
                      <span className="block text-tiny text-text-secondary">
                        {NETWORK_LABELS[wallet.network]} · {wallet.ensName ?? truncateAddress(wallet.address)}
                      </span>
                    </span>
                  </Label>
                ))}
              </RadioGroup>
            )}

            {selectedWallet && (
              <div className="mt-3 flex items-center gap-3 rounded-md bg-surface-card p-3">
                {connection === 'connected' && (
                  <>
                    <Wifi className="h-4 w-4 text-success" />
                    <span className="flex-1 text-caption text-success">Carteira conectada</span>
                    <Button type="button" size="sm" variant="outline" onClick={simulateDisconnect}>
                      Desconectar
                    </Button>
                  </>
                )}
                {connection === 'idle' && (
                  <>
                    <WifiOff className="h-4 w-4 text-text-secondary" />
                    <span className="flex-1 text-caption text-text-secondary">Carteira não conectada</span>
                    <Button type="button" size="sm" onClick={simulateConnect}>
                      Conectar
                    </Button>
                  </>
                )}
                {connection === 'connecting' && (
                  <span className="flex items-center gap-2 text-caption text-text-secondary">
                    <Loader2 className="h-4 w-4 animate-spin" /> Conectando…
                  </span>
                )}
                {connection === 'declined' && (
                  <>
                    <AlertTriangle className="h-4 w-4 text-danger" />
                    <span className="flex-1 text-caption text-danger">Conexão recusada pela carteira.</span>
                    <Button type="button" size="sm" onClick={simulateConnect}>
                      Tentar novamente
                    </Button>
                  </>
                )}
              </div>
            )}
          </section>

          {quote?.isStale && (
            <p className="flex items-start gap-2 rounded-md bg-warning/10 p-2.5 text-tiny text-warning">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Preço, disponibilidade ou taxas mudaram. Volte ao carrinho ou aguarde a atualização automática.
            </p>
          )}

          {submitError && (
            <p role="alert" className="flex items-start gap-2 rounded-md bg-danger/10 p-2.5 text-tiny text-danger">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {submitError}
            </p>
          )}

          {awaitingRecovery ? (
            <Button type="button" className="w-full" onClick={attemptSubmit} disabled={createOrder.isPending}>
              {createOrder.isPending ? 'Verificando…' : 'Verificar status do pedido'}
            </Button>
          ) : (
            <Button type="submit" className="w-full" disabled={disableSubmit}>
              {createOrder.isPending ? 'Confirmando…' : 'Confirmar compra'}
            </Button>
          )}
        </aside>
      </form>
    </div>
  )
}
