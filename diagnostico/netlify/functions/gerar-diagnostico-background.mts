// Gera o diagnóstico (notas + leitura da IA) e salva para o navegador exibir.
import { FieldValue } from "firebase-admin/firestore";
import { BIBLIOGRAFIA } from "../lib/conteudo.mts";
import { db } from "../lib/firebase.mts";
import { gerarLeitura, MODELO } from "../lib/ia.mts";
import { calcularNotas } from "../lib/pontuacao.mts";

export default async (req: Request) => {
  const chave = Netlify.env.get("CHAVE_INTERNA");
  if (!chave || req.headers.get("x-chave-interna") !== chave) return;

  const { uid } = (await req.json().catch(() => ({}))) as { uid?: string };
  if (!uid) return;

  const resultadoRef = db().collection("resultados").doc(uid);
  try {
    const dados = (await db().collection("respostas").doc(uid).get()).data() ?? {};
    const notas = calcularNotas(dados.respostas ?? {});
    const leitura = await gerarLeitura(dados.perfil ?? {}, notas);
    const livros = leitura.bibliografia.map((b) => {
      const livro = BIBLIOGRAFIA.find((l) => l.id === b.id)!;
      return { titulo: livro.titulo, autor: livro.autor, motivo: b.motivo };
    });

    await resultadoRef.set(
      {
        status: "pronto",
        perfil: dados.perfil ?? {},
        notaGeral: notas.notaGeral,
        faixa: notas.faixa,
        dimensoes: notas.dimensoes.map(({ id, nome, capitulo, nota }) => ({ id, nome, capitulo, nota })),
        leitura,
        livros,
        modelo: MODELO,
        geradoEm: new Date().toISOString(),
      },
      { merge: true },
    );
  } catch (erro) {
    console.error("Falha ao gerar diagnóstico", uid, erro);
    // Falha não conta como tentativa usada.
    await resultadoRef.set({ status: "erro", erro: String(erro), geracoes: FieldValue.increment(-1) }, { merge: true });
  }
};
