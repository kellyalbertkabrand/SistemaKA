// Modelo do briefing do projeto (baseado no formulário do escritório).
// Cada pergunta: { id, label, tipo, opcoes?, outro? }
//   tipo: 'texto' | 'textarea' | 'radio' | 'check'
//   outro: true  -> adiciona a opção "Outro" com campo livre
export const BRIEFING = {
  titulo: 'Briefing do projeto',
  intro: 'Queremos conhecer um pouco mais sobre você — afinal, vamos projetar o seu novo lar. Responda com calma; quanto mais detalhes, melhor. 🙂',
  secoes: [
    {
      titulo: 'Perfil dos moradores',
      perguntas: [
        { id: 'moradores', label: 'Qual a idade e profissão dos moradores da casa?', tipo: 'textarea' },
        { id: 'hobbies', label: 'Vocês têm algum hobby e animal de estimação? Quais?', tipo: 'textarea' },
        { id: 'espaco_favorito', label: 'Qual o espaço que mais gostam na moradia atual? Por quê?', tipo: 'textarea' },
        { id: 'visitas', label: 'Com qual frequência costumam receber visitas?', tipo: 'radio', opcoes: ['Baixa', 'Média', 'Alta'] },
        { id: 'problemas', label: 'Problemas atuais do espaço que precisam ser resolvidos?', tipo: 'textarea' },
        { id: 'integrativo', label: 'É importante um espaço integrativo com áreas abertas (espaço gourmet, varanda, piscina)?', tipo: 'textarea' },
        { id: 'rotina', label: 'Como é a rotina geral da residência? (home office, estúdio, descanso, confraternização, ou outro)', tipo: 'textarea' },
        { id: 'metragem', label: 'Vocês têm uma ideia estimada de metragem total desta casa?', tipo: 'texto' },
      ],
    },
    {
      titulo: 'Estilo e fachada',
      perguntas: [
        { id: 'estilo', label: 'Qual estilo vocês mais se identificam?', tipo: 'check', outro: true,
          opcoes: ['Clássico', 'Moderno', 'Rústico', 'Americano', 'Contemporâneo', 'Tradicional (atemporal)'] },
        { id: 'fachada', label: 'Gostam de elementos especiais na fachada (plaquetas de tijolo, pedras, madeira…)?', tipo: 'check', outro: true,
          opcoes: ['Tijolo à vista', 'Pedras naturais irregulares', 'Pedras naturais lineares', 'Concreto aparente', 'Cores claras', 'Cores escuras', 'Painéis amadeirados'] },
        { id: 'telhado', label: 'Qual o tipo de telhado mais agrada vocês?', tipo: 'check', outro: true,
          opcoes: ['Escondido (telha metálica/fibrocimento atrás da platibanda)', 'Aparente (telha cerâmica, porcelanato, shingle…)', 'Telha colonial', 'Telha plana', 'Telha tipo americana', 'Telhado misto (parte aparente, parte com platibanda)'] },
        { id: 'aberturas', label: 'As aberturas externas (janelas/portas-janela) serão:', tipo: 'check', outro: true,
          opcoes: ['Pretas', 'Brancas', 'Madeira', 'PVC', 'Alumínio'] },
        { id: 'porta_entrada', label: 'Qual o tipo de porta de entrada dos sonhos?', tipo: 'check', outro: true,
          opcoes: ['Em destaque na fachada', 'Discreta (pode não estar evidente na fachada)', 'Porta grande pivotante', 'Porta com duas folhas', 'Com painel acompanhando até o 2º pavimento', 'PVC', 'Madeira à vista', 'Colorida', 'Colonial com gradis e vidros'] },
      ],
    },
    {
      titulo: 'Ambientes do projeto',
      perguntas: [
        { id: 'ambientes', label: 'Liste todos os ambientes e necessidades específicas de cada um.', tipo: 'textarea' },
        { id: 'hall', label: 'Hall de entrada:', tipo: 'check', outro: true,
          opcoes: ['Espaço mínimo, somente para acesso', 'Espaço amplo para deixar objetos (calçados, casacos, bolsas)'] },
        { id: 'sala_estar', label: 'O que acham importante na sala de estar?', tipo: 'check', outro: true,
          opcoes: ['Conforto e destaque para assistir TV', 'Espaço para leitura', 'Área para receber pessoas', 'Mobiliário para guardar coisas', 'Ambiente clean, só com espaço para TV e equipamentos', 'Lareira tradicional', 'Lareira ecológica'] },
        { id: 'lavabo', label: 'Sobre o lavabo:', tipo: 'check', outro: true,
          opcoes: ['Apenas um lavabo pequeno com WC e pia', 'Banheiro completo (WC + pia + chuveiro)', 'Banheiro nos fundos para atender serviço e área de piscina'] },
        { id: 'garagem', label: 'Sobre a garagem:', tipo: 'check', outro: true,
          opcoes: ['Apenas 1 veículo', '2 veículos, um atrás do outro', '2 veículos lado a lado', 'Espaço no acesso para carros', 'Garagem descoberta'] },
        { id: 'cozinha', label: 'Na cozinha, precisamos de quê?', tipo: 'check', outro: true,
          opcoes: ['Churrasqueira', 'Ilha com espaço para refeições', 'Grande espaço de armazenamento', 'Mesa para refeições na cozinha', 'Integração com o estar', 'Integração com o gourmet', 'Despensa', 'Gostamos de cozinhar (cozinha é um espaço importante)', 'Não somos muito de cozinha (pode ser compacta)', 'A cozinha servirá como espaço gourmet completo (com churrasqueira)', 'Almoçamos em casa diariamente', 'Teremos um espaço gourmet separado da cozinha'] },
        { id: 'suite_master', label: 'Na suíte master, gostaríamos de:', tipo: 'check', outro: true,
          opcoes: ['TV para assistir da cama', 'Closet separado da área de dormir', 'Roupeiro grande junto à área de dormir (sem closet separado)', 'Cama king (1,93 x 2,03m)', 'Cama queen (1,98 x 1,58m)', 'Banheiro com banheira', 'Sacada/varanda/terraço', 'Bancada para home office', 'Piso aquecido'] },
        { id: 'mesa_jantar', label: 'No espaço de jantar, têm preferência pelo formato da mesa?', tipo: 'radio', opcoes: ['Quadrada', 'Redonda', 'Retangular'] },
        { id: 'qtd_dormitorios', label: 'Quantos dormitórios teremos na casa nova?', tipo: 'texto' },
        { id: 'demais_dormitorios', label: 'Quanto aos demais dormitórios:', tipo: 'check', outro: true,
          opcoes: ['Serão todas suítes com banheiro exclusivo', 'Terá um banheiro social para os demais dormitórios', 'Teremos um banheiro americano (compartilhado)', 'Cama queen (1,98 x 1,58m)', 'Cama casal tradicional (1,88 x 1,38m)', 'Espaço para home office individual / bancada de trabalho', 'Closet', 'Apenas espaço para roupeiro dentro do quarto'] },
        { id: 'lavanderia', label: 'Na área de serviço (lavanderia):', tipo: 'check', outro: true,
          opcoes: ['Máquina de lavar + máquina de secar separadas', 'Máquina lava & seca', 'Bastante espaço para armazenamento e depósito', 'Área de bancada livre', 'Saída direto para a rua', 'Acesso interno pela cozinha'] },
        { id: 'demais_comodos', label: 'Quanto aos demais cômodos da casa:', tipo: 'check', outro: true,
          opcoes: ['Home office individualizado', 'Sala íntima', 'Lavanderia grande', 'Depósito', 'Academia', 'Estúdio', 'Cinema'] },
      ],
    },
  ],
};

// Lista achatada de perguntas (para montar/salvar respostas na ordem).
export function perguntasDoBriefing() {
  const arr = [];
  BRIEFING.secoes.forEach((s) => s.perguntas.forEach((p) => arr.push({ ...p, secao: s.titulo })));
  return arr;
}
