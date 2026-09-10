import { useState } from 'react'
import { AccountLayout } from './AccountLayout'
import { useSessionQuery } from '@/lib/api/auth'
import { useChangePasswordMutation, useUpdateAvatarMutation, useUpdateProfileMutation } from '@/lib/api/profile'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AVATAR_PRESETS, buildAvatarDataUri } from '@/lib/avatar'
import { KurioApiError } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function ProfilePage() {
  const { data: session } = useSessionQuery()
  const updateProfile = useUpdateProfileMutation()
  const updateAvatar = useUpdateAvatarMutation()
  const changePassword = useChangePasswordMutation()

  const [displayName, setDisplayName] = useState(session?.user.displayName ?? '')
  const [username, setUsername] = useState(session?.user.username ?? '')
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({})
  const [profileMessage, setProfileMessage] = useState<string | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({})
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)

  if (!session) return null

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault()
    setProfileErrors({})
    setProfileMessage(null)
    try {
      await updateProfile.mutateAsync({ displayName, username })
      setProfileMessage('Perfil atualizado.')
      toast.success('Perfil atualizado.')
    } catch (err) {
      if (err instanceof KurioApiError) setProfileErrors(err.fields ?? { form: err.message })
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPasswordErrors({})
    setPasswordMessage(null)
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword })
      setPasswordMessage('Senha alterada com sucesso.')
      setCurrentPassword('')
      setNewPassword('')
      toast.success('Senha alterada.')
    } catch (err) {
      if (err instanceof KurioApiError) setPasswordErrors(err.fields ?? { form: err.message })
    }
  }

  return (
    <AccountLayout title="Meu perfil" description="Edite seus dados, avatar e senha de acesso.">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Avatar</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Avatar className="h-16 w-16">
              {session.user.avatarUrl && <AvatarImage src={session.user.avatarUrl} alt="" />}
              <AvatarFallback>{session.user.displayName.slice(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Escolher avatar">
              {AVATAR_PRESETS.map((preset) => {
                const uri = buildAvatarDataUri(preset.seed, preset.palette)
                const active = session.user.avatarUrl === uri
                return (
                  <button
                    key={preset.seed}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={`Avatar ${preset.seed}`}
                    onClick={() => updateAvatar.mutate(uri)}
                    className={cn('h-10 w-10 overflow-hidden rounded-full border-2', active ? 'border-primary' : 'border-transparent')}
                  >
                    <img src={uri} alt="" className="h-full w-full" />
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dados do perfil</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="profile-displayName">Nome de exibição</Label>
                <Input
                  id="profile-displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  aria-invalid={Boolean(profileErrors.displayName)}
                  className="mt-1.5"
                />
                {profileErrors.displayName && <p className="mt-1 text-tiny text-danger">{profileErrors.displayName}</p>}
              </div>
              <div>
                <Label htmlFor="profile-username">Nome de usuário</Label>
                <Input
                  id="profile-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  aria-invalid={Boolean(profileErrors.username)}
                  className="mt-1.5"
                />
                {profileErrors.username && <p className="mt-1 text-tiny text-danger">{profileErrors.username}</p>}
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="profile-email">E-mail</Label>
                <Input id="profile-email" value={session.user.email} disabled className="mt-1.5" />
              </div>
              {profileErrors.form && (
                <p role="alert" className="text-caption text-danger sm:col-span-2">
                  {profileErrors.form}
                </p>
              )}
              {profileMessage && (
                <p role="status" className="text-caption text-success sm:col-span-2">
                  {profileMessage}
                </p>
              )}
              <Button type="submit" className="w-fit" disabled={updateProfile.isPending}>
                {updateProfile.isPending ? 'Salvando…' : 'Salvar alterações'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alterar senha</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="current-password">Senha atual</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  aria-invalid={Boolean(passwordErrors.currentPassword)}
                  className="mt-1.5"
                />
                {passwordErrors.currentPassword && <p className="mt-1 text-tiny text-danger">{passwordErrors.currentPassword}</p>}
              </div>
              <div>
                <Label htmlFor="new-password">Nova senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  aria-invalid={Boolean(passwordErrors.newPassword)}
                  className="mt-1.5"
                />
                {passwordErrors.newPassword && <p className="mt-1 text-tiny text-danger">{passwordErrors.newPassword}</p>}
              </div>
              {passwordErrors.form && (
                <p role="alert" className="text-caption text-danger sm:col-span-2">
                  {passwordErrors.form}
                </p>
              )}
              {passwordMessage && (
                <p role="status" className="text-caption text-success sm:col-span-2">
                  {passwordMessage}
                </p>
              )}
              <Button type="submit" className="w-fit" disabled={changePassword.isPending}>
                {changePassword.isPending ? 'Alterando…' : 'Alterar senha'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AccountLayout>
  )
}
