-- =============================================================================
-- Painel de Obra — esquema do banco (Supabase / PostgreSQL)
-- Rode este script inteiro no SQL Editor do Supabase.
-- Ele cria as tabelas e configura o Row Level Security (RLS) para que:
--   - a arquiteta (logada) edite e veja SOMENTE as obras dela;
--   - o cliente (link público, sem login) LEIA apenas a obra do link,
--     e só quando ela estiver publicada.
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

-- Obras
create table if not exists obras (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome        text not null,
  cliente     text,
  slug        text unique not null,         -- vira o final do link do cliente
  orcamento   numeric not null default 0,
  publicado   boolean not null default true, -- liga/desliga o link do cliente
  created_at  timestamptz not null default now()
);

-- Etapas (orçamento planejado por fase)
create table if not exists etapas (
  id          uuid primary key default gen_random_uuid(),
  obra_id     uuid not null references obras (id) on delete cascade,
  nome        text not null,
  orcado      numeric not null default 0,
  created_at  timestamptz not null default now()
);

-- Lançamentos (cada custo)
create table if not exists lancamentos (
  id          uuid primary key default gen_random_uuid(),
  obra_id     uuid not null references obras (id) on delete cascade,
  etapa       text not null,
  descricao   text,
  valor       numeric not null default 0,
  status      text not null default 'pago' check (status in ('pago', 'pendente')),
  data        date not null default current_date,
  created_at  timestamptz not null default now()
);

create index if not exists idx_etapas_obra      on etapas (obra_id);
create index if not exists idx_lancamentos_obra on lancamentos (obra_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table obras       enable row level security;
alter table etapas      enable row level security;
alter table lancamentos enable row level security;

-- Recria as políticas de forma idempotente (pode rodar o script de novo sem erro)
drop policy if exists obras_owner_all        on obras;
drop policy if exists obras_public_read      on obras;
drop policy if exists etapas_owner_all       on etapas;
drop policy if exists etapas_public_read     on etapas;
drop policy if exists lancamentos_owner_all  on lancamentos;
drop policy if exists lancamentos_public_read on lancamentos;

-- OBRAS ---------------------------------------------------------------------
-- A arquiteta logada faz tudo, mas só nas obras dela.
create policy obras_owner_all on obras
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- O público (anon) só lê obras publicadas.
create policy obras_public_read on obras
  for select to anon
  using (publicado = true);

-- ETAPAS --------------------------------------------------------------------
create policy etapas_owner_all on etapas
  for all to authenticated
  using (exists (
    select 1 from obras o
    where o.id = etapas.obra_id and o.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from obras o
    where o.id = etapas.obra_id and o.user_id = auth.uid()
  ));

create policy etapas_public_read on etapas
  for select to anon
  using (exists (
    select 1 from obras o
    where o.id = etapas.obra_id and o.publicado = true
  ));

-- LANÇAMENTOS ---------------------------------------------------------------
create policy lancamentos_owner_all on lancamentos
  for all to authenticated
  using (exists (
    select 1 from obras o
    where o.id = lancamentos.obra_id and o.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from obras o
    where o.id = lancamentos.obra_id and o.user_id = auth.uid()
  ));

create policy lancamentos_public_read on lancamentos
  for select to anon
  using (exists (
    select 1 from obras o
    where o.id = lancamentos.obra_id and o.publicado = true
  ));
