import { useState } from 'react'
import { AccountLayout } from './AccountLayout'
import { useCreateWalletMutation, useUpdateWalletMutation, useWalletsQuery } from '@/lib/api/wallets'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { NETWORK_LABELS, PROVIDER_LABELS } from '@/mocks/fixtures'
import { truncateAddress } from '@/lib/format'
import { KurioApiError } from '@/lib/api/client'
import type { Network, WalletProvider, WalletRole } from '@/types/api'


export function WalletsPage() {
  const { data: wallets, isLoading } = useWalletsQuery(true)
  const createWallet = useCreateWalletMutation()
  const updateWallet = useUpdateWalletMutation()

  const [role, setRole] = useState<WalletRole>('secondary')
  const [provider, setProvider] = useState<WalletProvider>('metamask')
  const [network, setNetwork] = useState<Network>('ethereum')
  const [address, setAddress] = useState('')
  const [ensName, setEnsName] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    setMessage(null)
    try {
      await createWallet.mutateAsync({ role, provider, network, address, ensName: ensName || undefined })
      setAddress('')
      setEnsName('')
      setMessage('Carteira cadastrada.')
    } catch (err) {
      if (err instanceof KurioApiError) setErrors(err.fields ?? { form: err.message })
    }
  }

  return (
    <AccountLayout
      title="Carteira principal"
      description="Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados."
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Carteiras cadastradas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading && <Skeleton className="h-16 w-full" />}
            {!isLoading && wallets?.length === 0 && <p className="text-caption text-text-secondary">Nenhuma carteira cadastrada ainda.</p>}
            {!isLoading && wallets && wallets.length > 0 && !wallets.some((w) => w.role === 'secondary') && (
              <p className="text-caption text-text-secondary">
                <span className="font-bold text-text-primary">Carteira secundária:</span> você ainda não adicionou uma carteira
                secundária.
              </p>
            )}
            {wallets?.map((wallet) => (
              <div key={wallet.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border-soft p-3">
                <div>
                  <p className="text-body font-medium text-text-primary">
                    {PROVIDER_LABELS[wallet.provider]} {wallet.role === 'primary' && <Badge className="ml-2">Principal</Badge>}
                  </p>
                  <p className="text-tiny text-text-secondary">
                    {NETWORK_LABELS[wallet.network]} · {wallet.ensName ?? truncateAddress(wallet.address)}
                  </p>
                </div>
                {wallet.role !== 'primary' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateWallet.mutate({ id: wallet.id, payload: { role: 'primary' } })}
                    disabled={updateWallet.isPending}
                  >
                    Tornar principal
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Adicionar carteira</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="wallet-role">Tipo</Label>
                <Select value={role} onValueChange={(v) => setRole(v as WalletRole)}>
                  <SelectTrigger id="wallet-role" className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">Principal</SelectItem>
                    <SelectItem value="secondary">Secundária</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="wallet-provider">Carteira</Label>
                <Select value={provider} onValueChange={(v) => setProvider(v as WalletProvider)}>
                  <SelectTrigger id="wallet-provider" className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="metamask">MetaMask</SelectItem>
                    <SelectItem value="walletconnect">WalletConnect</SelectItem>
                    <SelectItem value="coinbase">Coinbase Wallet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="wallet-network">Rede</Label>
                <Select value={network} onValueChange={(v) => setNetwork(v as Network)}>
                  <SelectTrigger id="wallet-network" className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ethereum">Ethereum</SelectItem>
                    <SelectItem value="polygon">Polygon</SelectItem>
                    <SelectItem value="solana">Solana</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="wallet-ens">Nome ENS (opcional)</Label>
                <Input id="wallet-ens" value={ensName} onChange={(e) => setEnsName(e.target.value)} placeholder="voce.eth" className="mt-1.5" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="wallet-address">Endereço da carteira</Label>
                <Input
                  id="wallet-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="0x…"
                  aria-invalid={Boolean(errors.address)}
                  className="mt-1.5"
                />
                {errors.address && <p className="mt-1 text-tiny text-danger">{errors.address}</p>}
              </div>
              {errors.form && (
                <p role="alert" className="text-caption text-danger sm:col-span-2">
                  {errors.form}
                </p>
              )}
              {message && (
                <p role="status" className="text-caption text-success sm:col-span-2">
                  {message}
                </p>
              )}
              <Button type="submit" className="w-fit sm:col-span-2" disabled={createWallet.isPending}>
                {createWallet.isPending ? 'Cadastrando…' : 'Cadastrar carteira'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AccountLayout>
  )
}
