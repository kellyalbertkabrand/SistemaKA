// ============================================================================
// MAPA DE FONTES DA PROSPECÇÃO — todos os lugares onde a KA procura empresas
// médias para projetos de posicionamento (R$ 12–40 mil).
//
// Cada fonte diz: o que é, por que serve, como entra no funil e os LINKS DE
// BUSCA prontos (montados com o segmento + a cidade escolhidos na tela).
//
// Como cada fonte entra (`modo`):
//  - 'robo'   → o Radar diário (SistemaKA) busca sozinho e grava na aba;
//  - 'aba'    → a própria aba busca (Google Maps, CNPJ);
//  - 'link'   → a KA abre o link pronto, olha e cadastra o que valer.
//
// LinkedIn e Instagram ficam como 'link' DE PROPÓSITO: os termos de uso dessas
// redes proíbem robôs de coleta (e a conta da KA pode ser bloqueada). O que
// dá para automatizar com segurança é montar a busca certa — o olhar é dela.
// ============================================================================

export type ModoFonte = 'robo' | 'aba' | 'link'

export interface LinkFonte {
  rotulo: string
  url: string
}

export interface Fonte {
  id: string
  nome: string
  modo: ModoFonte
  /** O que é e como usar, em 1–2 frases. */
  como: string
  /** Por que essa fonte traz cliente com o perfil da KA. */
  porque: string
  links: (seg: string, cid: string) => LinkFonte[]
}

export interface GrupoFontes {
  titulo: string
  fontes: Fonte[]
}

export const ROTULO_MODO: Record<ModoFonte, { rotulo: string; classe: string }> = {
  robo: { rotulo: 'Automático (robô diário)', classe: 'badge--verde' },
  aba: { rotulo: 'Busca aqui na aba', classe: 'badge--azul' },
  link: { rotulo: 'Você abre (link pronto)', classe: 'badge--dourado' },
}

const e = encodeURIComponent
const google = (q: string) => `https://www.google.com/search?q=${e(q)}`
const googleNews = (q: string) => `https://news.google.com/search?q=${e(q)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`
const liPessoas = (q: string) => `https://www.linkedin.com/search/results/people/?keywords=${e(q)}`
const liEmpresas = (q: string) => `https://www.linkedin.com/search/results/companies/?keywords=${e(q)}`
const liPosts = (q: string) =>
  `https://www.linkedin.com/search/results/content/?keywords=${e(q)}&datePosted=%22past-month%22`
const liVagas = (q: string, loc: string) =>
  `https://www.linkedin.com/jobs/search/?keywords=${e(q)}&location=${e(loc || 'Brasil')}&f_TPR=r2592000`
const hashtag = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')

export const GRUPOS_FONTES: GrupoFontes[] = [
  {
    titulo: 'Sinais de momento (quem precisa AGORA)',
    fontes: [
      {
        id: 'noticias',
        nome: 'Google Notícias: gatilhos de virada',
        modo: 'robo',
        como:
          'O robô procura todo dia fusão, sucessão, nova fábrica, aniversário de 30/40/50 anos, franquia e aporte. A Inteligência Artificial identifica a empresa e escreve a mensagem.',
        porque: 'Empresa em virada tem motivo para repensar a marca já. É o lead mais quente que existe.',
        links: (seg, cid) => [
          { rotulo: `"${seg}" inaugura ${cid}`, url: googleNews(`${seg} inaugura ${cid}`) },
          { rotulo: `"${seg}" completa anos ${cid}`, url: googleNews(`${seg} "completa" anos ${cid}`) },
          { rotulo: `${seg} nova unidade`, url: googleNews(`${seg} "nova unidade" ${cid}`) },
        ],
      },
      {
        id: 'imprensa-regional',
        nome: 'Imprensa de negócios do RS',
        modo: 'link',
        como:
          'GZH, Jornal do Comércio, Revista Amanhã e Correio do Povo cobrem as empresas médias gaúchas que a grande imprensa ignora.',
        porque: 'É onde aparecem as empresas do seu tamanho ideal, perto de você.',
        links: (seg) => [
          { rotulo: 'Jornal do Comércio (economia)', url: google(`site:jornaldocomercio.com ${seg} expansão`) },
          { rotulo: 'GZH (economia)', url: google(`site:gauchazh.clicrbs.com.br ${seg} investimento`) },
          { rotulo: 'Revista Amanhã', url: google(`site:amanha.com.br ${seg}`) },
        ],
      },
      {
        id: 'vagas-gupy',
        nome: 'Vagas de marketing (Gupy)',
        modo: 'robo',
        como: 'O robô procura toda madrugada empresas contratando coordenador, gerente ou analista de marketing ou de marca.',
        porque: 'Quem contrata marketing tem verba e vai comunicar mais. É a hora de definir o posicionamento antes.',
        links: (_s, cid) => [
          { rotulo: 'Gupy: coordenador de marketing', url: `https://portal.gupy.io/job-search/term=${e('coordenador de marketing')}` },
          { rotulo: `Gupy: marketing em ${cid}`, url: `https://portal.gupy.io/job-search/term=${e(`marketing ${cid}`)}` },
        ],
      },
      {
        id: 'vagas-linkedin',
        nome: 'Vagas de marketing (LinkedIn e Indeed)',
        modo: 'link',
        como: 'As mesmas vagas, nas plataformas onde as médias anunciam mais. O link já vem filtrado pelos últimos 30 dias.',
        porque: 'Muitas empresas médias não usam a Gupy, só o LinkedIn ou o Indeed.',
        links: (_s, cid) => [
          { rotulo: `LinkedIn Vagas: marketing em ${cid}`, url: liVagas('coordenador de marketing OR analista de marketing', cid) },
          { rotulo: `LinkedIn Vagas: branding`, url: liVagas('branding OR brand manager', cid) },
          { rotulo: `Indeed: marketing em ${cid}`, url: `https://br.indeed.com/empregos?q=${e('analista de marketing')}&l=${e(cid)}&fromage=30` },
        ],
      },
    ],
  },
  {
    titulo: 'LinkedIn',
    fontes: [
      {
        id: 'li-decisores',
        nome: 'Decisores (fundador, sócio, CEO)',
        modo: 'link',
        como:
          'A busca de pessoas já vem com o cargo, o segmento e a cidade. Abra, veja o perfil e cadastre a empresa aqui. Dica: com o Sales Navigator (pago) dá para filtrar por número de funcionários (11–50, 51–200, 201–500).',
        porque: 'Nas médias, quem decide o projeto é o dono. Falar direto com ele encurta o caminho.',
        links: (seg, cid) => [
          { rotulo: `Fundadores · ${seg} · ${cid}`, url: liPessoas(`fundador OR fundadora OR sócio OR sócia ${seg} ${cid}`) },
          { rotulo: `CEO / diretor · ${seg}`, url: liPessoas(`CEO OR diretor ${seg} ${cid}`) },
          { rotulo: `Gerente de marketing · ${seg}`, url: liPessoas(`gerente de marketing OR coordenadora de marketing ${seg} ${cid}`) },
        ],
      },
      {
        id: 'li-empresas',
        nome: 'Páginas de empresa',
        modo: 'link',
        como: 'Lista as empresas do segmento na região. A página mostra a faixa de funcionários: procure entre 11 e 500.',
        porque: 'É a forma mais rápida de medir o porte antes de consultar o CNPJ.',
        links: (seg, cid) => [{ rotulo: `Empresas · ${seg} · ${cid}`, url: liEmpresas(`${seg} ${cid}`) }],
      },
      {
        id: 'li-posts',
        nome: 'Posts de momento (último mês)',
        modo: 'link',
        como: 'Posts em que a própria empresa ou o dono contam que inauguraram, cresceram, assumiram ou mudaram.',
        porque: 'É o gatilho de virada contado pela própria boca. E dá assunto para comentar antes de chamar.',
        links: (seg) => [
          { rotulo: `"inauguramos" · ${seg}`, url: liPosts(`inauguramos ${seg}`) },
          { rotulo: `"nova sede" OR "nova unidade" · ${seg}`, url: liPosts(`"nova unidade" OR "nova sede" ${seg}`) },
          { rotulo: '"assumo" / "nova fase"', url: liPosts(`"nova fase" "empresa familiar" ${seg}`) },
          { rotulo: '"precisamos de uma agência" / "indicação de branding"', url: liPosts('indicação branding OR "agência de branding" OR "reposicionamento de marca"') },
        ],
      },
    ],
  },
  {
    titulo: 'Redes sociais',
    fontes: [
      {
        id: 'instagram',
        nome: 'Instagram',
        modo: 'link',
        como:
          'A hashtag do segmento com a cidade mostra quem está ativo. Procure perfis com bom movimento, mas com a marca confusa ou genérica: é aí que o posicionamento faz diferença.',
        porque: 'Clínicas, lojas, indústrias de moda e de decoração vivem no Instagram. Lá você enxerga o problema da marca antes de falar com o dono.',
        links: (seg, cid) => [
          { rotulo: `#${hashtag(seg)}${hashtag(cid)}`, url: `https://www.instagram.com/explore/tags/${hashtag(seg)}${hashtag(cid)}/` },
          { rotulo: `#${hashtag(seg)}`, url: `https://www.instagram.com/explore/tags/${hashtag(seg)}/` },
          { rotulo: `Perfis de ${seg} em ${cid} (via Google)`, url: google(`site:instagram.com ${seg} ${cid}`) },
        ],
      },
      {
        id: 'facebook',
        nome: 'Facebook e Biblioteca de Anúncios da Meta',
        modo: 'link',
        como:
          'A Biblioteca de Anúncios é pública: mostra quem está PAGANDO anúncio agora no Instagram e no Facebook. Busque pelo segmento.',
        porque: 'Quem investe em mídia tem verba. E anúncio com marca fraca é dinheiro jogado fora: argumento perfeito para posicionamento.',
        links: (seg, cid) => [
          { rotulo: `Anúncios ativos: ${seg}`, url: `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=BR&q=${e(seg)}&search_type=keyword_unordered` },
          { rotulo: `Anúncios: ${seg} ${cid}`, url: `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=BR&q=${e(`${seg} ${cid}`)}&search_type=keyword_unordered` },
        ],
      },
      {
        id: 'tiktok-youtube',
        nome: 'TikTok e YouTube',
        modo: 'link',
        como: 'Vale para marcas de consumo (moda, calçados, alimentos, decoração) que já produzem vídeo.',
        porque: 'Marca que aparece muito e não é lembrada precisa de posicionamento, não de mais post.',
        links: (seg, cid) => [
          { rotulo: `TikTok: ${seg} ${cid}`, url: `https://www.tiktok.com/search?q=${e(`${seg} ${cid}`)}` },
          { rotulo: `YouTube: ${seg} ${cid}`, url: `https://www.youtube.com/results?search_query=${e(`${seg} ${cid}`)}` },
        ],
      },
    ],
  },
  {
    titulo: 'Mapas e cadastros (quem existe e qual o tamanho)',
    fontes: [
      {
        id: 'google-maps',
        nome: 'Google Maps',
        modo: 'aba',
        como: 'Na visão "Buscar empresas": segmento + cidade, filtrando pelo número de avaliações. Precisa da chave do Google no Netlify.',
        porque: 'Melhor fonte para clínicas, redes e indústrias com endereço, como a Sabre Odonto.',
        links: (seg, cid) => [{ rotulo: `Abrir no Maps: ${seg} em ${cid}`, url: `https://www.google.com/maps/search/${e(`${seg} ${cid}`)}` }],
      },
      {
        id: 'receita',
        nome: 'Receita Federal (CNPJ)',
        modo: 'aba',
        como:
          'Botão "Consultar CNPJ" em cada empresa: porte, Simples, capital social, idade e sócios. Para LISTAR empresas por atividade e cidade, use a Casa dos Dados ou o CNPJ.biz (filtre porte "Demais" e capital acima de R$ 100 mil).',
        porque: 'É o que separa quem pode pagar R$ 12–40 mil de quem não pode.',
        links: (seg, cid) => [
          { rotulo: 'Casa dos Dados (busca por atividade e cidade)', url: 'https://casadosdados.com.br/solucao/cnpj/pesquisa-avancada' },
          { rotulo: `Empresas de ${seg} em ${cid}`, url: google(`cnpj ${seg} ${cid} "capital social"`) },
        ],
      },
      {
        id: 'diretorios',
        nome: 'Diretórios do segmento',
        modo: 'link',
        como: 'Doctoralia (saúde e odontologia), Portal do Franchising da ABF (franquias), Guia Mais e Apontador (comércio e serviços).',
        porque: 'Cada segmento tem a sua "lista telefônica" e ela já vem filtrada pelo setor.',
        links: (seg, cid) => [
          { rotulo: `Doctoralia: ${seg} ${cid}`, url: google(`site:doctoralia.com.br clínica ${seg} ${cid}`) },
          { rotulo: 'Portal do Franchising (ABF)', url: 'https://www.portaldofranchising.com.br/' },
          { rotulo: `Guia Mais: ${seg} ${cid}`, url: google(`site:guiamais.com.br ${seg} ${cid}`) },
        ],
      },
    ],
  },
  {
    titulo: 'Rankings e listas prontas',
    fontes: [
      {
        id: 'rankings',
        nome: 'Rankings de crescimento',
        modo: 'link',
        como:
          '"500 Maiores do Sul" e "Top of Mind" (Revista Amanhã), "Marcas de Quem Decide" (Jornal do Comércio), "PMEs que mais crescem" (Exame), "Ranking Líderes do Mercado". Copie as médias e use "Colar uma lista".',
        porque: 'São empresas médias, que estão crescendo e já pensam em marca. O ranking faz a triagem por você.',
        links: (seg) => [
          { rotulo: '500 Maiores do Sul', url: google('"500 maiores do sul" ranking') },
          { rotulo: 'PMEs que mais crescem', url: google('"pequenas e médias empresas que mais crescem" ranking') },
          { rotulo: 'Marcas de Quem Decide (JC)', url: google('"marcas de quem decide" jornal do comércio') },
          { rotulo: `Ranking ${seg}`, url: google(`ranking maiores empresas ${seg} rio grande do sul`) },
        ],
      },
    ],
  },
  {
    titulo: 'Relacionamento (o lead mais quente)',
    fontes: [
      {
        id: 'associacoes',
        nome: 'Associações comerciais e entidades',
        modo: 'link',
        como:
          'ACIGRA (que você já atende com o Conecta), CDLs, ACIs de Novo Hamburgo, Canoas e Caxias, Federasul, Sindicatos e associações do setor (Abicalçados, Sinduscon-RS, CRO-RS). Muitas publicam a lista de associados.',
        porque: 'Quem está numa associação investe no próprio negócio. E você entra com indicação, não como desconhecida.',
        links: (seg, cid) => [
          { rotulo: `Associados ACI ${cid}`, url: google(`associados associação comercial ${cid}`) },
          { rotulo: `Sindicato / associação de ${seg} RS`, url: google(`associação OR sindicato ${seg} rio grande do sul associados`) },
        ],
      },
      {
        id: 'feiras',
        nome: 'Feiras e eventos de negócio',
        modo: 'link',
        como:
          'Fimec (calçados, Novo Hamburgo), Movelsul (móveis, Bento Gonçalves), Construsul, Expointer, Gramado Summit e South Summit (Porto Alegre), feiras da ABF. A lista de expositores é ouro: copie e use "Colar uma lista".',
        porque: 'Expositor paga estande, ou seja, tem verba de marketing e quer aparecer.',
        links: (seg) => [
          { rotulo: `Expositores · feira de ${seg}`, url: google(`expositores feira ${seg} 2026 rio grande do sul`) },
          { rotulo: 'Agenda de feiras RS', url: google('calendário feiras de negócios rio grande do sul 2026') },
        ],
      },
      {
        id: 'indicacoes',
        nome: 'Indicação dos seus clientes',
        modo: 'link',
        como: 'Peça a cada cliente satisfeito (Sabre, Ramarim, ComfortFlex, Amor de Bicho, Shapes) 2 nomes de empresários do mesmo porte. Cadastre como "Indicação".',
        porque: 'Indicação fecha muito mais que lead frio. Na nota, ela vale +15.',
        links: () => [],
      },
      {
        id: 'parceiros',
        nome: 'Parceiros que atendem o mesmo cliente',
        modo: 'link',
        como: 'Contadores, arquitetos, agências de tráfego, desenvolvedores de site e consultores de gestão atendem empresas médias e ouvem "minha marca não me representa".',
        porque: 'Um parceiro bom indica várias vezes por ano. Vale um programa de indicação.',
        links: (_s, cid) => [
          { rotulo: `Agências de tráfego em ${cid}`, url: google(`agência de tráfego pago ${cid}`) },
          { rotulo: `Escritórios de contabilidade em ${cid}`, url: `https://www.google.com/maps/search/${e(`contabilidade ${cid}`)}` },
        ],
      },
    ],
  },
]
