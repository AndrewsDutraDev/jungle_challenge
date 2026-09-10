import { useState } from 'react'
import { Facebook, Instagram, Linkedin, Twitter, Youtube } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const STEPS = [
  { letter: 'W', title: 'Segurança da carteira', copy: 'Proteja sua carteira e colecione arte digital verificada com confiança.' },
  { letter: 'C', title: 'Criadores em destaque', copy: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.' },
  { letter: 'D', title: 'Alertas de lançamentos', copy: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.' },
]

const FOOTER_COLUMNS = [
  { title: 'Meu perfil', links: ['Meu perfil', 'Minha coleção', 'Atividade', 'Estúdio do criador', 'Lista de interesse'] },
  { title: 'Central de ajuda', links: ['Central de ajuda', 'Como comprar NFTs', 'Carteira e segurança', 'Política do mercado', 'Denunciar item'] },
  { title: 'Coleções', links: ['Arte digital', 'Fotografia', 'Música', 'Arte 3D', 'Utilidade'] },
]

export function Footer() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  return (
    <footer className="border-t border-border bg-surface-card">
      <div className="container grid gap-8 py-12 md:grid-cols-4">
        {STEPS.map((step) => (
          <div key={step.letter} className="flex gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-body-lg font-bold text-primary-foreground">
              {step.letter}
            </span>
            <div>
              <h3 className="text-[17px] font-bold text-text-primary">{step.title}</h3>
              <p className="mt-1 text-body text-text-secondary">{step.copy}</p>
            </div>
          </div>
        ))}
        <div>
          <h3 className="text-body-lg font-bold text-text-primary">Antecipe-se ao próximo lançamento</h3>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              setSent(true)
            }}
          >
            <label htmlFor="newsletter-email" className="sr-only">
              Seu e-mail
            </label>
            <Input
              id="newsletter-email"
              type="email"
              required
              placeholder="digite seu e-mail…"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10"
            />
            <Button type="submit" size="sm" className="shrink-0 text-[18px] font-bold">
              Enviar
            </Button>
          </form>
          <p role="status" className="mt-2 text-caption text-success">
            {sent ? 'Inscrição registrada nesta simulação.' : ''}
          </p>
        </div>
      </div>

      <Separator />

      <div className="container flex flex-col gap-6 py-6 text-caption text-text-secondary sm:flex-row sm:items-center sm:justify-between">
        <span className="font-bold text-text-primary">KURIO</span>
        <span>Feito para colecionadores, criadores e cultura.</span>
        <span>contato@email.com</span>
        <span>+55 11 4002 8922</span>
      </div>

      <Separator />

      <div className="container grid gap-8 py-10 sm:grid-cols-2 md:grid-cols-4">
        {FOOTER_COLUMNS.map((col) => (
          <div key={col.title}>
            <h4 className="mb-3 text-body-lg font-bold text-text-primary">{col.title}</h4>
            <ul className="space-y-2">
              {col.links.map((link) => (
                <li key={link}>
                  <span className="cursor-not-allowed text-caption text-text-secondary/70" title="Fora do escopo desta entrega">
                    {link}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h4 className="mb-3 text-body-lg font-bold text-text-primary">Redes sociais</h4>
          <div className="flex gap-2" aria-label="Redes sociais (ilustrativas)">
            {[Facebook, Instagram, Twitter, Linkedin, Youtube].map((Icon, i) => (
              <span
                key={i}
                className="flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-full border border-border-soft text-text-secondary/70"
                title="Fora do escopo desta entrega"
              >
                <Icon className="h-4 w-4" />
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-border py-6 text-center text-tiny text-text-secondary/70">
        © {new Date().getFullYear()} Kurio. Propriedade digital para todos. Projeto de desafio técnico — dados simulados.
      </div>
    </footer>
  )
}

function Separator() {
  return <div className="border-t border-border" />
}
