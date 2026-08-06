-- =============================================================================
-- FASE 2 — Cadastro de Fornecedores
-- Rode este script no SQL Editor do Supabase (uma vez).
-- =============================================================================

create table if not exists fornecedores (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid(),
  nome        text not null,
  categoria   text,           -- ex.: Elétrica, Material de construção, Mão de obra
  telefone    text,
  email       text,
  cnpj        text,
  observacoes text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_fornecedores_user on fornecedores (user_id);

alter table fornecedores enable row level security;

drop policy if exists fornecedores_owner on fornecedores;
create policy fornecedores_owner on fornecedores
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
