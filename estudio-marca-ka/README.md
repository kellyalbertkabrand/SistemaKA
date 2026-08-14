# Estúdio de Marca — KA

Aplicativo **multi-cliente** que gera layouts para Instagram na identidade visual
de cada marca atendida pela KA. Este diretório contém o app **independente**
(React + Vite + TypeScript, empacotável para iOS/Android com Capacitor e
publicável como web/PWA), descrito na planta técnica do projeto.

> Este app é separado do sistema de notícias em Python na raiz do repositório.
> Os dois convivem no mesmo repositório, mas têm builds e deploys distintos.

---

## Estado atual — Fase 1 (Fundação) ✅

O que já está construído:

- **Estrutura do projeto:** React + Vite + TypeScript.
- **Conexão com Supabase:** client em `src/lib/supabase.ts` (lê as variáveis de
  ambiente; nunca expõe a chave da Anthropic).
- **Modelo de dados (seção 3 da planta):** `supabase/schema.sql` com todas as
  tabelas (`clientes`, `kit_marca`, `grafismos`, `templates`, `pecas_geradas`,
  `usuarios`), enums e **RLS** (admin vê tudo; cada cliente só vê o próprio
  `cliente_id`).
- **Autenticação:** login por e-mail/senha, contexto de auth e rotas
  protegidas que separam **admin** e **cliente**.
- **Telas:** Login, Home do Admin (placeholder Fase 2) e Home do Estúdio
  (placeholder Fase 3).

As próximas fases (Painel Admin, Motor de layout, Carrossel, Empacotamento,
IA) estão descritas na planta na raiz do repositório.

---

## Como rodar localmente

Pré-requisito: Node 18+.

```bash
cd estudio-marca-ka
npm install
cp .env.example .env.local   # preencha com os dados do seu projeto Supabase
npm run dev                  # http://localhost:5173
```

### Variáveis de ambiente (`.env.local`)

| Variável                 | Função                                          |
| ------------------------ | ----------------------------------------------- |
| `VITE_SUPABASE_URL`      | URL do projeto Supabase.                         |
| `VITE_SUPABASE_ANON_KEY` | Chave pública (anon) do Supabase.                |

> **Segurança:** a chave da API Anthropic **nunca** vai no front. Quando a IA
> for ativada (Fase 6), ela vive apenas numa Edge Function do Supabase.

---

## Configurar o Supabase (uma vez)

1. Crie um projeto em [supabase.com](https://supabase.com) e copie a
   **Project URL** e a **anon public key** para o `.env.local`.
2. No painel do Supabase, abra **SQL Editor**, cole o conteúdo de
   [`supabase/schema.sql`](./supabase/schema.sql) e clique em **Run**.
3. Em **Authentication → Providers**, garanta que **Email** está habilitado.
4. Crie seu usuário (via convite no painel do Supabase ou pelo login do app) e
   promova-o a admin rodando, no SQL Editor:

   ```sql
   update public.usuarios set papel = 'admin', cliente_id = null
   where email = 'seu-email@exemplo.com';
   ```

Todo novo usuário do Auth entra automaticamente como `cliente` (via trigger);
o admin depois ajusta papel e `cliente_id` pelo painel (Fase 2).

---

## Build de produção

```bash
npm run build     # type-check + bundle em dist/
npm run preview   # serve o build localmente
```

## Empacotar para as lojas (Fase 5)

```bash
npm run build
npm run cap:add:ios       # requer macOS/Xcode
npm run cap:add:android   # requer Android Studio
npm run cap:sync
```

---

## Estrutura

```
estudio-marca-ka/
├── index.html
├── package.json
├── vite.config.ts
├── capacitor.config.ts
├── supabase/
│   ├── schema.sql          # tabelas + enums + RLS (seção 3 da planta)
│   └── README.md
└── src/
    ├── main.tsx
    ├── App.tsx             # router + rotas protegidas
    ├── lib/
    │   ├── supabase.ts     # client do Supabase
    │   └── database.types.ts
    ├── context/
    │   └── AuthContext.tsx # sessão + papel (admin/cliente)
    ├── components/
    │   ├── ProtectedRoute.tsx
    │   ├── TopBar.tsx
    │   └── Loading.tsx
    └── pages/
        ├── Login.tsx
        ├── AdminHome.tsx   # placeholder Fase 2
        ├── EstudioHome.tsx # placeholder Fase 3
        ├── RootRedirect.tsx
        └── NotFound.tsx
```
