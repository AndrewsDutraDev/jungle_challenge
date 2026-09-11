import { NftArt } from '@/components/nft/NftArt'
import { NFT_ARTWORKS } from '@/mocks/fixtures'

const POSTS = [
  {
    image: NFT_ARTWORKS[0],
    seed: 501,
    palette: ['#CFB28C', '#241612'] as [string, string],
    meta: '12 de setembro · Leitura de 6 min',
    title: 'Como funciona a propriedade de NFTs',
    excerpt: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
  },
  {
    image: NFT_ARTWORKS[1],
    seed: 502,
    palette: ['#D28A4C', '#140D0A'] as [string, string],
    meta: '13 de setembro · Leitura de 2 min',
    title: '10 artistas digitais para acompanhar',
    excerpt: 'Conheça criadores que moldam a cultura digital.',
  },
  {
    image: NFT_ARTWORKS[2],
    seed: 503,
    palette: ['#E89B55', '#241612'] as [string, string],
    meta: '15 de setembro · Leitura de 3 min',
    title: 'Raridade, atributos e procedência',
    excerpt: 'Entenda raridade, procedência, direitos autorais e utilidade.',
  },
  {
    image: NFT_ARTWORKS[3],
    seed: 504,
    palette: ['#B39463', '#140D0A'] as [string, string],
    meta: '15 de setembro · Leitura de 2 min',
    title: 'Como proteger sua carteira',
    excerpt: 'Proteja sua carteira, seus ativos e sua identidade.',
  },
]

export function BlogSection() {
  return (
    <section aria-labelledby="blog-heading">
      <div className="text-center">
        <h2 id="blog-heading" className="text-[28px] font-bold text-text-primary">
          Diário da Cunhagem
        </h2>
        <p className="mt-2 text-body text-text-secondary">
          Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
        </p>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {POSTS.map((post) => (
          <article key={post.title} className="flex flex-col overflow-hidden rounded-lg bg-surface-card">
            <div className="aspect-[268/195]">
              <NftArt src={post.image} seed={post.seed} palette={post.palette} title="" />
            </div>
            <div className="flex flex-1 flex-col gap-2 p-4">
              <p className="text-[12px] font-medium text-text-secondary">{post.meta}</p>
              <p className="text-[16px] font-bold text-text-primary">{post.title}</p>
              <p className="text-[12px] font-medium text-text-secondary">{post.excerpt}</p>
              <span
                className="mt-auto cursor-not-allowed pt-2 text-[12px] font-bold text-text-accent"
                title="Fora do escopo desta entrega"
              >
                Ler mais →
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
