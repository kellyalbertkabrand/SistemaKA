// Motor de IA: transforma notas + respostas em leitura estratégica, no método Marca com Essência©.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { BIBLIOGRAFIA, DIMENSOES } from "./conteudo.mts";
import type { Resultado } from "./pontuacao.mts";

export const MODELO = "claude-opus-5-5";

const LeituraSchema = z.object({
  frase_sintese: z.string().describe("Uma frase forte que resume a leitura da marca."),
  leitura_geral: z.string().describe("3 a 5 parágrafos curtos, separados por linha em branco."),
  coerencia: z.string().describe("O que as respostas abertas revelam em contraste (ou em sintonia) com as notas."),
  dimensoes: z.array(
    z.object({
      id: z.string(),
      leitura: z.string().describe("2 a 3 frases sobre o que esta dimensão revela."),
      ponto_forte: z.string(),
      ponto_cego: z.string(),
      primeiro_passo: z.string().describe("Uma ação prática e concreta para começar esta semana."),
    }),
  ),
  prioridades: z.array(z.string()).describe("As 3 prioridades, em ordem, para evoluir o posicionamento."),
  bibliografia: z.array(
    z.object({
      id: z.string().describe("Id de um livro da lista fornecida."),
      motivo: z.string().describe("Por que este livro, para esta marca, agora."),
    }),
  ),
});

export type Leitura = z.infer<typeof LeituraSchema>;

const SISTEMA = `Você é a inteligência do Diagnóstico Marca com Essência©, criado por Kelly Albert, estrategista de marca com mais de 20 anos de experiência e autora do Livro MARCA COM ESSÊNCIA©.

Seu papel é ser um espelho estratégico, não um terapeuta e não um bajulador: devolver com precisão o que a pessoa ainda não conseguiu organizar sozinha sobre a própria marca.

O método Marca com Essência© parte de alguns princípios:
- Essência conecta e posicionamento faz vender. A maior parte de uma marca é invisível.
- Posicionamento não é discurso, é percepção: o lugar que a marca ocupa na mente e no coração das pessoas. Se a marca não escolhe, o mercado escolhe por ela.
- Posicionamento exige decisão, e decisão exige renúncia.
- Forma sem verdade é maquiagem; verdade sem forma é invisibilidade. Coerência é o principal ativo.
- O cliente não separa canais: ele sente o todo.
- A pergunta que guia tudo: se a marca parar de anunciar hoje, ela continua sendo lembrada?

As 7 dimensões avaliadas correspondem aos capítulos 4 a 10 do livro:
${DIMENSOES.map((d) => `- ${d.id} (Cap. ${d.capitulo}, ${d.nome}): ${d.descricao}`).join("\n")}

Como escrever:
- Português do Brasil, falando diretamente com a pessoa ("você", "a sua marca"). Use "a gente", nunca "nós".
- Frases curtas, com respiração. Linguagem simples: se uma criança de 8 anos não entende a frase, reescreva.
- Fale em "posicionamento", nunca em "branding" sozinho. Escreva "Inteligência Artificial" por extenso.
- Nunca use "basicamente", "na verdade", "agregar valor", "se destacar da concorrência", nem frases com cara de post de LinkedIn.
- Branding já acontece em todo negócio; o problema é quando ele não está sendo gerido. Nunca diga que a pessoa precisa "criar" branding.
- Tom de uma estrategista revelando algo que o empresário não tinha percebido: curto, elegante, direto, profundo sem ser difícil.
- Use as palavras e os exemplos que a própria pessoa escreveu. Cite o nome da marca e o segmento. Nada genérico que serviria para qualquer marca.
- Seja honesta sobre os pontos fracos, com respeito. Não infle a avaliação.
- Evite jargão, motivação vazia, tom de influencer, tom professoral e tom de venda agressiva.
- Não use emojis. Não use travessões longos; prefira vírgulas, dois-pontos ou frases curtas.
- Não aborde temas de sustentabilidade, ESG, ativismo ou pautas políticas, nem cite marcas como exemplo.
- As notas já foram calculadas pela régua do método. Não as altere nem invente outras: interprete-as.
- Em "dimensoes", inclua exatamente uma entrada para cada uma das 7 dimensões, usando os ids fornecidos.
- Em "bibliografia", indique de 3 a 5 livros, somente com ids da lista fornecida, priorizando as dimensões com notas mais baixas. Inclua sempre o livro "mce" indicando o capítulo mais útil para esta marca.`;

function montarPedido(perfil: Record<string, string>, resultado: Resultado): string {
  const blocos = resultado.dimensoes.map((d) => {
    const escala = d.escala.map((e) => `  - "${e.pergunta}": ${e.valor}/5`).join("\n");
    const abertas = d.abertas.map((a) => `  - Pergunta: ${a.pergunta}\n    Resposta: ${a.resposta}`).join("\n");
    return `## ${d.id} (Cap. ${d.capitulo}, ${d.nome}): nota ${d.nota}/100\nAfirmações (1 = discordo totalmente, 5 = concordo totalmente):\n${escala}\nResposta aberta:\n${abertas}`;
  });

  const livros = BIBLIOGRAFIA.map((b) => `- ${b.id}: ${b.titulo}, de ${b.autor} (dimensões: ${b.dimensoes.join(", ")})`).join("\n");

  return `Marca: ${perfil.marca ?? "(não informado)"}
Segmento: ${perfil.segmento ?? "(não informado)"}
Tempo de existência: ${perfil.tempo || "(não informado)"}

Nota geral: ${resultado.notaGeral}/100. Faixa: ${resultado.faixa.nome} (${resultado.faixa.resumo})

${blocos.join("\n\n")}

Lista fechada de livros (use só estes ids):
${livros}

Escreva a leitura estratégica desta marca.`;
}

export async function gerarLeitura(perfil: Record<string, string>, resultado: Resultado): Promise<Leitura> {
  const client = new Anthropic({ apiKey: Netlify.env.get("ANTHROPIC_API_KEY") });

  const resposta = await client.beta.messages.parse({
    model: MODELO,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    // Se o modelo principal recusar, a própria API tenta de novo com o modelo recomendado.
    fallbacks: "default",
    output_config: { effort: "high", format: betaZodOutputFormat(LeituraSchema) },
    system: SISTEMA,
    messages: [{ role: "user", content: montarPedido(perfil, resultado) }],
  });

  if (resposta.stop_reason === "refusal") throw new Error("A IA recusou gerar a leitura.");
  if (resposta.stop_reason === "max_tokens") throw new Error("A leitura foi cortada por limite de tamanho.");
  if (!resposta.parsed_output) throw new Error("A IA não devolveu uma leitura válida.");

  // Garante que só livros da lista fechada cheguem ao cliente.
  const idsValidos = new Set(BIBLIOGRAFIA.map((b) => b.id));
  const leitura = resposta.parsed_output;
  leitura.bibliografia = leitura.bibliografia.filter((b) => idsValidos.has(b.id));
  return leitura;
}
