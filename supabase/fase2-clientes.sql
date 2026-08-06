-- =============================================================================
-- FASE 2 — Cadastro de Cliente + link de autopreenchimento
-- Rode este script no SQL Editor do Supabase (uma vez).
--
-- Como funciona (seguro, sem chave secreta extra):
--  - A arquiteta gera um "convite" (um token). O link fica /cadastro/{token}.
--  - O cliente abre o link e preenche o formulário. Ao enviar, o registro é
--    inserido em "clientes" com aquele token.
--  - Um gatilho (trigger) valida o token e preenche o dono (user_id) e a obra.
--  - O anônimo (cliente) só consegue INSERIR (nunca ler os dados de ninguém).
-- =============================================================================

create extension if not exists "pgcrypto";

-- Convites de cadastro (cada um vira um link)
create table if not exists convites (
  token       text primary key default encode(gen_random_bytes(8), 'hex'),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  obra_id     uuid references obras (id) on delete set null,
  rotulo      text,
  created_at  timestamptz not null default now()
);

-- Clientes
create table if not exists clientes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid(),
  obra_id     uuid references obras (id) on delete set null,
  token       text,
  nome        text not null,
  email       text,
  telefone    text,
  documento   text,           -- CPF/CNPJ
  endereco    text,
  cidade      text,
  observacoes text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_clientes_user on clientes (user_id);

-- Gatilho: em inserts anônimos (sem user_id), valida o token do convite e
-- preenche user_id/obra_id a partir dele. Roda como "security definer" para
-- poder ler os convites mesmo com RLS ligado.
create or replace function preencher_cliente_por_token()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare c convites%rowtype;
begin
  if new.user_id is null then
    select * into c from convites where token = new.token;
    if not found then
      raise exception 'Convite inválido ou expirado.';
    end if;
    new.user_id := c.user_id;
    if new.obra_id is null then new.obra_id := c.obra_id; end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_cliente_token on clientes;
create trigger trg_cliente_token
  before insert on clientes
  for each row execute function preencher_cliente_por_token();

-- ---------------------------------------------------------------------------
-- Segurança (RLS)
-- ---------------------------------------------------------------------------
alter table convites enable row level security;
alter table clientes enable row level security;

drop policy if exists convites_owner        on convites;
drop policy if exists clientes_owner         on clientes;
drop policy if exists clientes_anon_insert   on clientes;

-- Convites: só o dono (arquiteta logada).
create policy convites_owner on convites
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Clientes: o dono lê/edita os seus.
create policy clientes_owner on clientes
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Clientes: o cliente anônimo só pode INSERIR (o gatilho valida o token).
-- Não há política de SELECT para anônimo, então ninguém lê dados alheios.
create policy clientes_anon_insert on clientes
  for insert to anon
  with check (true);
