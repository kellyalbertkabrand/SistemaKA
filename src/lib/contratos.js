// Modelos de contrato do escritório. Cada modelo tem:
//  - campos: os dados variáveis (preenchidos pela arquiteta; parte vem do cliente)
//  - documento(d): devolve o HTML do contrato já preenchido, pronto para
//    imprimir/baixar. O texto das cláusulas é fiel aos contratos-modelo da Schramm.
import { esc } from './format.js';

// ---- CONTRATADA (Schramm) — dados fixos ----
const REP = 'representada por Luiza Barbosa Schramm, brasileira, casada, CPF 002.634.640-08';
const CONTRATADA_INTRO = `SCHRAMM ENGENHARIA E PROJETOS LTDA, CNPJ 08.940.235/0001-75, sito à Rua Dr. Luiz Bastos do Prado, 2093, sala 504, centro em Gravataí/RS, ${REP}, simplesmente doravante denominado CONTRATADO, convencionam e ajustam o que segue:`;

export const BANCO_INTER = `BANCO INTER - 077
SCHRAMM ENGENHARIA E PROJETOS LTDA
CNPJ: 08.940.235/0001-75
Agência: 0001     Conta: 51862092-1
PIX: 1301e44e-6339-4235-b101-f8625227df9c`;

const BANCO_BB = `Banco do Brasil - Schramm Engenharia e Projetos Ltda
CNPJ 08.940.235/0001-75 (PIX)
Ag.: 0883-4     CC.: 34.852-x`;

// ---- Número por extenso (reais) ----
export function porExtenso(v) {
  v = Number(v || 0);
  const reais = Math.floor(v + 1e-6);
  const cent = Math.round((v - reais) * 100);
  const und = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const dez = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const cem = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
  const ate999 = (n) => {
    if (n === 0) return '';
    if (n === 100) return 'cem';
    let s = ''; const c = Math.floor(n / 100); const r = n % 100;
    if (c) s += cem[c];
    if (r) {
      if (s) s += ' e ';
      if (r < 20) s += und[r];
      else { const d = Math.floor(r / 10); const u = r % 10; s += dez[d]; if (u) s += ' e ' + und[u]; }
    }
    return s;
  };
  const grupos = (n) => {
    if (n === 0) return 'zero';
    const mil = Math.floor(n / 1000); const resto = n % 1000;
    let s = '';
    if (mil) s += (mil === 1 ? 'mil' : ate999(mil) + ' mil');
    if (resto) { if (s) s += (resto < 100 || resto % 100 === 0) ? ' e ' : ' '; s += ate999(resto); }
    return s;
  };
  let out = grupos(reais) + ' ' + (reais === 1 ? 'real' : 'reais');
  if (cent) out += ' e ' + grupos(cent) + ' ' + (cent === 1 ? 'centavo' : 'centavos');
  return out;
}

const reais = (v) => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// "R$ X (por extenso)"
const valExt = (v) => `${reais(v)} (${porExtenso(v)})`;
// texto multi-linha -> parágrafos <br>
const nl = (t) => esc(t || '').replace(/\n/g, '<br>');

// Campos de identificação do CONTRATANTE — comuns aos três modelos e
// preenchidos automaticamente a partir do cliente selecionado.
const CAMPOS_CONTRATANTE = [
  { id: 'nome', rotulo: 'Nome / Razão social do contratante', full: true, auto: ['contrato_nome', 'nome'] },
  { id: 'nacionalidade', rotulo: 'Nacionalidade', valor: 'brasileiro(a)', auto: ['contrato_nacionalidade'] },
  { id: 'estadoCivil', rotulo: 'Estado civil', auto: ['contrato_estadocivil'] },
  { id: 'profissao', rotulo: 'Profissão', auto: ['contrato_profissao'] },
  { id: 'rg', rotulo: 'RG', auto: ['contrato_rg'] },
  { id: 'cpf', rotulo: 'CPF / CNPJ', auto: ['contrato_documento', 'documento'] },
  { id: 'endereco', rotulo: 'Endereço completo', full: true, auto: ['contrato_endereco', 'endereco'] },
];

const CAMPOS_FECHO = [
  { id: 'cidade', rotulo: 'Cidade (assinatura)', valor: 'Gravataí/RS' },
  { id: 'dataExt', rotulo: 'Data (por extenso)', placeholder: 'ex.: 18 de setembro de 2026' },
];

// Introdução das partes (modelos 01 e 02, formato corrido).
function introPartes(d) {
  const c = [d.nacionalidade, d.estadoCivil, d.profissao].filter(Boolean).map(esc).join(', ');
  return `De um lado, <strong>${esc(d.nome)}</strong>${c ? ', ' + c : ''}, CPF ${esc(d.cpf)}, residente na ${esc(d.endereco)}, doravante simplesmente denominado <strong>CONTRATANTE</strong>; e, de outro lado, ${CONTRATADA_INTRO}`;
}

function fecho(d, contratanteRot = 'Contratante') {
  return `
    <p>E por estarem justas e acertadas, na melhor forma de direito, as partes assinam o presente instrumento em 02 (duas) vias originais e de igual teor e forma, na presença das testemunhas, que também o assinam.</p>
    <p>${esc(d.cidade || 'Gravataí/RS')}, ${esc(d.dataExt || '____ de __________ de ______')}.</p>
    <div class="contrato-assinaturas">
      <div><div class="linha-assinatura"></div><p>${esc(d.nome || 'Contratante')}<br><small>${contratanteRot}</small></p></div>
      <div><div class="linha-assinatura"></div><p>Schramm Engenharia e Projetos Ltda<br><small>Contratada</small></p></div>
    </div>`;
}

const h = (t) => `<h3 class="contrato-clausula">${esc(t)}</h3>`;
const p = (t) => `<p>${t}</p>`; // t já pode conter HTML (interpolações escapadas)

// =====================================================================
// MODELO 01 — Projeto e Execução (RT)
// =====================================================================
function docProjetoExecucao(d) {
  return `
  <h2 class="contrato-titulo">CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE PROJETOS E EXECUÇÃO</h2>
  ${p(introPartes(d))}
  ${p('Pelo presente instrumento, contratam entre si o seguinte:')}
  ${h('1 – CLÁUSULA PRIMEIRA: DO OBJETO')}
  ${p('1.1 O presente contrato tem por objeto a prestação de serviços profissionais na área de Projetos e Execução, especificamente a elaboração de projeto arquitetônico residencial, bem como os projetos complementares do mesmo (elétrico, hidrossanitário e estrutural de concreto armado) e a responsabilidade técnica pela execução da obra. Está incluída a aprovação junto à Prefeitura Municipal.')}
  ${p(`1.2 Os Projetos e Execução de que tratam o presente contrato é relativo à arquitetura, elétrico, hidrossanitário e estrutural de concreto armado para uma residência unifamiliar com até ${esc(d.metragem)}m² localizada na ${esc(d.obraEndereco)} e será desenvolvido de acordo com as cláusulas segunda e terceira do presente instrumento contratual, denominadas, respectivamente, "DAS ETAPAS DO PROJETO E DA EXECUÇÃO CONTRATUAL" e "DOS PRAZOS".`)}
  ${h('2 – CLÁUSULA SEGUNDA: DAS ETAPAS DO PROJETO E DA EXECUÇÃO CONTRATUAL E OS ITENS ENTREGUES.')}
  ${p('2.1 O objeto do presente contrato será desenvolvido compreendendo as seguintes fases:')}
  ${p('2.1.1 Levantamento de dados para arquitetura (LV-ARQ);<br>2.1.2 Programa de necessidades de arquitetura (PN-ARQ);<br>2.1.3 Estudo preliminar de arquitetura (EP-ARQ);<br>2.1.4 Anteprojeto de arquitetura (AP-ARQ);<br>2.1.5 Projeto para execução de arquitetura e complementares (elétrico, hidrossanitário e estrutural de concreto armado) (PE-ARQ).<br>2.1.6. Licenças e documentações.<br>2.1.7. Acompanhamento da execução da obra. (RT)')}
  ${p('2.2 Para os projetos contratados, serão entregues os seguintes itens especificados:')}
  ${p('2.2.1 Projeto arquitetônico: planta simplificada, planta baixa, planta de cobertura, cortes e fachada especificadas, planilha de esquadrias e memorial descritivo básico.')}
  ${p('2.2.2 Projeto hidrossanitário: Detalhamento de esgoto, Indicação pontos de água quente e água fria; Plantas isométricas de rede hidráulica dos ambientes; Definição e dimensionamento dos tubos; Posicionamento de caixas externas de esgoto sanitário e pluvial; Projeto de rede pluvial.')}
  ${p('2.2.3 Projeto Elétrico de Baixa Tensão: Posição de pontos elétricos/internet de parede e pontos das caixas na laje, pontos de câmeras externas; Definição e dimensionamento dos condutores; Quadro de cargas; Distribuição das cargas.')}
  ${p('2.2.4 Projeto de Estrutura de Concreto Armado: Carga das Fundações, Planta de Formas das vigas, Planilha de Dimensionamento de Pilares, Detalhamentos das Armadura das Vigas, Tabela de Concreto e Ferros.')}
  ${p('2.3 Sobre o acompanhamento da execução da obra: verificação da implantação do projeto no terreno, visando assegurar que sua execução obedeça fielmente às definições e especificações técnicas nele contidas, através de visitas técnicas no local e também através de esclarecimentos via Whatsapp.')}
  ${h('3 – CLÁUSULA TERCEIRA: DOS PRAZOS')}
  ${p('3.1 Os prazos para conclusão dos trabalhos serão aqueles especificados abaixo e estarão condicionados ao cumprimento pelo contratante de seus próprios prazos de aprovação:')}
  ${p('3.1.1 No prazo de 10 (dez) dias contados da assinatura do presente contrato, o CONTRATANTE deverá entregar ao CONTRATADO toda documentação necessária para o desenvolvimento do Programa de Necessidades e Estudo Preliminar, tais como: sondagens, cópia de matrícula, levantamento planialtimétrico, Briefing e banco de imagens e demais informações pertinentes à elaboração do projeto. Neste prazo, será agendada também a reunião para definição do programa de necessidades e visita no terreno.')}
  ${p('3.1.2 Nos 30 (trinta) dias subsequentes, o CONTRATADO deverá elaborar o Estudo Preliminar e apresentá-lo ao CONTRATANTE para análise; sendo o CONTRATANTE obrigado a dar um retorno sobre as alterações e ajustes necessários;')}
  ${p('3.1.3 Nos 10 (dez) dias após as solicitações das alterações por parte do cliente, o CONTRATADO deverá ajustar o Estudo Preliminar, com aval para continuidade dos trabalhos e com as alterações que entender necessárias. Para cada alteração realizada na etapa de estudo preliminar, fica estipulado esse mesmo prazo para correção dos desenhos. Será feito esse processo até a aprovação do Estudo Preliminar pelo cliente.')}
  ${p('3.1.4 Após aprovado o Estudo Preliminar, o CONTRATADO terá o prazo de 30 (trinta) dias para elaborar o ANTEPROJETO, e entregá-lo, contra recibo, para apreciação e aprovação do CONTRATANTE, que terá o prazo de 05 (cinco) dias para considerações.')}
  ${p('3.1.5 Encaminhadas as considerações, o CONTRATADO terá o prazo de 30 (trinta) dias para entregar ao CONTRATANTE o Projeto Executivo Arquitetônico, mais 30 (trinta) dias subsequentes para entrega dos complementares, revisados e compatibilizados. Nesta etapa também é encaminhada a prancha simplificada para análise e aprovação no condomínio e na Prefeitura Municipal (os prazos das aprovações independem do CONTRATADO, ficando à cargo do mesmo apenas os ajustes que forem solicitados).')}
  ${p('3.1.6 Os prazos para acompanhamento da obra será a partir do início da mesma, com vistorias específicas conforme o andamento da obra.')}
  ${h('4 – CLÁUSULA QUARTA: DOS HONORÁRIOS')}
  ${p(`4.1.1 Pela elaboração dos serviços discriminados do 2.1.1 até 2.1.6 ora contratados, o CONTRATANTE pagará ao CONTRATADO a quantia de ${valExt(d.valorProjeto)} que será quitada da seguinte forma: ${esc(d.formaProjeto)}. Caso seja necessário projeto estrutural de muro de contenção, o valor será de ${valExt(d.valorMuro)} a ser acertados na entrega do projeto.`)}
  ${p(`4.1.2 Para os serviços discriminados no item 2.1.7 ora contratados, o CONTRATANTE pagará ao CONTRATADO a quantia de ${valExt(d.valorGestao)}, que será quitada da seguinte forma: ${esc(d.formaGestao)}.`)}
  ${p(`4.2 Os pagamentos serão feitos mediante TRANSFERÊNCIA BANCÁRIA ou PIX EM CONTA, nos prazos estabelecidos acima, conforme dados abaixo:</p><p class="contrato-banco">${nl(d.dadosBancarios)}`)}
  ${p('4.3 É de responsabilidade exclusiva do CONTRATANTE, o recolhimento de todos os impostos trabalhistas, taxas e contribuições, que incidirem sobre a remuneração dos funcionários da obra estipulado no presente contrato.')}
  ${p('4.4 As despesas efetuadas pelo CONTRATADO, ligadas direta ou indiretamente com o objeto do contrato, ficarão a cargo do CONTRATANTE.')}
  ${p('4.5 As taxas relativas ao Registro de Responsabilidade Técnica (RRT), cujo registro e recolhimento é de responsabilidade do CONTRATADO, deverão ser reembolsadas pelo CONTRATANTE.')}
  ${p('4.6 Todas as despesas pagas pelo CONTRATADO e que não tiverem sido adiantadas pelo CONTRATANTE, deverão ser reembolsadas, mediante apresentação dos comprovantes quitados, ou recibo, devidamente preparado e assinado pelo CONTRATADO.')}
  ${p('4.7 Não está incluído no preço ora ajustado o que segue abaixo, cujos pagamentos e contratações serão de inteira responsabilidade do CONTRATANTE:')}
  ${p('4.7.1. Projeto de Paisagismo, projeto de fundações, projeto de interiores, orçamentos, cronogramas, quantitativos, luminotécnico, Estudo de Impacto de Vizinhança, Licenças Ambientais, PPCI, entrada de energia subterrânea e todo e qualquer outro projeto complementar que se faça necessário (Exceto elétrico, hidrossanitário e estrutural de concreto armado que estão inclusos no contrato);')}
  ${p('4.7.2. Pagamentos de taxas de aprovação ou certidões na Prefeitura, emolumentos, impostos, matrícula no INSS ou demais impostos e taxas referentes à aprovação de projeto, emissão de alvará, Carta de habitação ou outros documentos que se façam necessários;')}
  ${p('4.7.3. Custos de cópias e plotagens feitas em formatos maiores que A4;')}
  ${p(`4.8 Se eventualmente houver acréscimo de metragem nos serviços contratados, em percentual acima de 5% (5 por cento) do que foi previamente acordado, os custos decorrentes serão cobrados em separado, como valor extra. Fica acordado que para cada metro de construção que for aumentado no projeto (extrapolado o limite de 5%) será acrescido o valor de ${reais(d.extraM2)}/m² (${porExtenso(d.extraM2)} por metro quadrado).`)}
  ${p('4.9 Será igualmente cobrada em separado as eventuais modificações feitas pelo CONTRATANTE, se elas forem posteriores à etapa já aprovada.')}
  ${p('4.10 As partes estabelecem que, havendo atraso no pagamento dos honorários, serão cobrados juros de mora na proporção de 1% (um por cento) ao mês, incidindo, a título de correção monetária, o IGPM – Índice Geral de Preços do Mercado – da FGV, ou outro índice que o substituir.')}
  ${h('5 – CLÁUSULA QUINTA: OBRIGAÇÕES DO CONTRATANTE')}
  ${p('5.1 No decorrer do cumprimento do presente contrato, o CONTRATANTE se compromete a:')}
  ${p('5.1.1 Viabilizar a conclusão do projeto dentro dos prazos estipulados, inclusive com a entrega de todos os elementos necessários ao desenvolvimento do projeto;<br>5.1.2 Proceder ao pagamento de todas as taxas necessárias para aprovação do projeto e emissão do alvará;<br>5.1.3 Providenciar ou indicar profissional para elaboração e aprovação de projetos complementares, se necessário.<br>5.1.4 Proceder ao pagamento dos honorários contratados.<br>5.1.5 O CONTRATANTE fica obrigado a executar a obra respeitando integralmente o Projeto Arquitetônico.')}
  ${p('5.1.5.1 Na hipótese de qualquer alteração do Projeto Arquitetônico, quando da sua execução, o CONTRATANTE fica obrigado a obter por escrito o consentimento do CONTRATADO, como manda o art. 16 da Resolução 67/2013 CAU/BR, sob pena das cominações legais relativas aos direitos autorais;')}
  ${p('5.1.6. Fornecer todos os documentos, ferramentas, condições e informações necessárias para o CONTRATADO proceder a elaboração dos projetos contratados.')}
  ${p('5.1.7 O CONTRATANTE não poderá dar início a execução do projeto de autoria do CONTRATADO sem a contratação de profissional responsável técnico junto a Prefeitura para mencionado fim, no caso da responsabilidade técnica ficar à cargo de outro técnico.')}
  ${p('5.1.8. Os projetos desenvolvidos são pessoais e intransferíveis, não sendo possível realizar a venda dos projetos antes da execução para terceiros, em caso de venda do lote acima descrito.')}
  ${h('6 – CLÁUSULA SEXTA: DAS OBRIGAÇÕES DO CONTRATADO')}
  ${p('6.1 É de responsabilidade única do CONTRATADO a execução dos serviços descritos no objeto do contrato e cumprimento dos prazos estabelecidos, bem como a compatibilização do projeto arquitetônico com os projetos complementares e que sejam realizados por profissionais habilitados e entregues por meio digital;')}
  ${p('6.2 A prestação de serviços pelo CONTRATADO ao CONTRATANTE não implica em vínculo trabalhista entre as partes.')}
  ${p('6.3 O CONTRATANTE não responderá solidária nem subsidiariamente pelos encargos trabalhistas, previdenciários e de ordem social, decorrentes da contratação de pessoal por parte do CONTRATADO para dar cumprimento ao presente contrato relativo ao desenvolvimento de projetos.')}
  ${h('7 – CLÁUSULA SÉTIMA: DA RESCISÃO E PENALIDADES DECORRENTES')}
  ${p('7.1 Se o CONTRATANTE rescindir injustificadamente o presente contrato, antes da conclusão integral de todas as fases do projeto, além de não possuir qualquer direito sobre os valores já quitados pelas fases já concluídas, pagará ao CONTRATADO multa de 20% sobre o saldo que remanescer para a conclusão do projeto.')}
  ${p('7.2 Se o CONTRATADO rescindir injustificadamente o presente contrato, sem concluir integralmente todas as fases do presente projeto, perderá todos os direitos autorais sobre as fases já concluídas, sub-rogando tais direitos a qualquer outro profissional que vier a ser contratado pelo CONTRATANTE, além de ter que pagar em favor desse último, multa de 20% sobre o saldo que remanescer para a conclusão do projeto.')}
  ${h('8 – CLÁUSULA OITAVA: CONSIDERAÇÕES FINAIS')}
  ${p('8.1 Alterações de execução da obra vinculada ao projeto, assim como as intervenções acidentais, desde que assumam caráter independente, serão objeto de contrato à parte.')}
  ${p('8.2 Em não sendo contratado como responsável técnico para a execução do projeto, ao CONTRATADO fica assegurado o direito de ser comunicado pelo CONTRATANTE acerca do início da obra.')}
  ${p('8.3 Em nenhuma hipótese o projeto elaborado poderá ser executado/replicado, pelo CONTRATANTE, em terreno diferente do citado na Cláusula 1.2, bem como sua disposição no lote e todas as demais especificações devem ser rigorosamente seguidas.')}
  ${p('8.4 Os documentos técnicos (desenhos e textos) só serão disponibilizados na extensão .pdf, além da impressão para obra em que os custos ficarão por conta do CONTRATANTE.')}
  ${p('8.5 Fica o CONTRATANTE ciente de que as etapas de elaboração de projeto só terão início após a assinatura do presente contrato.')}
  ${p('8.6 A responsabilidade do CONTRATADO não se estende a compra de materiais necessários e nem tampouco os pagamentos dos materiais adquiridos e/ou dos serviços contratados ou ainda os encargos relativos à contratação de profissionais executores de obra ou prestadores de serviço. Não há identidade ou solidariedade entre a responsabilidade dos profissionais contratados para a elaboração dos projetos e para a execução dos serviços da obra, visto que cada um atua em área própria, como profissional ou empresa independente, respondendo cada qual pelo seu trabalho.')}
  ${p('8.7 O presente contrato não transfere ao CONTRATANTE os direitos de uso de imagem atinentes ao projeto e maquetes eletrônicas, ou a propriedade intelectual destes, ainda que parcial, que poderão continuar a ser utilizados pelo CONTRATADO, especialmente para fins publicitários e composição de seu portfólio.')}
  ${p('8.8 O CONTRATADO não se responsabiliza por alterações ocorridas durante a obra que estiverem em desacordo com os serviços por ele executados ou alterações solicitadas pela CONTRATANTE que estiverem em desacordo com a legislação em vigor.')}
  ${p('8.9 O CONTRATANTE autoriza, de forma gratuita e por prazo indeterminado, o(a) CONTRATADO(a) a realizar e utilizar fotografias e vídeos do projeto, da obra e do trabalho finalizado, para fins de divulgação em portfólio, redes sociais, site, apresentações e demais meios de comunicação, físicos ou digitais, nos termos da Lei nº 9.610/98 (Lei de Direitos Autorais) e demais legislações aplicáveis. Esta autorização inclui o uso integral ou parcial das imagens, podendo ser editadas ou adaptadas, desde que mantida a integridade do projeto. Fica vedada a divulgação de imagens que exponham dados pessoais, pessoas ou informações de caráter íntimo sem autorização prévia do CONTRATANTE.')}
  ${h('9 – CLÁUSULA NONA: DO FORO')}
  ${p('9.1 Para qualquer demanda judicial relativa ao presente contrato, as partes elegem o foro da Comarca de Gravataí/RS, com exclusão de qualquer outro, por mais privilegiado que seja.')}
  ${fecho(d)}`;
}

// =====================================================================
// MODELO 02 — Projeto (arquitetura e complementares)
// =====================================================================
function docProjeto(d) {
  return `
  <h2 class="contrato-titulo">CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE PROJETOS DE ARQUITETURA E COMPLEMENTARES</h2>
  ${p(introPartes(d))}
  ${p('Pelo presente instrumento, contratam entre si o seguinte:')}
  ${h('1 – CLÁUSULA PRIMEIRA: DO OBJETO')}
  ${p('1.1 O presente contrato tem por objeto a prestação de serviços profissionais na área de Projetos, especificamente a elaboração de projeto arquitetônico de edificações, bem como os projetos complementares do mesmo (elétrico, hidrossanitário e estrutural de concreto armado). Está incluída a aprovação de projeto junto à Prefeitura Municipal e Condomínio.')}
  ${p(`1.2 Os Projetos de que tratam o presente contrato é relativo à arquitetura, elétrico, hidrossanitário e estrutural de concreto armado para residência unifamiliar com ${esc(d.metragem)}m² localizada na ${esc(d.obraEndereco)} e será desenvolvido de acordo com as cláusulas segunda e terceira do presente instrumento contratual, denominadas, respectivamente, "DAS ETAPAS DO PROJETO" e "DOS PRAZOS".`)}
  ${h('2 – CLÁUSULA SEGUNDA: DAS ETAPAS DO PROJETO E OS ITENS ENTREGUES.')}
  ${p('2.1 O objeto do presente contrato será desenvolvido compreendendo as seguintes fases:')}
  ${p('2.1.1 Levantamento de dados para arquitetura (LV-ARQ);<br>2.1.2 Programa de necessidades de arquitetura (PN-ARQ);<br>2.1.3 Estudo preliminar de arquitetura (EP-ARQ);<br>2.1.4 Anteprojeto de arquitetura (AP-ARQ);<br>2.1.5 Projeto para execução de arquitetura e complementares (elétrico, hidrossanitário e estrutural de concreto armado) (PE-ARQ).<br>2.1.6. Aprovação condominial e municipal.')}
  ${p('2.2 Para os projetos contratados, serão entregues os seguintes itens especificados:')}
  ${p('2.2.1 Projeto arquitetônico: planta simplificada, planta baixa, planta de cobertura, cortes e fachada especificadas, planilha de esquadrias e memorial descritivo básico.')}
  ${p('2.2.2 Projeto hidrossanitário: Detalhamento de esgoto, Indicação pontos de água quente e água fria; Plantas isométricas de rede hidráulica dos ambientes; Definição e dimensionamento dos tubos; Posicionamento de caixas externas de esgoto sanitário e pluvial; Projeto de rede pluvial e caixa de retenção.')}
  ${p('2.2.3 Projeto Elétrico de Baixa Tensão: Posição de pontos elétricos/internet de parede e pontos das caixas na laje; Definição e dimensionamento dos condutores; Quadro de cargas; Distribuição das cargas.')}
  ${p('2.2.4 Projeto de Estrutura de Concreto Armado: Carga das Fundações, Planta de Formas das vigas, Planilha de Dimensionamento de Pilares, Detalhamentos das Armadura das Vigas, Tabela de Concreto e Ferros.')}
  ${h('3 – CLÁUSULA TERCEIRA: DOS PRAZOS')}
  ${p('3.1 Os prazos para conclusão dos trabalhos serão aqueles especificados abaixo e estarão condicionados ao cumprimento pelo contratante de seus próprios prazos de aprovação:')}
  ${p('3.1.1 No prazo de 10 (dez) dias contados da assinatura do presente contrato, o CONTRATANTE deverá entregar ao CONTRATADO toda documentação necessária para o desenvolvimento do Programa de Necessidades e Estudo Preliminar, tais como: sondagens, cópia de escritura, levantamento planialtimétrico, Briefing e banco de imagens e demais informações pertinentes à elaboração do projeto. Neste prazo, será agendada também a reunião para definição do programa de necessidades e visita no terreno.')}
  ${p('3.1.2 Nos 30 (trinta) dias subsequentes, o CONTRATADO deverá elaborar o Estudo Preliminar e apresentá-lo ao CONTRATANTE para análise; sendo o CONTRATANTE obrigado a dar um retorno sobre as alterações e ajustes necessários;')}
  ${p('3.1.3 Nos 15 (quinze) dias após as solicitações das alterações por parte do cliente, o CONTRATADO deverá ajustar o Estudo Preliminar, com aval para continuidade dos trabalhos e com as alterações que entender necessárias. Para cada alteração realizada na etapa de estudo preliminar, fica estipulado esse mesmo prazo para correção dos desenhos. Será feito esse processo até a aprovação do Estudo Preliminar pelo cliente.')}
  ${p('3.1.4 Após aprovado o Estudo Preliminar, o CONTRATADO terá o prazo de 30 (trinta) dias para elaborar o ANTEPROJETO, e entregá-lo, contra recibo, para apreciação e aprovação do CONTRATANTE, que terá o prazo de 05 (cinco) dias para considerações.')}
  ${p('3.1.5 Encaminhadas as considerações, o CONTRATADO terá o prazo de 10 (dez) dias para entregar ao CONTRATANTE o Projeto Executivo Arquitetônico, mais 40 (quarenta) dias subsequentes para entrega dos complementares, revisados e compatibilizados. Nesta etapa também é encaminhada a prancha simplificada para análise e aprovação no condomínio e na Prefeitura Municipal (os prazos das aprovações independem do CONTRATADO, ficando à cargo do mesmo apenas os ajustes que forem solicitados).')}
  ${h('4 – CLÁUSULA QUARTA: DOS HONORÁRIOS')}
  ${p(`4.1.1 Pela elaboração dos serviços discriminados do 2.1.1 até 2.1.6 ora contratados, o CONTRATANTE pagará ao CONTRATADO a quantia de ${valExt(d.valorProjeto)} que será quitada da seguinte forma:</p><p class="contrato-banco">${nl(d.formaProjeto)}`)}
  ${p(`4.2 Os pagamentos serão feitos mediante TRANSFERÊNCIA BANCÁRIA ou PIX EM CONTA, nos prazos estabelecidos acima, conforme dados abaixo:</p><p class="contrato-banco">${nl(d.dadosBancarios)}`)}
  ${p('4.3 É de responsabilidade exclusiva do CONTRATADO, o recolhimento de todos os impostos trabalhistas, taxas e contribuições, que incidirem sobre a remuneração dos funcionários da obra estipulado no presente contrato.')}
  ${p('4.4 As despesas efetuadas pelo CONTRATADO, ligadas direta ou indiretamente com o objeto do contrato, ficarão a cargo do CONTRATANTE.')}
  ${p('4.5 As taxas relativas ao Registro de Responsabilidade Técnica (RRT), cujo registro e recolhimento é de responsabilidade do CONTRATADO, deverão ser reembolsadas pelo CONTRATANTE.')}
  ${p('4.6 Todas as despesas pagas pelo CONTRATADO e que não tiverem sido adiantadas pelo CONTRATANTE, deverão ser reembolsadas, mediante apresentação dos comprovantes quitados, ou recibo, devidamente preparado e assinado pelo CONTRATADO.')}
  ${p('4.7 Não está incluído no preço ora ajustado o que segue abaixo, cujos pagamentos e contratações serão de inteira responsabilidade do CONTRATANTE:')}
  ${p('4.7.1. Projeto de fundações, Paisagismo, projeto de interiores, Responsabilidade técnica da obra e licenciamento para construção, orçamentos, cronogramas, quantitativos, luminotécnico, Estudo de Impacto de Vizinhança, Licenças Ambientais, PPCI, entrada de energia subterrânea e todo e qualquer outro projeto complementar que se faça necessário (Exceto elétrico, hidrossanitário e estrutural de concreto armado que estão inclusos no contrato);')}
  ${p('4.7.2. Pagamentos de taxas de aprovação ou certidões na Prefeitura, emolumentos, impostos, matrícula no INSS ou demais impostos e taxas referentes à aprovação de projeto, emissão de alvará, Carta de habitação ou outros documentos que se façam necessários;')}
  ${p('4.7.3. Custos de cópias e plotagens feitas em formatos maiores que A4 ficarão a cargo do CONTRATANTE.')}
  ${p(`4.8 Se eventualmente houver acréscimo de metragem nos serviços contratados, em percentual acima de 5% (5 por cento) do que foi previamente acordado, os custos decorrentes serão cobrados em separado, como valor extra. Fica acordado que para cada metro de construção que for aumentado no projeto (extrapolado o limite de 5%) será acrescido o valor de ${reais(d.extraM2)}/m² (${porExtenso(d.extraM2)} por metro quadrado).`)}
  ${p('4.9 Será igualmente cobrada em separado as eventuais modificações feitas pelo CONTRATANTE, se elas forem posteriores à etapa já aprovada.')}
  ${p('4.10 As partes estabelecem que, havendo atraso no pagamento dos honorários, serão cobrados juros de mora na proporção de 1% (um por cento) ao mês, incidindo, a título de correção monetária, o IGPM – Índice Geral de Preços do Mercado – da FGV, ou outro índice que o substituir.')}
  ${h('5 – CLÁUSULA QUINTA: OBRIGAÇÕES DO CONTRATANTE')}
  ${p('5.1 No decorrer do cumprimento do presente contrato, o CONTRATANTE se compromete a:')}
  ${p('5.1.1 Viabilizar a conclusão do projeto dentro dos prazos estipulados, inclusive com a entrega de todos os elementos necessários ao desenvolvimento do projeto;<br>5.1.2 Proceder ao pagamento de todas as taxas necessárias para aprovação do projeto e emissão do alvará;<br>5.1.3 Providenciar ou indicar profissional para elaboração e aprovação de projetos complementares, se necessário.<br>5.1.4 Proceder ao pagamento dos honorários contratados.<br>5.1.5 O CONTRATANTE fica obrigado a executar a obra respeitando integralmente o Projeto Arquitetônico.')}
  ${p('5.1.5.1 Na hipótese de qualquer alteração do Projeto Arquitetônico, quando da sua execução, o CONTRATANTE fica obrigado a obter por escrito o consentimento do CONTRATADO, como manda o art. 16 da Resolução 67/2013 CAU/BR, sob pena das cominações legais relativas aos direitos autorais;')}
  ${p('5.1.6. Fornecer todos os documentos, ferramentas, condições e informações necessárias para o CONTRATADO proceder a elaboração dos projetos contratados.')}
  ${p('5.1.7 O CONTRATANTE não poderá dar início a execução do projeto de autoria do CONTRATADO sem a contratação de profissional responsável técnico junto a Prefeitura para mencionado fim, no caso da responsabilidade técnica ficar à cargo de outro técnico.')}
  ${p('5.1.8. Os projetos desenvolvidos são pessoais e intransferíveis, não sendo possível executar a venda dos projetos antes da execução para terceiros, em caso de venda do lote acima descrito.')}
  ${h('6 – CLÁUSULA SEXTA: DAS OBRIGAÇÕES DO CONTRATADO')}
  ${p('6.1 É de responsabilidade única do CONTRATADO a execução dos serviços descritos no objeto do contrato e cumprimento dos prazos estabelecidos, bem como a compatibilização do projeto arquitetônico com os projetos complementares e que sejam realizados por profissionais habilitados e entregues por meio digital;')}
  ${p('6.2 A prestação de serviços pelo CONTRATADO ao CONTRATANTE não implica em vínculo trabalhista entre as partes.')}
  ${p('6.3 O CONTRATANTE não responderá solidária nem subsidiariamente pelos encargos trabalhistas, previdenciários e de ordem social, decorrentes da contratação de pessoal por parte do CONTRATADO para dar cumprimento ao presente contrato.')}
  ${h('7 – CLÁUSULA SÉTIMA: DA RESCISÃO E PENALIDADES DECORRENTES')}
  ${p('7.1 Se o CONTRATANTE rescindir injustificadamente o presente contrato, antes da conclusão integral de todas as fases do projeto, além de não possuir qualquer direito sobre os valores já quitados pelas fases já concluídas, pagará ao CONTRATADO multa de 20% sobre o saldo que remanescer para a conclusão do projeto.')}
  ${p('7.2 Se o CONTRATADO rescindir injustificadamente o presente contrato, sem concluir integralmente todas as fases do presente projeto, perderá todos os direitos autorais sobre as fases já concluídas, sub-rogando tais direitos a qualquer outro profissional que vier a ser contratado pelo CONTRATANTE, além de ter que pagar em favor desse último, multa de 20% sobre o saldo que remanescer para a conclusão do projeto.')}
  ${h('8 – CLÁUSULA OITAVA: CONSIDERAÇÕES FINAIS')}
  ${p('8.1 Alterações de execução da obra vinculada ao projeto, assim como as intervenções acidentais, desde que assumam caráter independente, serão objeto de contrato à parte.')}
  ${p('8.2 Em não sendo contratado como responsável técnico para a execução do projeto, ao CONTRATADO fica assegurado o direito de ser comunicado pelo CONTRATANTE acerca do início da obra.')}
  ${p('8.3 Em nenhuma hipótese o projeto elaborado poderá ser executado/replicado, pelo CONTRATANTE, em terreno diferente do citado na Cláusula 1.2, bem como sua disposição no lote e todas as demais especificações devem ser rigorosamente seguidas.')}
  ${p('8.4 Os documentos técnicos (desenhos e textos) só serão disponibilizados na extensão .pdf, além da impressão para obra em que os custos ficarão por conta do CONTRATANTE.')}
  ${p('8.5 Fica o CONTRATANTE ciente de que as etapas de elaboração de projeto só terão início após a assinatura do presente contrato.')}
  ${p('8.6 A responsabilidade do CONTRATADO não se estende a compra de materiais necessários e nem tampouco os pagamentos dos materiais adquiridos e/ou dos serviços contratados ou ainda os encargos relativos à contratação de profissionais executores de obra ou prestadores de serviço. Não há identidade ou solidariedade entre a responsabilidade dos profissionais contratados para a elaboração dos projetos e para a execução dos serviços da obra, visto que cada um atua em área própria, como profissional ou empresa independente, respondendo cada qual pelo seu trabalho.')}
  ${p('8.7 O presente contrato não transfere ao CONTRATANTE os direitos de uso de imagem atinentes ao projeto e maquetes eletrônicas, ou a propriedade intelectual destes, ainda que parcial, que poderão continuar a ser utilizados pelo CONTRATADO, especialmente para fins publicitários e composição de seu portfólio.')}
  ${p('8.8 O CONTRATADO não se responsabiliza por alterações ocorridas durante a obra que estiverem em desacordo com os serviços por ele executados ou alterações solicitadas pela CONTRATANTE que estiverem em desacordo com a legislação em vigor.')}
  ${h('9 – CLÁUSULA NONA: DO FORO')}
  ${p('9.1 Para qualquer demanda judicial relativa ao presente contrato, as partes elegem o foro da Comarca de Gravataí/RS, com exclusão de qualquer outro, por mais privilegiado que seja.')}
  ${fecho(d)}`;
}

// =====================================================================
// MODELO 03 — Administração de Obra
// =====================================================================
function docAdministracao(d) {
  return `
  <h2 class="contrato-titulo">CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE ADMINISTRAÇÃO DE OBRA</h2>
  ${p('Pelo presente instrumento particular, de um lado:')}
  ${p(`<strong>CONTRATANTE:</strong><br>${esc(d.nome)}, ${esc(d.nacionalidade || 'brasileiro(a)')}, ${esc(d.estadoCivil || '')}, ${esc(d.profissao || '')}, portador(a) da Cédula de Identidade RG nº ${esc(d.rg || '')} e inscrito(a) no CPF/CNPJ sob o nº ${esc(d.cpf)}, residente e domiciliado(a) na ${esc(d.endereco)}, doravante denominado(a) simplesmente CONTRATANTE;`)}
  ${p('<strong>CONTRATADA:</strong><br>SCHRAMM ENGENHARIA E PROJETOS, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 08.940.235/0001-75, com sede na Rua Dr. Luiz Bastos do Prado, 2093, centro, Gravataí/RS, neste ato representada na forma de seu contrato social por Luiza Barbosa Schramm, portador(a) da Cédula de Identidade RG nº 5079432166 e do CPF nº 002.634.640-08, doravante denominada simplesmente CONTRATADA;')}
  ${p('Têm entre si justo e contratado o presente Contrato de Prestação de Serviços de Administração de Obra, que se regerá pelas cláusulas e condições a seguir estabelecidas:')}
  ${h('CLÁUSULA PRIMEIRA – DO OBJETO')}
  ${p(`1.1. O presente contrato tem por objeto a prestação, pela CONTRATADA, de serviços técnicos de administração, gerenciamento e fiscalização da execução da obra de construção nova, de natureza residencial, com área total de ${esc(d.metragem)} m², a ser edificada no imóvel localizado na ${esc(d.obraEndereco)}, conforme projeto técnico Nº ${esc(d.projetoNumero || '________')}, previamente aprovado pelo CONTRATANTE e, quando aplicável, pelos órgãos públicos competentes.`)}
  ${p('1.1.1. Integram este contrato, como se nele estivessem transcritos, o projeto arquitetônico, os projetos complementares (estrutural, hidrossanitário, elétrico, entre outros, se houver) e o memorial descritivo da obra, doravante denominados em conjunto "Projeto".')}
  ${p('1.2. A presente contratação se dá na modalidade de ADMINISTRAÇÃO (também conhecida como "a preço de custo"), pela qual o CONTRATANTE arca diretamente com o custo real dos materiais e da mão de obra empregados na obra, cabendo à CONTRATADA a remuneração prevista na Cláusula Terceira, a título de honorários pela administração, gerenciamento e fiscalização técnica do empreendimento.')}
  ${h('CLÁUSULA SEGUNDA – DO ESCOPO E DAS OBRIGAÇÕES DA CONTRATADA')}
  ${p('2.1. Constituem obrigações da CONTRATADA, no exercício da administração da obra:')}
  ${p('a) Elaborar, revisar e submeter ao CONTRATANTE o cronograma físico-financeiro da obra, com estimativa de prazos e gastos por etapa construtiva;<br>b) Realizar cotações de materiais de construção junto a fornecedores, buscando as melhores condições de preço, qualidade e prazo de entrega, submetendo-as à aprovação do CONTRATANTE;<br>c) Selecionar e indicar ao CONTRATANTE o(s) construtor(es)/prestador(es) responsável(is) pelo fornecimento de mão de obra necessária à execução da obra, acompanhando tecnicamente sua atuação;<br>d) Fiscalizar tecnicamente a execução dos serviços, observando o cumprimento do Projeto, das normas técnicas da ABNT e da legislação aplicável à construção civil;<br>e) Emitir relatórios periódicos de medição, com a descrição dos serviços executados, dos materiais adquiridos e dos valores despendidos no período, acompanhados das respectivas notas fiscais e comprovantes de pagamento;<br>f) Manter o CONTRATANTE informado sobre o andamento da obra, eventuais atrasos, necessidade de serviços adicionais ou modificações no Projeto;<br>g) Providenciar, quando aplicável e mediante instrução específica do CONTRATANTE, a Anotação de Responsabilidade Técnica (ART) ou o Registro de Responsabilidade Técnica (RRT) referente à administração e fiscalização da obra.')}
  ${p('2.2. A CONTRATADA atuará como mandatária e preposta do CONTRATANTE perante fornecedores e prestadores de serviço, não assumindo, todavia, a condição de empreiteira global, razão pela qual todos os pagamentos a fornecedores e mão de obra serão suportados diretamente pelo CONTRATANTE, na forma da Cláusula Quinta.')}
  ${p('2.3. Os encargos e responsabilidades relativos à mão de obra empregada na obra são disciplinados na Cláusula Nona deste contrato.')}
  ${h('CLÁUSULA TERCEIRA – DA REMUNERAÇÃO')}
  ${p(`3.1. Pelos serviços de administração, gerenciamento e fiscalização técnica da obra, o CONTRATANTE pagará à CONTRATADA honorários correspondentes a ${esc(d.percentual || '15')}% incidentes sobre o valor total despendido com materiais e mão de obra empregados na execução da obra, apurado com base nas notas fiscais, recibos e comprovantes de pagamento do período.`)}
  ${p('3.1.1. Não integram a base de cálculo dos honorários de que trata esta cláusula os valores referentes a tributos, taxas e emolumentos incidentes diretamente sobre a obra (tais como ART/RRT, taxas de aprovação de projeto e alvará), salvo disposição em contrário acordada por escrito entre as partes.')}
  ${p('3.2. Os honorários da CONTRATADA serão apurados e pagos com a mesma periodicidade estabelecida para os repasses de que trata a Cláusula Quinta, tomando por base o relatório de medição relativo ao período.')}
  ${p('3.3. O atraso no pagamento dos honorários sujeitará o CONTRATANTE à incidência de multa moratória de 2% (dois por cento) sobre o valor em atraso, acrescida de juros de mora de 1% (um por cento) ao mês e correção monetária pelo índice IGP-M/IPCA, calculados pro rata die.')}
  ${h('CLÁUSULA QUARTA – DO CRONOGRAMA FÍSICO-FINANCEIRO')}
  ${p('4.1. A execução da obra observará o cronograma físico-financeiro constante do Anexo I deste contrato, o qual contempla a estimativa de prazos e de gastos, etapa por etapa construtiva (serviços preliminares, fundação, estrutura, alvenaria, instalações, acabamento, entre outras).')}
  ${p(`4.2. O prazo estimado para a conclusão da obra é de ${esc(d.prazoMeses || '16')} meses, contados da data de assinatura deste contrato e/ou da emissão do alvará de construção, o que ocorrer por último, podendo ser prorrogado em caso de força maior, caso fortuito, condições climáticas adversas, atraso na entrega de materiais por terceiros, ou por necessidade de serviços adicionais ou modificações solicitadas pelo CONTRATANTE, hipóteses que serão devidamente comunicadas e justificadas pela CONTRATADA.`)}
  ${p('4.3. O cronograma físico-financeiro tem caráter estimativo, podendo sofrer ajustes decorrentes de oscilações de preço de materiais e serviços, hipótese que será comunicada previamente ao CONTRATANTE.')}
  ${h('CLÁUSULA QUINTA – DA FORMA DE PAGAMENTO E REPASSE DE VERBAS')}
  ${p('5.1. Os pagamentos referentes a materiais e mão de obra da obra serão realizados em periodicidade SEMANAL, com base em previsão de gastos ("previsão antecipada") elaborada pela CONTRATADA e encaminhada ao CONTRATANTE com antecedência mínima de 2 (dois) dias em relação à data prevista para o desembolso.')}
  ${p('5.1.1. A previsão semanal encaminhada pela CONTRATADA discriminará os valores estimados para aquisição de materiais e para pagamento da mão de obra da semana subsequente, cabendo ao CONTRATANTE disponibilizar os recursos correspondentes até a data indicada.')}
  ${p('5.1.2. Eventuais diferenças entre os valores previstos e os valores efetivamente gastos serão ajustadas na previsão semanal seguinte, mediante compensação ou complementação, conforme o caso, e demonstradas no relatório de medição.')}
  ${p('5.2. Os repasses poderão ser feitos: (i) diretamente pelo CONTRATANTE aos fornecedores e ao construtor/prestador de mão de obra, mediante indicação da CONTRATADA; ou (ii) mediante depósito em conta bancária específica, de titularidade do CONTRATANTE ou conta vinculada à obra, movimentada conjuntamente ou sob prestação de contas da CONTRATADA, conforme definido pelas partes.')}
  ${p('5.2.1. Fica vedada a utilização, pela CONTRATADA, dos recursos repassados para o custeio da obra em finalidade diversa da própria obra, respondendo a CONTRATADA por eventual desvio de finalidade que lhe seja diretamente imputável.')}
  ${p('5.3. Todos os pagamentos a fornecedores e ao construtor/prestador de mão de obra serão comprovados por meio de notas fiscais, recibos, holerites e demais documentos hábeis, os quais ficarão à disposição do CONTRATANTE para conferência a qualquer tempo, assegurado o livre acesso à obra e à documentação financeira relativa a ela.')}
  ${h('CLÁUSULA SEXTA – DAS OBRIGAÇÕES DO CONTRATANTE')}
  ${p('a) Disponibilizar, tempestivamente, os recursos financeiros necessários à execução da obra, conforme as previsões semanais apresentadas pela CONTRATADA, nos termos da Cláusula Quinta;<br>b) Aprovar ou manifestar-se sobre orçamentos, cotações e relatórios de medição apresentados pela CONTRATADA, no prazo de 02 (dois) dias úteis, sob pena de aprovação tácita;<br>c) Fornecer as informações e documentos necessários à regularização da obra perante os órgãos públicos competentes, quando aplicável;<br>d) Efetuar o pagamento dos honorários da CONTRATADA nas datas e condições pactuadas na Cláusula Terceira.')}
  ${h('CLÁUSULA SÉTIMA – DOS SERVIÇOS ADICIONAIS E MODIFICAÇÕES DE PROJETO')}
  ${p('7.1. Eventuais serviços adicionais, acréscimos de escopo ou modificações no Projeto original, solicitados pelo CONTRATANTE após o início da obra, serão objeto de orçamento específico pela CONTRATADA e deverão ser previamente aprovados, por escrito, pelo CONTRATANTE, passando a integrar a base de cálculo dos honorários previstos na Cláusula Terceira.')}
  ${p('7.2. As modificações de que trata esta cláusula poderão implicar alteração do cronograma físico-financeiro e do prazo estimado de conclusão da obra, hipótese que será previamente comunicada ao CONTRATANTE.')}
  ${h('CLÁUSULA OITAVA – DO ESCOPO DA ADMINISTRAÇÃO: ITENS INCLUÍDOS E ITENS EXCLUÍDOS')}
  ${p('8.1. Integram obrigatoriamente o escopo dos serviços administrados por este contrato, sendo de responsabilidade da CONTRATADA sua administração e fiscalização, entre outros, os seguintes itens e etapas construtivas: Mão de obra de empreitada, instalações provisórias e preparação do terreno; corte e aterro; execução de muro de contenção; ferragens e concretagem das fundações (concreto usinado com bomba lança); estrutura (concreto usinado com bomba lança); alvenaria; reboco; contrapisos; colocação de soleiras e pingadeiras; instalações hidrossanitárias, com a ligação aos coletores públicos; tubulações elétricas, caixas elétricas, fiações; estrutura de cobertura; colocação de azulejos e pisos; uma churrasqueira e uma lareira; detalhes e revestimentos nas fachadas; pintura interna e pintura externa; pré-instalação de ar-condicionado; serviços em gesso; serviços de funilaria; materiais de acabamento como esquadrias, portas internas e pisos porcelanatos; acabamento em pedra de lareira/churrasqueira; fiação e materiais elétricos e hidráulicos; e materiais de pintura.')}
  ${p('8.2. Não integram o escopo dos serviços de administração ora contratados, podendo ser objeto de contratação em separado, direta ou indiretamente, pelo CONTRATANTE, os itens relacionados na tabela abaixo, a qual deverá ser preenchida e rubricada pelas partes indicando, para cada item, se está ou não incluído na presente administração e quem será o responsável por sua compra e/ou execução: Acabamentos de tomadas e interruptores (placas e módulos decorativos), Rodapés, Instalação/compra de alarmes, câmeras e sistemas de segurança, Piscina, incluindo instalação, Energia fotovoltaica (sistema solar), Luminárias, Bancadas de pedra (cozinha/banheiros), Móveis (planejados ou soltos), Metais e louças sanitárias, Equipamentos de ar-condicionado, Piso vinílico, incluindo instalação e Jardins (material e mão de obra).')}
  ${p('8.3. Os itens não incluídos no escopo da administração, conforme item acima, não integrarão a base de cálculo dos honorários da CONTRATADA prevista na Cláusula Terceira, salvo se, mediante acordo expresso e por escrito entre as partes, sua compra e/ou execução vier a ser também administrada pela CONTRATADA, hipótese em que passarão a integrar referida base de cálculo.')}
  ${p('8.4. Havendo dúvida ou omissão quanto ao enquadramento de determinado item ou serviço não expressamente listado nas Cláusulas 8.1 e 8.2, as partes deverão defini-lo por escrito, mediante aditivo ou troca de correspondência, previamente à sua execução ou aquisição.')}
  ${h('CLÁUSULA NONA – DOS ENCARGOS TRABALHISTAS, PREVIDENCIÁRIOS, DE SEGURANÇA DO TRABALHO E DA GARANTIA DA MÃO DE OBRA')}
  ${p('9.1. A responsabilidade pelo recolhimento do INSS incidente sobre a obra e sobre os trabalhadores, bem como pelo cumprimento das obrigações trabalhistas e das normas regulamentadoras de segurança e medicina do trabalho aplicáveis à mão de obra empregada na execução da obra, caberá exclusivamente ao construtor/prestador de serviço responsável pelo fornecimento da mão de obra ("Construtor"), e não à CONTRATADA.')}
  ${p('9.2. A garantia legal e contratual relativa aos serviços de mão de obra executados (incluindo vícios de execução, solidez e segurança da obra na parte que lhes corresponda) será de responsabilidade do Construtor que os tiver executado, nos termos da legislação civil aplicável e do contrato eventualmente firmado entre o CONTRATANTE e o Construtor.')}
  ${p('9.3. A CONTRATADA obriga-se a exigir do Construtor, previamente ao início dos serviços, a comprovação de regularidade quanto às obrigações previdenciárias, trabalhistas e de segurança do trabalho, sem prejuízo de que a responsabilidade direta por tais encargos permaneça com o próprio Construtor, conforme disposto nesta cláusula.')}
  ${p('9.4. A responsabilidade técnica da CONTRATADA restringe-se à administração, gerenciamento e fiscalização técnica da obra, conforme escopo definido na Cláusula Segunda, não se estendendo aos encargos e garantias tratados nesta Cláusula Nona.')}
  ${h('CLÁUSULA DÉCIMA – DO DIREITO DE USO DE IMAGEM E DIVULGAÇÃO')}
  ${p('10.1. O CONTRATANTE autoriza, a título gratuito e por prazo indeterminado, a CONTRATADA a captar, utilizar e divulgar fotografias e vídeos da obra objeto deste contrato, tanto durante a sua execução quanto após a sua conclusão, em suas redes sociais, site institucional, materiais de marketing e demais meios de divulgação, para fins de composição de portfólio de trabalhos da CONTRATADA.')}
  ${p('10.1.1. A autorização de que trata esta cláusula não abrange a divulgação de imagens do interior da residência que exponham a rotina, os bens pessoais ou a identidade de moradores, sem o consentimento específico e por escrito do CONTRATANTE para cada divulgação dessa natureza.')}
  ${p('10.1.2. A CONTRATADA compromete-se a não associar as imagens da obra a conteúdo que possa causar constrangimento ao CONTRATANTE, e a atender a eventual solicitação do CONTRATANTE para retirada de determinada imagem de suas redes sociais ou materiais de divulgação.')}
  ${p('10.2. Esta autorização não implica cessão de titularidade do imóvel ou do Projeto, nem transfere ao CONTRATANTE quaisquer direitos autorais sobre o Projeto e demais documentos técnicos elaborados por terceiros.')}
  ${h('CLÁUSULA DÉCIMA PRIMEIRA – DA RESCISÃO')}
  ${p('11.1. O presente contrato poderá ser rescindido, a qualquer tempo, por qualquer das partes, mediante notificação escrita à outra parte com antecedência mínima de 30 (trinta) dias, sem prejuízo do pagamento dos honorários proporcionais aos serviços já executados e das despesas já comprovadamente contraídas até a data da rescisão.')}
  ${p('11.2. O presente contrato poderá ainda ser rescindido de imediato, independentemente de notificação prévia, em caso de descumprimento de obrigação essencial por qualquer das partes, tais como o não repasse de recursos pelo CONTRATANTE nos prazos da Cláusula Quinta, ou o abandono da obra pela CONTRATADA sem justa causa.')}
  ${p('11.3. Em caso de rescisão, a CONTRATADA prestará contas de todos os valores recebidos e despendidos até a data da rescisão, no prazo de 15 dias.')}
  ${h('CLÁUSULA DÉCIMA SEGUNDA – DA VIGÊNCIA')}
  ${p('12.1. O presente contrato vigorará da data de sua assinatura até a conclusão da obra, incluindo a entrega do "habite-se" ou documento equivalente (mediante quitação das referidas taxas pelo CONTRATANTE), quando aplicável, e a quitação integral dos honorários e despesas devidos, ressalvado o disposto na Cláusula Décima Primeira.')}
  ${h('CLÁUSULA DÉCIMA TERCEIRA – DAS DISPOSIÇÕES GERAIS')}
  ${p('13.1. Este contrato obriga as partes e seus eventuais sucessores a qualquer título.<br>13.2. Qualquer alteração a este contrato somente será válida se formalizada por escrito, mediante termo aditivo assinado por ambas as partes.<br>13.3. A tolerância de uma parte quanto ao eventual descumprimento de qualquer obrigação pela outra não implicará novação ou renúncia a direitos, podendo a obrigação ser exigida a qualquer tempo.')}
  ${h('CLÁUSULA DÉCIMA QUARTA – DO FORO')}
  ${p('14.1. Fica eleito o foro da Comarca de Gravataí/RS para dirimir quaisquer dúvidas ou controvérsias oriundas do presente contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.')}
  ${p('E, por estarem assim justas e contratadas, as partes firmam o presente instrumento em 2 (duas) vias de igual teor e forma, na presença de duas testemunhas.')}
  ${p(`${esc(d.cidade || 'Gravataí/RS')}, ${esc(d.dataExt || '____ de __________ de ______')}.`)}
  <div class="contrato-assinaturas">
    <div><div class="linha-assinatura"></div><p>${esc(d.nome || '[NOME DO CONTRATANTE]')}<br><small>CONTRATANTE</small></p></div>
    <div><div class="linha-assinatura"></div><p>SCHRAMM ENGENHARIA E PROJETOS<br><small>CONTRATADA</small></p></div>
  </div>
  <div class="contrato-testemunhas">
    <p>Testemunhas:</p>
    <p>1) ____________________________________________<br>Nome:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;CPF:</p>
    <p>2) ____________________________________________<br>Nome:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;CPF:</p>
  </div>`;
}

export const MODELOS = [
  {
    id: 'projeto-execucao',
    nome: 'Projeto e Execução',
    resumo: 'Projeto arquitetônico + complementares + responsabilidade técnica da execução (RT).',
    documento: docProjetoExecucao,
    campos: [
      ...CAMPOS_CONTRATANTE,
      { id: 'obraEndereco', rotulo: 'Endereço da obra', full: true, placeholder: 'Rua ..., lotes ..., bairro, cidade/UF' },
      { id: 'metragem', rotulo: 'Metragem (m²)', placeholder: 'ex.: 300,00' },
      { id: 'valorProjeto', rotulo: 'Honorário do projeto (R$)', tipo: 'number' },
      { id: 'formaProjeto', rotulo: 'Forma de pagamento do projeto', full: true, valor: '100% pago à vista na assinatura do contrato' },
      { id: 'valorMuro', rotulo: 'Muro de contenção — valor (R$)', tipo: 'number', valor: 1200 },
      { id: 'valorGestao', rotulo: 'Honorário do acompanhamento/RT (R$)', tipo: 'number' },
      { id: 'formaGestao', rotulo: 'Forma de pagamento do acompanhamento', full: true, valor: 'Em 06 parcelas iguais mensais, a partir do início da obra' },
      { id: 'extraM2', rotulo: 'Valor por m² excedente (R$)', tipo: 'number', valor: 130 },
      { id: 'dadosBancarios', rotulo: 'Dados bancários', tipo: 'textarea', full: true, valor: BANCO_INTER },
      ...CAMPOS_FECHO,
    ],
  },
  {
    id: 'projeto',
    nome: 'Projeto',
    resumo: 'Projeto arquitetônico e complementares (sem execução/RT).',
    documento: docProjeto,
    campos: [
      ...CAMPOS_CONTRATANTE,
      { id: 'obraEndereco', rotulo: 'Endereço da obra', full: true, placeholder: 'Alameda ..., lote ..., condomínio, cidade/UF' },
      { id: 'metragem', rotulo: 'Metragem (m²)', placeholder: 'ex.: 240,00' },
      { id: 'valorProjeto', rotulo: 'Honorário do projeto (R$)', tipo: 'number' },
      { id: 'formaProjeto', rotulo: 'Forma de pagamento (parcelas)', tipo: 'textarea', full: true, valor: '20% na assinatura do contrato\n30% 30 dias após assinatura do contrato\n30% 60 dias após assinatura do contrato\n20% 90 dias após assinatura do contrato' },
      { id: 'extraM2', rotulo: 'Valor por m² excedente (R$)', tipo: 'number', valor: 70 },
      { id: 'dadosBancarios', rotulo: 'Dados bancários', tipo: 'textarea', full: true, valor: BANCO_BB },
      ...CAMPOS_FECHO,
    ],
  },
  {
    id: 'administracao',
    nome: 'Administração de Obra',
    resumo: 'Administração, gerenciamento e fiscalização da obra a preço de custo (honorário %).',
    documento: docAdministracao,
    campos: [
      ...CAMPOS_CONTRATANTE,
      { id: 'obraEndereco', rotulo: 'Endereço da obra', full: true },
      { id: 'metragem', rotulo: 'Área total (m²)', placeholder: 'ex.: 343,31' },
      { id: 'projetoNumero', rotulo: 'Nº do projeto técnico', placeholder: 'opcional' },
      { id: 'percentual', rotulo: 'Honorário (%)', tipo: 'number', valor: 15 },
      { id: 'prazoMeses', rotulo: 'Prazo estimado da obra (meses)', tipo: 'number', valor: 16 },
      ...CAMPOS_FECHO,
    ],
  },
];

export function modeloPorId(id) {
  return MODELOS.find((m) => m.id === id) || MODELOS[0];
}
