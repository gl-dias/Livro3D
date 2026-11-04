// Os 7 projetos, na mesma ordem e com os mesmos dados da seção Projetos do site
// (Portif/index.html, blocos #p-*, e o placar logo acima deles). Mudou lá, muda
// aqui. Bot e Midas não mostram stack na home: a deles vem do Lab3D/src/data/graph.js.

export const PROJECTS = [
  {
    id: 'licitavo',
    num: '01',
    name: 'Licitavo',
    kind: 'produto próprio',
    role: 'produto próprio · pré-lançamento',
    status: 'pré-lançamento',
    led: 'wip',
    tagline: 'SaaS que encontra licitações públicas e diz se vale a pena entrar.',
    stack: ['Next.js', 'FastAPI', 'Supabase (Postgres + Auth)', 'Docker', 'VPS', 'Claude API'],
    chips: ['pré-lançamento', 'em parceria', 'go/no-go explicável'],
    links: [{ label: 'visitar o produto', href: 'https://licitavo.com.br' }],
    print: 'licitavo',
    alt: 'Página inicial do Licitavo: logo, slogan “achou, licitou, venceu.” e o contador de editais monitorados via PNCP.',
  },
  {
    id: 'cauri',
    num: '02',
    name: 'Cauri',
    kind: 'projeto pessoal',
    role: 'projeto pessoal · em uso',
    status: 'em uso',
    led: 'live',
    tagline: 'Carteira de investimentos que junta tudo num lugar, compara com o CDI e aceita lançamento por voz.',
    stack: ['Python', 'FastAPI', 'Supabase (Postgres + RLS)', 'React', 'Claude API', 'Whisper', 'Cloudflare Pages', 'VPS'],
    chips: ['em uso', 'código aberto', 'demo com dados reais'],
    links: [
      { label: 'abrir a demo', href: 'https://cauri.com.br/demo' },
      { label: 'ver o código', href: 'https://github.com/gl-dias/Cauri' },
    ],
    print: 'cauri',
    alt: 'Tela inicial da demo do Cauri: patrimônio total, rentabilidade pelo método de cotas, resultado contra o CDI e gráfico da evolução do patrimônio mês a mês.',
  },
  {
    id: 'lfg',
    num: '03',
    name: 'Site LFG Tech',
    kind: 'freela',
    role: 'freela · entregue',
    status: 'no ar',
    led: 'live',
    tagline: 'Site institucional pra consultoria de dados e IA, com demos de produto recriadas no próprio HTML.',
    stack: ['HTML/CSS', 'JS'],
    chips: ['entregue', 'no ar', 'em dupla'],
    links: [{ label: 'visitar site', href: 'https://lfgtech.com.br/' }],
    print: 'lfgtech',
    alt: 'Página inicial da LFG Tech com a chamada “Sua empresa tem dados. Falta virar decisão.” e o botão de agendar diagnóstico.',
  },
  {
    id: 'datechecklist',
    num: '04',
    name: 'Date Checklist',
    kind: 'produto próprio',
    role: 'produto próprio · no ar',
    status: 'cobrando',
    led: 'live',
    tagline: 'SaaS pra casais montarem a lista de dates juntos, com pagamento de verdade.',
    stack: ['React', 'Supabase', 'Postgres (RLS)', 'Cloudflare Pages', 'Mercado Pago'],
    chips: ['no ar', 'cobrando', 'multi-tenant'],
    links: [{ label: 'visitar o produto', href: 'https://datechecklist.com.br' }],
    print: 'datechecklist',
    alt: 'Página inicial do Date Checklist com a chamada “a lista de dates de vocês, num só lugar” e os cards de sala privada e checklist em tempo real.',
  },
  {
    id: 'barbieri',
    num: '05',
    name: 'Site Prof. Luiz Barbieri',
    kind: 'freela',
    role: 'freela · entregue',
    status: 'no ar',
    led: 'live',
    tagline: 'Site profissional pra consultor de cursos, com captura automática de leads.',
    stack: ['HTML/CSS', 'JS', 'Apps Script', 'Sheets como CMS'],
    chips: ['entregue', 'no ar'],
    links: [{ label: 'visitar site', href: 'https://barbiericonsulting.pages.dev/' }],
    print: 'barbieri',
    alt: 'Página inicial da Barbieri Consulting com a chamada “Processos, pessoas e IA aplicada ao seu negócio” e foto do Prof. Luiz Barbieri.',
  },
  {
    id: 'bot',
    num: '06',
    name: 'Bot de trading cripto',
    kind: 'case de método',
    role: 'pausado · case de método',
    status: 'pausado',
    led: 'paused',
    tagline: 'Testei 6 hipóteses de trading rigorosamente, matei todas, parei no tempo certo.',
    stack: ['Python', 'Claude API', 'XGBoost', 'ccxt'],
    chips: [],
    links: [{ label: 'ler o post completo', href: '/posts/bot-cripto' }],
    print: null,
    plate: 'hipoteses',
  },
  {
    id: 'midas',
    num: '07',
    name: 'Midas',
    kind: 'pessoal',
    role: 'pessoal · planejado',
    status: 'planejado',
    led: 'planned',
    tagline: 'Assistente pessoal por voz que conversa e executa tarefas no computador.',
    stack: ['Claude API', 'Whisper', 'ChromaDB', 'MCP'],
    chips: [],
    links: [],
    print: null,
    plate: 'planejado',
  },
]

export const SITE_HOME = '/#experimentos'
export const WHATSAPP =
  'https://wa.me/5521998822396?text=Oi%20Guilherme%2C%20vim%20pelo%20site.%20Meu%20projeto%20%C3%A9...'

// Texto da abertura e do fim, usado no livro e na versão plana.
export const COPY = {
  openingTitle: ['O que tenho', 'em pé hoje.'],
  openingLead: 'Sete projetos, com o mesmo papel, status e stack do site.',
  openingNote: 'Este livro é brincadeira. O conteúdo de verdade continua na home.',
  endTitle: ['Se algum', 'te interessar,', 'me chama.'],
  madeTitle: 'Como foi feito',
  madeBody:
    'Experimento de tempo livre. Cada página é desenhada em canvas e vira textura. A folha que vira é uma malha de 481 vértices, curvada a cada quadro. A luz e as sombras são falsas, baratas de propósito.',
  madeStack: 'React · three.js · react-three-fiber · Vite',
}

export const printUrl = (slug, width = 1440) => `/images/projetos/${slug}-${width}.webp`

// Organização do livro.
// São 10 folhas: capa, 8 folhas de papel e contracapa. f é quantas já viraram.
// Com f viradas, a página da esquerda é a face 2f - 1 e a da direita é a face 2f.
export const SHEETS = 10
export const LAST_F = SHEETS

export const faceLeft = (f) => 2 * f - 1
export const faceRight = (f) => 2 * f

// Primeiro f de cada projeto. Licitavo abre em f = 2.
export const projectF = (i) => i + 2
export const folioOf = (i) => [(i + 1) * 2, (i + 1) * 2 + 1]

export function describeFace(face) {
  if (face === 0) return { type: 'cover' }
  if (face === 1) return { type: 'opening' }
  if (face === 2) return { type: 'toc' }
  if (face === 17) return { type: 'end' }
  if (face === 18) return { type: 'made' }
  if (face === 19) return { type: 'back' }
  const i = Math.floor((face - 3) / 2)
  return { type: (face - 3) % 2 === 0 ? 'projectLeft' : 'projectRight', project: PROJECTS[i], index: i }
}

// O que o rodapé mostra em cada f.
export function describeSpread(f) {
  if (f <= 0) return { label: 'capa', links: [] }
  if (f === 1) return { label: 'sumário', links: [] }
  if (f >= LAST_F) return { label: 'contracapa', links: [] }
  if (f === LAST_F - 1)
    return {
      label: 'fim',
      links: [{ label: 'chamar no WhatsApp', href: WHATSAPP }],
    }
  const p = PROJECTS[f - 2]
  return { label: p.name, sub: `${p.num} de 07`, links: p.links, project: p }
}
