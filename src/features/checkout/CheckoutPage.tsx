import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { AlertTriangle, ArrowLeft, Loader2, MoreVertical, Wallet as WalletIcon, Wifi, WifiOff } from 'lucide-react'
import { useCartQuery } from '@/lib/api/cart'
import { useQuoteQuery } from '@/lib/api/quote'
import { useSessionQuery } from '@/lib/api/auth'
import { useConnectWalletMutation, useDisconnectWalletMutation, useWalletsQuery } from '@/lib/api/wallets'
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
import { useIsMobile } from '@/lib/use-media-query'
import { cn } from '@/lib/utils'
import { NETWORK_LABELS, NETWORK_OPTIONS, PROVIDER_LABELS } from '@/mocks/fixtures'
import type { Network, Quote, Wallet, WalletProvider } from '@/types/api'

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'declined'

const WALLET_DECLINED_MESSAGE = 'Conexão recusada pela carteira.'

/** Ordem das opções no Figma mobile (node 70398:244). */
const PROVIDER_ORDER: WalletProvider[] = ['walletconnect', 'metamask', 'coinbase']

export function CheckoutPage() {
  const isMobile = useIsMobile()
  const { data: session } = useSessionQuery()
  const { data: cart, isLoading: cartLoading } = useCartQuery()
  const { data: quote, isLoading: quoteLoading, refetch: refetchQuote } = useQuoteQuery(Boolean(cart && cart.items.length > 0))
  const { data: wallets, isLoading: walletsLoading } = useWalletsQuery(true)
  const createOrder = useCreateOrderMutation()
  const connectWallet = useConnectWalletMutation()
  const disconnectWallet = useDisconnectWalletMutation()
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
  const [connectFailure, setConnectFailure] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [awaitingRecovery, setAwaitingRecovery] = useState(false)

  // Cotação que o colecionador viu e aceitou. Se a do servidor mudar depois
  // disso (evento em tempo real ou revalidação recusada), a compra fica
  // bloqueada até ele aceitar os novos valores — ninguém confirma um total
  // que não viu. O `isStale` da API sozinho não serve de trava: ele compara
  // com a consulta anterior e some na seguinte. Ele só decide se a primeira
  // cotação da tela já chega exigindo aceite.
  const [acceptedQuote, setAcceptedQuote] = useState<Quote | undefined>(undefined)
  useEffect(() => {
    if (quote && !acceptedQuote && !quote.isStale) setAcceptedQuote(quote)
  }, [quote, acceptedQuote])
  const quoteChanged = Boolean(quote && (acceptedQuote ? !sameQuote(quote, acceptedQuote) : quote.isStale))
  // Quantidade acima das edições disponíveis não se resolve aceitando: só no carrinho.
  const overAvailable = quote?.lines.some((line) => line.quantity > line.availableEditions) ?? false

  useEffect(() => {
    if (wallets && wallets.length > 0 && !selectedWalletId) {
      const primary = wallets.find((w) => w.role === 'primary') ?? wallets[0]
      setSelectedWalletId(primary.id)
      setNetwork(primary.network)
    }
  }, [wallets, selectedWalletId])

  const selectedWallet = wallets?.find((w) => w.id === selectedWalletId)

  // A conexão vive no servidor simulado (`wallet.connected`); aqui só fica o
  // que é da interação em curso — pedido pendente ou recusa da carteira.
  const connection: ConnectionState =
    connectWallet.isPending || disconnectWallet.isPending
      ? 'connecting'
      : connectFailure
        ? 'declined'
        : selectedWallet?.connected
          ? 'connected'
          : 'idle'

  function handleSelectWallet(wallet: Wallet) {
    setSelectedWalletId(wallet.id)
    setNetwork(wallet.network)
    setConnectFailure(null)
  }

  function handleConnect() {
    if (!selectedWallet) return
    setConnectFailure(null)
    connectWallet.mutate(selectedWallet.id, {
      onSuccess: (result) => {
        if (result.status === 'declined') setConnectFailure(WALLET_DECLINED_MESSAGE)
      },
      onError: (err) => setConnectFailure(err instanceof Error ? err.message : 'Não foi possível falar com a carteira.'),
    })
  }

  function handleDisconnect() {
    if (!selectedWallet) return
    setConnectFailure(null)
    disconnectWallet.mutate(selectedWallet.id)
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
    createOrder.isPending ||
    !selectedWallet ||
    connection !== 'connected' ||
    quoteLoading ||
    !quote ||
    quoteChanged ||
    overAvailable ||
    !displayName ||
    !username
  const noWallets = !walletsLoading && (!wallets || wallets.length === 0)

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

  const connectionControls = selectedWallet && (
    <ConnectionControls
      variant={isMobile ? 'mobile' : 'desktop'}
      state={connection}
      failure={connectFailure}
      busyLabel={disconnectWallet.isPending ? 'Desconectando…' : 'Conectando…'}
      onConnect={handleConnect}
      onDisconnect={handleDisconnect}
    />
  )

  const feedback = (
    <>
      {(quoteChanged || overAvailable) && (
        <div role="status" className="flex flex-col gap-2 rounded-md bg-warning/10 p-2.5 text-tiny text-warning">
          {quoteChanged && (
            <p className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Preço, disponibilidade ou taxas mudaram. Revise o resumo e aceite os novos valores para continuar.
            </p>
          )}
          {overAvailable && (
            <p className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Um item não tem mais edições suficientes. Volte ao carrinho para ajustar a quantidade.
            </p>
          )}
          {quoteChanged && (
            <Button type="button" size="sm" variant="outline" className="self-start" onClick={() => setAcceptedQuote(quote)}>
              Aceitar novos valores
            </Button>
          )}
        </div>
      )}
      {submitError && (
        <p role="alert" className="flex items-start gap-2 rounded-md bg-danger/10 p-2.5 text-tiny text-danger">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {submitError}
        </p>
      )}
    </>
  )

  const noWalletsNotice = noWallets && (
    <p className="rounded-md border border-border-soft bg-surface-card p-4 text-caption text-text-secondary">
      Você ainda não tem carteiras cadastradas.{' '}
      <Link to="/wallets" className="text-primary underline">
        Cadastrar carteira
      </Link>
    </p>
  )

  const cartLines = (
    <ul className="space-y-3">
      {cart?.items.map((item) => {
        const line = quote?.lines.find((l) => l.nftId === item.nftId)
        return (
          <li key={item.nftId} className="flex items-center gap-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md">
              <NftArt src={item.nft.imageUrl} seed={item.nft.seed} palette={item.nft.palette} title={item.nft.name} />
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
  )

  /*
    Mobile (Figma 16:748): tela própria de pagamento com carteira — cartões
    das carteiras cadastradas, opções de carteira e o total, com o botão de
    confirmar no rodapé. O Figma não mostra os dados do colecionador nem a
    lista de itens nesse frame; eles continuam aqui (dados abaixo das opções,
    itens num resumo recolhível) porque o fluxo exige coletar e revisar antes
    de enviar — ver ARCHITECTURE.md § Desvios do Figma.
  */
  if (isMobile) {
    return (
      <form onSubmit={handleSubmit} className="flex min-h-[calc(100svh-68px)] flex-col px-7 pb-8 pt-8">
        <div className="flex flex-col gap-4">
          {/* O frame do Figma tem 414px; abaixo de 400px o espaço entre voltar e
              título encolhe para o título caber numa linha. */}
          <div className="flex h-11 items-center gap-4 min-[400px]:gap-6">
            <button
              type="button"
              onClick={() => window.history.back()}
              aria-label="Voltar"
              className="flex size-[35px] shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ArrowLeft className="size-5" />
            </button>
            <h1 className="whitespace-nowrap text-[20px] font-bold leading-4 text-foreground">Pagamento com carteira</h1>
          </div>

          {connectionControls}

          {walletsLoading && <Skeleton className="h-[93px] w-full rounded-[14px]" />}
          {noWalletsNotice}
          {wallets && wallets.length > 0 && (
            <RadioGroup
              aria-label="Carteira de pagamento"
              value={selectedWalletId}
              onValueChange={(id) => handleSelectWallet(wallets.find((w) => w.id === id)!)}
              className="gap-5"
            >
              {wallets.map((wallet) => {
                const title = wallet.role === 'primary' ? 'Principal' : 'Reserva'
                return (
                  <div
                    key={wallet.id}
                    className={cn(
                      'flex min-h-[93px] items-start gap-5 rounded-[14px] bg-surface-card px-[19px] py-4',
                      wallet.id === selectedWalletId && 'shadow-[0px_20px_20px_0px_rgba(10,6,4,0.45)]',
                    )}
                  >
                    <RadioGroupItem
                      id={`m-wallet-${wallet.id}`}
                      value={wallet.id}
                      className="mt-[22px] size-4 bg-transparent data-[state=checked]:border-text-accent"
                    />
                    <Label htmlFor={`m-wallet-${wallet.id}`} className="min-w-0 flex-1 cursor-pointer">
                      <span className="block text-[16px] font-bold leading-4 text-foreground">{title}</span>
                      <span className="mt-[7px] block truncate text-[14px] font-normal leading-[22px] text-text-secondary">
                        {wallet.ensName ?? truncateAddress(wallet.address)}
                      </span>
                      <span className="block text-[14px] font-normal leading-[22px] text-text-secondary">
                        Rede {NETWORK_LABELS[wallet.network]}
                      </span>
                    </Label>
                    <Link
                      to="/wallets"
                      aria-label={`Gerenciar carteira ${title}`}
                      className="mt-[18px] rounded-sm text-text-secondary hover:text-text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <MoreVertical className="size-4" />
                    </Link>
                  </div>
                )
              })}
            </RadioGroup>
          )}

          <section aria-labelledby="m-wallet-network" className="flex flex-col gap-4">
            <h2 id="m-wallet-network" className="text-[16px] font-bold leading-4 text-foreground">
              Carteira e rede
            </h2>
            <RadioGroup
              aria-label="Tipo de carteira"
              value={selectedWallet?.provider}
              onValueChange={(provider) => {
                const match = wallets?.find((w) => w.provider === provider)
                if (match) handleSelectWallet(match)
              }}
              className="gap-4"
            >
              {PROVIDER_ORDER.map((provider) => {
                const registered = wallets?.some((w) => w.provider === provider) ?? false
                return (
                  <label
                    key={provider}
                    htmlFor={`m-provider-${provider}`}
                    className={cn(
                      'flex h-[65px] items-center gap-3 rounded-[15px] bg-surface-card pl-[14px] pr-[17px] shadow-[0px_0px_20px_0px_rgba(10,6,4,0.45)]',
                      registered ? 'cursor-pointer' : 'opacity-60',
                    )}
                  >
                    <span
                      aria-hidden
                      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-raised text-[14px] font-bold text-text-accent"
                    >
                      {provider === 'coinbase' ? <WalletIcon className="size-4" /> : PROVIDER_LABELS[provider][0]}
                    </span>
                    <span className="flex-1 text-[14px] leading-4 text-foreground">
                      {PROVIDER_LABELS[provider]}
                      {!registered && <span className="mt-1 block text-tiny text-text-secondary">Não cadastrada</span>}
                    </span>
                    <RadioGroupItem
                      id={`m-provider-${provider}`}
                      value={provider}
                      disabled={!registered}
                      className="size-4 bg-transparent data-[state=checked]:border-text-accent"
                    />
                  </label>
                )
              })}
            </RadioGroup>
            <div>
              <Label htmlFor="network" className="text-[14px]">
                Rede *
              </Label>
              <Select value={network} onValueChange={(v) => setNetwork(v as Network)}>
                <SelectTrigger id="network" className="mt-1.5 h-[50px] rounded-[15px] border-0">
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
          </section>

          <section aria-labelledby="m-collector" className="flex flex-col gap-4">
            <h2 id="m-collector" className="text-[16px] font-bold leading-4 text-foreground">
              Perfil do colecionador
            </h2>
            <div>
              <Label htmlFor="displayName" className="text-[14px]">
                Nome de exibição *
              </Label>
              <Input id="displayName" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="username" className="text-[14px]">
                Nome de usuário *
              </Label>
              <Input id="username" required value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1.5" />
            </div>
          </section>

          <details className="group rounded-[15px] bg-surface-card px-4 py-3">
            <summary className="cursor-pointer list-none text-[14px] font-bold text-text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-details-marker]:hidden">
              Revisar itens e taxas ({cart?.items.length ?? 0})
            </summary>
            <div className="mt-4 space-y-4">
              {cartLines}
              <OrderTotals quote={quote} isLoading={quoteLoading} />
            </div>
          </details>

          <div className="flex justify-end">
            <p className="flex items-center gap-7 text-[16px] font-bold leading-4 text-foreground">
              Total:
              <span data-testid="order-total" className="text-[18px] text-text-accent">
                {quote ? formatEth(quote.totalEth) : '—'}
              </span>
            </p>
          </div>

          {feedback}
        </div>

        <div className="mt-auto pt-8">
          {awaitingRecovery ? (
            <Button
              type="button"
              onClick={attemptSubmit}
              disabled={createOrder.isPending}
              className="h-[60px] w-full rounded-[40px] bg-gradient-to-r from-primary to-primary/80 text-[15px] font-bold text-ink"
            >
              {createOrder.isPending ? 'Verificando…' : 'Verificar status do pedido'}
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={disableSubmit}
              className="h-[60px] w-full rounded-[40px] bg-gradient-to-r from-primary to-primary/80 text-[15px] font-bold text-ink"
            >
              {createOrder.isPending ? 'Confirmando…' : 'Confirmar compra'}
            </Button>
          )}
        </div>
      </form>
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
          {cartLines}

          <Link to="/cart" className="block text-[12px] text-text-accent hover:underline">
            Tem um código promocional? Aplique aqui
          </Link>

          <OrderTotals quote={quote} isLoading={quoteLoading} />

          <section>
            <h2 className="mb-3 text-body font-bold text-foreground">Carteira e rede</h2>
            {walletsLoading && <Skeleton className="h-24 w-full" />}
            {noWalletsNotice}
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
                        {PROVIDER_LABELS[wallet.provider]}
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

            {connectionControls}
          </section>

          {feedback}

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

/** Mesmos valores para o colecionador: total e, por item, quantidade, preço e versão. */
function sameQuote(a: Quote, b: Quote): boolean {
  if (a.totalEth !== b.totalEth || a.lines.length !== b.lines.length) return false
  return a.lines.every((line) => {
    const other = b.lines.find((l) => l.nftId === line.nftId)
    return (
      other !== undefined &&
      other.quantity === line.quantity &&
      other.unitPriceEth === line.unitPriceEth &&
      other.nftVersion === line.nftVersion
    )
  })
}

interface ConnectionControlsProps {
  variant: 'desktop' | 'mobile'
  state: ConnectionState
  failure: string | null
  busyLabel: string
  onConnect: () => void
  onDisconnect: () => void
}

/** Estado da conexão com a carteira simulada e a ação correspondente (conectar, desconectar, tentar de novo). */
function ConnectionControls({ variant, state, failure, busyLabel, onConnect, onDisconnect }: ConnectionControlsProps) {
  const statusText =
    state === 'connected' ? 'Carteira conectada' : state === 'idle' ? 'Carteira não conectada' : state === 'declined' ? failure : busyLabel
  const actionLabel = state === 'connected' ? 'Desconectar' : state === 'idle' ? 'Conectar' : 'Tentar novamente'
  const action = state === 'connected' ? onDisconnect : onConnect

  if (variant === 'mobile') {
    return (
      <div className="flex items-center justify-between gap-3" aria-live="polite">
        <p
          className={cn(
            'flex items-center gap-2 text-[16px] font-bold leading-4',
            state === 'declined' ? 'text-danger' : 'text-foreground',
          )}
        >
          {state === 'connecting' && <Loader2 className="size-4 animate-spin" />}
          {statusText}
        </p>
        {state !== 'connecting' && (
          <button
            type="button"
            onClick={action}
            className="shrink-0 rounded-sm text-[14px] font-bold leading-4 text-text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {actionLabel}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="mt-3 flex items-center gap-3 rounded-md bg-surface-card p-3" aria-live="polite">
      {state === 'connecting' ? (
        <span className="flex items-center gap-2 text-caption text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" /> {busyLabel}
        </span>
      ) : (
        <>
          {state === 'connected' && <Wifi className="h-4 w-4 text-success" />}
          {state === 'idle' && <WifiOff className="h-4 w-4 text-text-secondary" />}
          {state === 'declined' && <AlertTriangle className="h-4 w-4 text-danger" />}
          <span
            className={cn(
              'flex-1 text-caption',
              state === 'connected' ? 'text-success' : state === 'declined' ? 'text-danger' : 'text-text-secondary',
            )}
          >
            {statusText}
          </span>
          <Button type="button" size="sm" variant={state === 'connected' ? 'outline' : 'default'} onClick={action}>
            {actionLabel}
          </Button>
        </>
      )}
    </div>
  )
}
