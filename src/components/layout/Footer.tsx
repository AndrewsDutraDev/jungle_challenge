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

  /*
    No Figma (node 70491:697) o footer é um bloco alinhado ao conteúdo da
    página, não uma faixa de borda a borda: o fundo da página aparece nas
    laterais. Por isso o container fica por fora e cada faixa pinta o próprio
    fundo dentro dele.
  */
  return (
    <footer className="container pb-10 pt-16">
      {/* Medalhão acima do título e divisórias laranja entre as colunas. As
          quatro colunas do Figma só cabem a partir de 1024px; no tablet ficam
          em duas, sem divisórias, para não estourar a largura. */}
      <div className="grid gap-8 border-t border-primary bg-surface-card p-8 md:grid-cols-2 lg:grid-cols-[repeat(3,1fr)_357px] lg:divide-x lg:divide-primary">
        {STEPS.map((step) => (
          <div key={step.letter} className="flex flex-col gap-3 px-4">
            <span className="flex size-[74px] items-center justify-center rounded-full bg-primary text-heading font-bold text-primary-foreground">
              {step.letter}
            </span>
            <h3 className="text-[17px] font-bold leading-4 text-foreground">{step.title}</h3>
            <p className="max-w-[204px] text-body leading-[22px] text-text-secondary">{step.copy}</p>
          </div>
        ))}
        <div className="flex flex-col gap-3 px-4">
          <h3 className="text-body-lg font-bold leading-4 text-foreground">Antecipe-se ao próximo lançamento</h3>
          <form
            className="flex h-10 items-center overflow-hidden rounded-md bg-surface-dark shadow-card"
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
              className="h-full flex-1 rounded-none border-0 bg-transparent text-body placeholder:text-secondary focus-visible:ring-0"
            />
            <Button type="submit" className="h-full w-[85px] shrink-0 rounded-none text-[18px] font-bold">
              Enviar
            </Button>
          </form>
          <p className="text-caption leading-[22px] text-text-secondary">
            Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
          </p>
          {/* Newsletter está fora do escopo: o envio não pode parecer bem-sucedido. */}
          <p role="status" className="text-caption text-text-secondary">
            {sent ? 'A newsletter não faz parte desta demonstração — nenhum e-mail foi registrado.' : ''}
          </p>
        </div>
      </div>

      <div className="bg-surface-dark">
        <div className="flex flex-col gap-4 p-8 text-body text-foreground sm:flex-row sm:items-center sm:justify-between">
          <span className="flex-1 font-bold tracking-[1.4px]">KURIO</span>
          <span className="flex-1 leading-[22px]">
            Feito para colecionadores,
            <br />
            criadores e cultura
          </span>
          <a href="mailto:contato@email.com" className="flex-1 leading-[22px] hover:text-text-accent">
            contato@email.com
          </a>
          <span className="w-[228px] leading-[22px]">+55 11 4002 8922</span>
        </div>
      </div>

      <div className="grid gap-8 bg-surface-card p-8 sm:grid-cols-2 lg:grid-cols-4">
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
        <div className="space-y-8">
          <div>
            <h4 className="mb-5 text-body-lg font-bold text-text-primary">Redes sociais</h4>
            <div className="flex gap-2.5" aria-label="Redes sociais (ilustrativas)">
              {[Facebook, Instagram, Twitter, Linkedin, Youtube].map((Icon, i) => (
                <span
                  key={i}
                  className="flex h-[30px] w-[30px] cursor-not-allowed items-center justify-center rounded-md bg-primary text-primary-foreground"
                  title="Fora do escopo desta entrega"
                >
                  <Icon className="h-4 w-4" />
                </span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="mb-3 text-body-lg font-bold text-text-primary">Carteiras compatíveis</h4>
            <p className="flex min-h-[26px] flex-wrap items-center justify-center gap-x-2 rounded-md border border-border-soft bg-surface-dark px-2 py-1 text-center text-[9px] font-bold tracking-[0.1px] text-text-accent">
              <span>METAMASK</span>
              <span aria-hidden>•</span>
              <span>WALLETCONNECT</span>
              <span aria-hidden>•</span>
              <span>COINBASE</span>
            </p>
          </div>
        </div>
      </div>

      <p className="pt-6 text-center text-body leading-[30px] text-foreground">
        © {new Date().getFullYear()} Kurio. Propriedade digital para todos. Projeto de desafio técnico — dados simulados.
      </p>
    </footer>
  )
}

