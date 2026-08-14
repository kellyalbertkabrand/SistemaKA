# Supabase — Estúdio de Marca KA

## `schema.sql`

Modelo de dados completo da **Fase 1** (seção 3 da planta técnica): tabelas,
enums, funções auxiliares, trigger de provisionamento de usuário e políticas de
**Row Level Security**.

### Aplicar

Cole o conteúdo no **SQL Editor** do painel do Supabase e clique em **Run**, ou
use a CLI:

```bash
supabase db push   # se você gerencia migrations com a CLI
```

O script é **idempotente** — pode ser executado novamente sem quebrar.

### Regra de RLS

- **Admin** (KA): enxerga e gerencia tudo.
- **Cliente**: enxerga apenas o próprio `cliente_id`; pode criar as próprias
  peças em `pecas_geradas`.

O papel e o `cliente_id` de cada usuário ficam em `public.usuarios`, ligados ao
`auth.users` do Supabase. Funções `SECURITY DEFINER` (`is_admin()`,
`auth_cliente_id()`) evitam recursão de RLS ao avaliar as políticas.

### Storage (logos, fontes, grafismos)

Para a Fase 2, crie um bucket (ex.: `kits`) em **Storage** e adicione políticas
de acesso. As URLs dos arquivos são guardadas nas colunas `*_url` das tabelas.
