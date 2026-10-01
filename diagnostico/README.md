# Diagnóstico Marca com Essência© · Fase 1 (site)

Ferramenta de autodiagnóstico de marca com Inteligência Artificial, baseada no Livro MARCA COM ESSÊNCIA©.

## Como funciona

```
Página de vendas (/) ──► Checkout Hotmart ──► Hotmart avisa o site (/api/hotmart)
                                                   │  libera o e-mail por 90 dias
                                                   ▼
Cliente entra em /entrar (Google ou link no e-mail, sem senha)
        │
        ▼
/diagnostico: perfil da marca + 35 perguntas (salvas a cada resposta)
        │
        ▼
/api/gerar ──► régua de notas (fixa) + leitura da IA (Claude) ──► resultado na tela + PDF
```

- **35 perguntas** = 7 dimensões (capítulos 4 a 10 do livro) × 5 perguntas.
  Em cada dimensão: 4 afirmações de 1 a 5 (formam a nota) + 1 pergunta aberta (lida pela IA).
- **A nota não vem da IA.** Ela é calculada pela régua do método (`netlify/lib/pontuacao.mts`).
  A IA interpreta as notas e as respostas e escreve a leitura.
- **Bibliografia:** a IA só indica livros da lista fechada em `netlify/lib/conteudo.mts`.
- Cada acesso permite **2 gerações** de diagnóstico (uma falha não conta).

## Onde editar o conteúdo

| O quê | Arquivo |
|---|---|
| Perguntas, faixas de leitura, livros | `netlify/lib/conteudo.mts` |
| Instruções da IA (tom, método) | `netlify/lib/ia.mts` |
| Textos da página de vendas | `public/index.html` |
| Link do checkout e de contato | `public/js/config.js` |
| Cores e fontes | `public/css/estilo.css` |

## Configuração (uma vez só)

### 1. Firebase (login e banco de dados)
1. Em [console.firebase.google.com](https://console.firebase.google.com), crie um projeto (ex.: `marca-com-essencia`).
2. **Authentication → Método de login:** ative **Google** e **E-mail/senha** com a opção **Link do e-mail (login sem senha)**.
3. **Authentication → Configurações → Domínios autorizados:** adicione o domínio do site (ex.: `diagnostico.kellyalbert.com.br` e o endereço `.netlify.app`).
4. **Firestore Database:** crie o banco (modo produção, região `southamerica-east1`) e cole as regras do arquivo `firestore.rules` em **Regras**.
5. **Configurações do projeto → Seus apps → Web:** registre um app e copie o `firebaseConfig` para `public/js/config.js`.
6. **Configurações do projeto → Contas de serviço → Gerar nova chave privada.** Baixe o JSON e converta para base64:
   `base64 -w0 chave.json` (Linux) ou `base64 -i chave.json` (Mac). O resultado vai na variável `FIREBASE_SERVICE_ACCOUNT`.

### 2. Netlify (hospedagem)
1. **Add new site → Import from Git →** este repositório.
2. **Base directory:** `diagnostico`. O resto o `netlify.toml` resolve.
3. **Site configuration → Environment variables:**

| Variável | Valor |
|---|---|
| `ANTHROPIC_API_KEY` | Chave da API da Anthropic (console.anthropic.com) |
| `FIREBASE_SERVICE_ACCOUNT` | JSON da conta de serviço em base64 (passo 1.6) |
| `HOTMART_HOTTOK` | Hottok da Hotmart (passo 3) |
| `HOTMART_PRODUTO_ID` | ID do produto do diagnóstico na Hotmart (opcional, recomendado) |
| `CHAVE_INTERNA` | Qualquer texto longo e aleatório (protege a função de geração) |
| `DIAS_ACESSO` | Dias de acesso após a compra (padrão: `90`) |
| `EMAILS_LIBERADOS` | E-mails com acesso sem compra, separados por vírgula (testes e cortesias) |

4. Conecte o domínio (ex.: `diagnostico.kellyalbert.com.br`) em **Domain management**.

### 3. Hotmart
1. Crie o produto (digital) do diagnóstico e defina o preço.
2. **Ferramentas → Webhook (API e notificações) → Cadastrar webhook:**
   URL `https://SEU-DOMINIO/api/hotmart`, eventos **Compra aprovada, Compra completa, Reembolso, Chargeback, Cancelamento, Protesto**.
3. Copie o **Hottok** para a variável `HOTMART_HOTTOK`.
4. No produto, defina a página de obrigado / acesso como `https://SEU-DOMINIO/entrar`.
5. Copie o link do checkout para `public/js/config.js`.

### 4. Teste antes de vender
1. Coloque o seu e-mail em `EMAILS_LIBERADOS` e faça o diagnóstico completo.
2. Faça uma compra de teste na Hotmart (ou use o botão de teste do webhook) e confira em **Firestore → compras** se o e-mail apareceu com `status: ativo`.

## Desenvolvimento

```bash
npm install
npm test          # testa a régua de notas
npm run typecheck # confere os tipos
npm run dev       # roda local com o Netlify CLI
```

## Custos estimados por diagnóstico
- IA (Claude Opus 5.5): cerca de US$ 0,15 a 0,30 por leitura completa.
- Firebase e Netlify: dentro das faixas gratuitas no volume inicial.
- Hotmart: taxa da plataforma sobre cada venda.

## Fase 2 (app)
O servidor (funções, banco, régua, IA) já serve para o app. A migração troca só as telas.
