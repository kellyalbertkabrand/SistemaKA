-- ============================================================================
-- Estúdio de Marca — KA · Fase 1 (fundação)
-- Esquema do banco (Postgres/Supabase) referente à seção 3 da planta técnica.
--
-- Como aplicar:
--   Supabase Dashboard → SQL Editor → cole este arquivo → Run.
--   (ou) supabase db push, se usar a CLI com migrations.
--
-- O script é idempotente: pode rodar de novo sem quebrar.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Extensões
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- 1. Tipos (enums)
-- ---------------------------------------------------------------------------
do $$ begin
  create type cliente_status as enum ('ativo', 'pausado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type marca_mood as enum ('claro', 'escuro', 'neutro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type estilo_base as enum ('minimalista', 'editorial', 'expressivo');
exception when duplicate_object then null; end $$;

do $$ begin
  create type grafismo_tipo as enum ('textura', 'padrao', 'ornamento');
exception when duplicate_object then null; end $$;

do $$ begin
  create type formato_peca as enum ('card', 'post', 'carrossel', 'reels', 'story');
exception when duplicate_object then null; end $$;

do $$ begin
  create type usuario_papel as enum ('admin', 'cliente');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 2. Tabelas
-- ---------------------------------------------------------------------------

-- clientes -------------------------------------------------------------------
create table if not exists public.clientes (
  id                uuid primary key default gen_random_uuid(),
  nome_marca        text not null,
  instagram_handle  text,
  segmento          text,
  site              text,
  status            cliente_status not null default 'ativo',
  criado_em         timestamptz not null default now()
);

-- kit_marca (1:1 com cliente) -----------------------------------------------
create table if not exists public.kit_marca (
  cliente_id              uuid primary key references public.clientes(id) on delete cascade,
  -- Cores (hex)
  cor_primaria            text,
  cor_secundaria          text,
  cor_destaque            text,
  cor_fundo_claro         text,
  cor_texto_escuro        text,
  -- Tipografia
  fonte_titulo_nome       text,
  fonte_titulo_arquivo_url text,
  fonte_corpo_nome        text,
  fonte_corpo_arquivo_url text,
  -- Logos (urls no Storage)
  logo_principal_url      text,
  logo_simbolo_url        text,
  logo_negativo_url       text,
  -- Direção de arte
  mood                    marca_mood,
  usa_foto                boolean not null default false,
  estilo                  estilo_base,
  -- Verbal
  tom_de_voz              text,
  bordoes                 text[] not null default '{}',
  cta_padrao              text,
  assinatura              text,
  -- Formatos ativos
  formatos                formato_peca[] not null default '{}',
  atualizado_em           timestamptz not null default now()
);

-- grafismos (N por cliente) --------------------------------------------------
create table if not exists public.grafismos (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references public.clientes(id) on delete cascade,
  arquivo_url text not null,
  tipo        grafismo_tipo not null,
  criado_em   timestamptz not null default now()
);
create index if not exists grafismos_cliente_idx on public.grafismos(cliente_id);

-- templates (estilos de layout liberados por cliente) ------------------------
create table if not exists public.templates (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references public.clientes(id) on delete cascade,
  nome        text not null,
  formato     formato_peca not null,
  config_json jsonb not null default '{}'::jsonb,
  criado_em   timestamptz not null default now()
);
create index if not exists templates_cliente_idx on public.templates(cliente_id);

-- pecas_geradas (histórico) --------------------------------------------------
create table if not exists public.pecas_geradas (
  id            uuid primary key default gen_random_uuid(),
  cliente_id    uuid not null references public.clientes(id) on delete cascade,
  formato       formato_peca not null,
  conteudo_json jsonb not null default '{}'::jsonb,
  imagem_url    text,
  criado_em     timestamptz not null default now()
);
create index if not exists pecas_cliente_idx on public.pecas_geradas(cliente_id);

-- usuarios (vincula auth.users a um papel e, se cliente, a um cliente) --------
create table if not exists public.usuarios (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  papel        usuario_papel not null default 'cliente',
  cliente_id   uuid references public.clientes(id) on delete set null,
  cliente_slug text, -- marca (slug do template) que este login de cliente enxerga
  criado_em    timestamptz not null default now()
);
-- garante a coluna em bancos criados antes desta versão
alter table public.usuarios add column if not exists cliente_slug text;
create index if not exists usuarios_cliente_idx on public.usuarios(cliente_id);

-- ---------------------------------------------------------------------------
-- 3. Funções auxiliares (SECURITY DEFINER para não recursar na RLS)
-- ---------------------------------------------------------------------------

-- Papel do usuário logado.
create or replace function public.auth_papel()
returns usuario_papel
language sql
stable
security definer
set search_path = public
as $$
  select papel from public.usuarios where id = auth.uid();
$$;

-- cliente_id do usuário logado (null para admin).
create or replace function public.auth_cliente_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select cliente_id from public.usuarios where id = auth.uid();
$$;

-- true se o usuário logado é admin.
-- Admin por papel='admin' no usuarios OU pelo e-mail bootstrap da KA (mesmo
-- padrão do front, VITE_ADMIN_EMAILS) — evita ter que promover a mão no teste.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.auth_papel() = 'admin', false)
      or coalesce(lower(auth.jwt() ->> 'email') = 'kellyalbertka@gmail.com', false);
$$;

-- ---------------------------------------------------------------------------
-- 4. Provisionamento automático do registro em `usuarios`
--    Cada novo usuário do Auth ganha uma linha em `usuarios` (papel cliente
--    por padrão; o papel/cliente_id são definidos pelo admin no painel).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, email, papel)
  values (new.id, new.email, 'cliente')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 5. Row Level Security
--    Regra: admin enxerga tudo; cada cliente só enxerga o próprio cliente_id.
-- ---------------------------------------------------------------------------
alter table public.clientes       enable row level security;
alter table public.kit_marca      enable row level security;
alter table public.grafismos      enable row level security;
alter table public.templates      enable row level security;
alter table public.pecas_geradas  enable row level security;
alter table public.usuarios       enable row level security;

-- Helper macro: política de leitura "admin OU dono do cliente_id".
-- (escrita total reservada ao admin; cliente só escreve em pecas_geradas)

-- clientes -------------------------------------------------------------------
drop policy if exists clientes_select on public.clientes;
create policy clientes_select on public.clientes
  for select using (public.is_admin() or id = public.auth_cliente_id());

drop policy if exists clientes_write on public.clientes;
create policy clientes_write on public.clientes
  for all using (public.is_admin()) with check (public.is_admin());

-- kit_marca ------------------------------------------------------------------
drop policy if exists kit_select on public.kit_marca;
create policy kit_select on public.kit_marca
  for select using (public.is_admin() or cliente_id = public.auth_cliente_id());

drop policy if exists kit_write on public.kit_marca;
create policy kit_write on public.kit_marca
  for all using (public.is_admin()) with check (public.is_admin());

-- grafismos ------------------------------------------------------------------
drop policy if exists grafismos_select on public.grafismos;
create policy grafismos_select on public.grafismos
  for select using (public.is_admin() or cliente_id = public.auth_cliente_id());

drop policy if exists grafismos_write on public.grafismos;
create policy grafismos_write on public.grafismos
  for all using (public.is_admin()) with check (public.is_admin());

-- templates ------------------------------------------------------------------
drop policy if exists templates_select on public.templates;
create policy templates_select on public.templates
  for select using (public.is_admin() or cliente_id = public.auth_cliente_id());

drop policy if exists templates_write on public.templates;
create policy templates_write on public.templates
  for all using (public.is_admin()) with check (public.is_admin());

-- pecas_geradas --------------------------------------------------------------
-- Cliente lê e cria as próprias peças; admin enxerga e gerencia tudo.
drop policy if exists pecas_select on public.pecas_geradas;
create policy pecas_select on public.pecas_geradas
  for select using (public.is_admin() or cliente_id = public.auth_cliente_id());

drop policy if exists pecas_insert on public.pecas_geradas;
create policy pecas_insert on public.pecas_geradas
  for insert with check (public.is_admin() or cliente_id = public.auth_cliente_id());

drop policy if exists pecas_admin_all on public.pecas_geradas;
create policy pecas_admin_all on public.pecas_geradas
  for all using (public.is_admin()) with check (public.is_admin());

-- usuarios -------------------------------------------------------------------
-- Cada um lê o próprio registro; admin lê/gerencia todos.
drop policy if exists usuarios_select_self on public.usuarios;
create policy usuarios_select_self on public.usuarios
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists usuarios_admin_all on public.usuarios;
create policy usuarios_admin_all on public.usuarios
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- Pós-instalação: promover o primeiro usuário a admin (KA).
-- Rode UMA vez, depois de criar seu login no app, trocando o e-mail:
--
--   update public.usuarios set papel = 'admin', cliente_id = null
--   where email = 'kellyalbertka@gmail.com';
-- ============================================================================
