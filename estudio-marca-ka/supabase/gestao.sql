-- ============================================================================
-- Sistema Visual de Publicações da Marca — KA · Gestão interna
-- Orçamentos, contratos, cobranças (mensalidade + avulsa) e acessos.
--
-- Como aplicar: Supabase Dashboard → SQL Editor → cole este arquivo → Run.
-- Requer o schema.sql (fundação) já aplicado. Idempotente: pode rodar de novo.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type orcamento_status as enum ('rascunho', 'enviado', 'aprovado', 'recusado', 'expirado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type contrato_status as enum ('rascunho', 'enviado', 'assinado', 'cancelado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type cobranca_tipo as enum ('mensalidade', 'avulsa');
exception when duplicate_object then null; end $$;

do $$ begin
  create type cobranca_status as enum ('pendente', 'paga', 'atrasada', 'cancelada');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 2. Mensalidade e dados de cobrança no cliente
-- ---------------------------------------------------------------------------
alter table public.clientes add column if not exists slug text;
-- Ficha do cliente (dados cadastrais/contato)
alter table public.clientes add column if not exists responsavel text;            -- pessoa de contato
alter table public.clientes add column if not exists email_contato text;
alter table public.clientes add column if not exists telefone text;               -- WhatsApp
alter table public.clientes add column if not exists endereco text;
alter table public.clientes add column if not exists cidade text;
alter table public.clientes add column if not exists observacoes text;
-- Cobrança
alter table public.clientes add column if not exists email_cobranca text;
alter table public.clientes add column if not exists documento text;              -- CPF/CNPJ (boleto)
alter table public.clientes add column if not exists valor_mensalidade numeric(10,2);
alter table public.clientes add column if not exists dia_vencimento int not null default 10
  check (dia_vencimento between 1 and 28);
alter table public.clientes add column if not exists cobranca_ativa boolean not null default false;

create unique index if not exists clientes_slug_idx on public.clientes (slug) where slug is not null;

-- ---------------------------------------------------------------------------
-- 3. Modelos de contrato (texto com {{placeholders}})
-- ---------------------------------------------------------------------------
create table if not exists public.modelos_contrato (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  conteudo   text not null,
  padrao     boolean not null default false,
  criado_em  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4. Orçamentos
-- ---------------------------------------------------------------------------
create table if not exists public.orcamentos (
  id                     uuid primary key default gen_random_uuid(),
  cliente_id             uuid references public.clientes(id) on delete set null,
  -- Destinatário (pode ser prospect que ainda não é cliente do sistema)
  destinatario_nome      text not null,
  destinatario_email     text,
  destinatario_documento text,
  titulo                 text not null,
  descricao              text,
  -- Itens: [{ "descricao": "...", "qtd": 1, "valor": 1200.00 }]
  itens                  jsonb not null default '[]'::jsonb,
  desconto               numeric(10,2) not null default 0,
  valor_total            numeric(10,2) not null default 0,
  condicoes              text,          -- forma de pagamento, prazos, o que inclui
  validade               date,
  status                 orcamento_status not null default 'rascunho',
  token                  uuid not null unique default gen_random_uuid(),
  modelo_contrato_id     uuid references public.modelos_contrato(id) on delete set null,
  contrato_id            uuid,          -- preenchido quando aprovado
  cobranca_id            uuid,          -- preenchido quando aprovado
  criado_em              timestamptz not null default now(),
  enviado_em             timestamptz,
  respondido_em          timestamptz
);
create index if not exists orcamentos_cliente_idx on public.orcamentos(cliente_id);
create index if not exists orcamentos_status_idx on public.orcamentos(status);

-- ---------------------------------------------------------------------------
-- 5. Contratos
-- ---------------------------------------------------------------------------
create table if not exists public.contratos (
  id                    uuid primary key default gen_random_uuid(),
  orcamento_id          uuid references public.orcamentos(id) on delete set null,
  cliente_id            uuid references public.clientes(id) on delete set null,
  titulo                text not null,
  conteudo              text not null,   -- texto final, placeholders já resolvidos
  status                contrato_status not null default 'rascunho',
  token                 uuid not null unique default gen_random_uuid(),
  criado_em             timestamptz not null default now(),
  enviado_em            timestamptz,
  -- Aceite digital simples (registro de concordância)
  assinado_em           timestamptz,
  assinatura_nome       text,
  assinatura_documento  text,
  assinatura_user_agent text
);
create index if not exists contratos_cliente_idx on public.contratos(cliente_id);

-- ---------------------------------------------------------------------------
-- 6. Cobranças (mensalidades geradas por competência + avulsas por orçamento)
-- ---------------------------------------------------------------------------
create table if not exists public.cobrancas (
  id                    uuid primary key default gen_random_uuid(),
  cliente_id            uuid references public.clientes(id) on delete set null,
  orcamento_id          uuid references public.orcamentos(id) on delete set null,
  tipo                  cobranca_tipo not null,
  descricao             text not null,
  valor                 numeric(10,2) not null check (valor >= 0),
  vencimento            date not null,
  competencia           text,            -- 'YYYY-MM' (só mensalidade)
  status                cobranca_status not null default 'pendente',
  -- Mercado Pago (preenchidos pela Edge Function)
  mp_preference_id      text,
  mp_payment_id         text,
  link_pagamento        text,            -- init_point do Checkout Pro (cartão/boleto/pix)
  boleto_url            text,
  boleto_linha_digitavel text,
  pago_em               timestamptz,
  criado_em             timestamptz not null default now()
);
create index if not exists cobrancas_cliente_idx on public.cobrancas(cliente_id);
create index if not exists cobrancas_status_idx on public.cobrancas(status);
-- Uma mensalidade por cliente por mês (idempotência do gerador)
create unique index if not exists cobrancas_competencia_idx
  on public.cobrancas (cliente_id, competencia)
  where tipo = 'mensalidade' and status <> 'cancelada';

-- ---------------------------------------------------------------------------
-- 7. RLS — admin gerencia tudo; cliente logado enxerga só o que é dele.
--    O acesso público (prospect abrindo link) NUNCA toca as tabelas direto:
--    passa pelas RPCs por token da seção 8.
-- ---------------------------------------------------------------------------
alter table public.modelos_contrato enable row level security;
alter table public.orcamentos       enable row level security;
alter table public.contratos        enable row level security;
alter table public.cobrancas        enable row level security;

drop policy if exists modelos_admin on public.modelos_contrato;
create policy modelos_admin on public.modelos_contrato
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists orcamentos_select on public.orcamentos;
create policy orcamentos_select on public.orcamentos
  for select using (public.is_admin() or cliente_id = public.auth_cliente_id());
drop policy if exists orcamentos_admin on public.orcamentos;
create policy orcamentos_admin on public.orcamentos
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists contratos_select on public.contratos;
create policy contratos_select on public.contratos
  for select using (public.is_admin() or cliente_id = public.auth_cliente_id());
drop policy if exists contratos_admin on public.contratos;
create policy contratos_admin on public.contratos
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists cobrancas_select on public.cobrancas;
create policy cobrancas_select on public.cobrancas
  for select using (public.is_admin() or cliente_id = public.auth_cliente_id());
drop policy if exists cobrancas_admin on public.cobrancas;
create policy cobrancas_admin on public.cobrancas
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 8. RPCs públicas por token (security definer)
--    Só expõem a linha do token informado; quem não tem o link não vê nada.
-- ---------------------------------------------------------------------------

-- Substitui {{placeholders}} do modelo de contrato pelos dados do orçamento.
create or replace function public.preencher_contrato(
  p_modelo text,
  p_orc public.orcamentos
) returns text
language plpgsql
stable
as $$
declare
  v text := p_modelo;
  v_itens text := '';
  item jsonb;
begin
  for item in select * from jsonb_array_elements(p_orc.itens) loop
    v_itens := v_itens || '- ' || coalesce(item->>'descricao', '')
      || ' — ' || coalesce((item->>'qtd')::text, '1') || ' × R$ '
      || to_char(coalesce((item->>'valor')::numeric, 0), 'FM999G999G990D00') || E'\n';
  end loop;
  v := replace(v, '{{cliente_nome}}',      coalesce(p_orc.destinatario_nome, ''));
  v := replace(v, '{{cliente_documento}}', coalesce(p_orc.destinatario_documento, ''));
  v := replace(v, '{{cliente_email}}',     coalesce(p_orc.destinatario_email, ''));
  v := replace(v, '{{titulo}}',            coalesce(p_orc.titulo, ''));
  v := replace(v, '{{descricao}}',         coalesce(p_orc.descricao, ''));
  v := replace(v, '{{itens}}',             v_itens);
  v := replace(v, '{{valor_total}}',       to_char(p_orc.valor_total, 'FM999G999G990D00'));
  v := replace(v, '{{condicoes}}',         coalesce(p_orc.condicoes, ''));
  v := replace(v, '{{data}}',              to_char(now() at time zone 'America/Sao_Paulo', 'DD/MM/YYYY'));
  return v;
end;
$$;

-- Prospect abre o link do orçamento.
create or replace function public.orcamento_por_token(p_token uuid)
returns table (
  titulo text, descricao text, destinatario_nome text,
  itens jsonb, desconto numeric, valor_total numeric,
  condicoes text, validade date, status orcamento_status,
  criado_em timestamptz, respondido_em timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select o.titulo, o.descricao, o.destinatario_nome,
         o.itens, o.desconto, o.valor_total,
         o.condicoes, o.validade, o.status,
         o.criado_em, o.respondido_em
  from public.orcamentos o
  where o.token = p_token;
$$;

-- Prospect responde ao orçamento. Se aprovado: gera contrato (do modelo) e
-- cobrança avulsa com vencimento em 7 dias. Retorna o token do contrato.
create or replace function public.responder_orcamento(
  p_token uuid,
  p_aprovado boolean,
  p_nome text default null,
  p_documento text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orcamentos;
  v_modelo text;
  v_contrato_id uuid;
  v_contrato_token uuid;
  v_cobranca_id uuid;
begin
  select * into o from public.orcamentos where token = p_token for update;
  if not found then raise exception 'Orçamento não encontrado'; end if;
  if o.status not in ('enviado') then
    raise exception 'Este orçamento não está mais aberto para resposta';
  end if;
  if o.validade is not null and o.validade < current_date then
    update public.orcamentos set status = 'expirado' where id = o.id;
    raise exception 'Este orçamento expirou';
  end if;

  if not p_aprovado then
    update public.orcamentos
      set status = 'recusado', respondido_em = now()
      where id = o.id;
    return null;
  end if;

  -- Modelo escolhido no orçamento, ou o modelo padrão.
  select conteudo into v_modelo from public.modelos_contrato
    where id = coalesce(o.modelo_contrato_id,
                        (select id from public.modelos_contrato where padrao limit 1));
  if v_modelo is null then
    v_modelo = 'Contrato de prestação de serviços — {{titulo}}' || E'\n\n'
      || 'Contratante: {{cliente_nome}} ({{cliente_documento}})' || E'\n'
      || 'Serviços: {{itens}}' || E'\nValor: R$ {{valor_total}}\n{{condicoes}}';
  end if;

  insert into public.contratos (orcamento_id, cliente_id, titulo, conteudo, status, enviado_em)
  values (
    o.id, o.cliente_id,
    'Contrato — ' || o.titulo,
    public.preencher_contrato(v_modelo, o),
    'enviado', now()
  )
  returning id, token into v_contrato_id, v_contrato_token;

  insert into public.cobrancas (cliente_id, orcamento_id, tipo, descricao, valor, vencimento)
  values (o.cliente_id, o.id, 'avulsa', o.titulo || ' (orçamento aprovado)',
          o.valor_total, current_date + 7)
  returning id into v_cobranca_id;

  update public.orcamentos
    set status = 'aprovado',
        respondido_em = now(),
        destinatario_nome = coalesce(nullif(trim(p_nome), ''), destinatario_nome),
        destinatario_documento = coalesce(nullif(trim(p_documento), ''), destinatario_documento),
        contrato_id = v_contrato_id,
        cobranca_id = v_cobranca_id
    where id = o.id;

  return v_contrato_token;
end;
$$;

-- Prospect abre o link do contrato.
create or replace function public.contrato_por_token(p_token uuid)
returns table (
  titulo text, conteudo text, status contrato_status,
  criado_em timestamptz, assinado_em timestamptz, assinatura_nome text
)
language sql
stable
security definer
set search_path = public
as $$
  select c.titulo, c.conteudo, c.status, c.criado_em, c.assinado_em, c.assinatura_nome
  from public.contratos c
  where c.token = p_token;
$$;

-- Aceite digital do contrato.
create or replace function public.assinar_contrato(
  p_token uuid,
  p_nome text,
  p_documento text,
  p_user_agent text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.contratos;
begin
  if nullif(trim(p_nome), '') is null or nullif(trim(p_documento), '') is null then
    raise exception 'Nome e CPF/CNPJ são obrigatórios para assinar';
  end if;
  select * into c from public.contratos where token = p_token for update;
  if not found then raise exception 'Contrato não encontrado'; end if;
  if c.status = 'assinado' then raise exception 'Este contrato já foi assinado'; end if;
  if c.status = 'cancelado' then raise exception 'Este contrato foi cancelado'; end if;

  update public.contratos
    set status = 'assinado',
        assinado_em = now(),
        assinatura_nome = trim(p_nome),
        assinatura_documento = trim(p_documento),
        assinatura_user_agent = left(coalesce(p_user_agent, ''), 400)
    where id = c.id;
end;
$$;

-- Permite que visitantes anônimos executem SÓ as RPCs por token.
grant execute on function public.orcamento_por_token(uuid) to anon, authenticated;
grant execute on function public.responder_orcamento(uuid, boolean, text, text) to anon, authenticated;
grant execute on function public.contrato_por_token(uuid) to anon, authenticated;
grant execute on function public.assinar_contrato(uuid, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 9. Gerador de mensalidades (idempotente por competência).
--    Chame do painel ("Gerar mensalidades do mês") ou agende com pg_cron.
-- ---------------------------------------------------------------------------
create or replace function public.gerar_mensalidades(p_competencia text default null)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comp text := coalesce(p_competencia,
    to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM'));
  v_qtd int := 0;
  c record;
begin
  -- Admin logada OU execução interna (pg_cron, sem usuário). O papel anon
  -- não tem grant nesta função, então visitante não consegue chamá-la.
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Apenas o admin pode gerar mensalidades';
  end if;
  for c in
    select * from public.clientes
    where cobranca_ativa and valor_mensalidade is not null and valor_mensalidade > 0
      and status = 'ativo'
  loop
    insert into public.cobrancas (cliente_id, tipo, descricao, valor, vencimento, competencia)
    values (
      c.id, 'mensalidade',
      'Mensalidade ' || v_comp || ' — ' || c.nome_marca,
      c.valor_mensalidade,
      make_date(split_part(v_comp, '-', 1)::int, split_part(v_comp, '-', 2)::int,
                least(c.dia_vencimento, 28))
    )
    on conflict (cliente_id, competencia) where tipo = 'mensalidade' and status <> 'cancelada'
    do nothing;
    if found then v_qtd := v_qtd + 1; end if;
  end loop;
  return v_qtd;
end;
$$;
grant execute on function public.gerar_mensalidades(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 10. Modelo de contrato padrão (seed — só insere se não houver nenhum)
-- ---------------------------------------------------------------------------
insert into public.modelos_contrato (nome, conteudo, padrao)
select 'Contrato padrão de design — KA', $modelo$
CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE DESIGN

CONTRATADA: Kelly Albert (Estúdio de Marca — KA), designer de marca,
e-mail kellyalbertka@gmail.com.

CONTRATANTE: {{cliente_nome}}, CPF/CNPJ {{cliente_documento}},
e-mail {{cliente_email}}.

1. OBJETO
1.1. O presente contrato tem por objeto a prestação dos serviços de design
descritos no orçamento "{{titulo}}", que integra este contrato:
{{itens}}
1.2. Descrição complementar: {{descricao}}

2. VALOR E PAGAMENTO
2.1. Pelos serviços descritos, a CONTRATANTE pagará à CONTRATADA o valor
total de R$ {{valor_total}}.
2.2. Condições: {{condicoes}}
2.3. O atraso no pagamento poderá suspender o andamento dos trabalhos e a
entrega dos arquivos finais.

3. PRAZOS E ENTREGAS
3.1. Os prazos contam a partir da assinatura deste contrato e do envio, pela
CONTRATANTE, de todos os materiais e informações necessários.
3.2. Estão incluídas até 2 (duas) rodadas de ajustes por entrega; ajustes
adicionais serão orçados à parte.

4. DIREITOS AUTORAIS
4.1. Após a quitação integral, a CONTRATANTE recebe os direitos de USO das
peças finais entregues, para os fins contratados.
4.2. A CONTRATADA poderá exibir os trabalhos em seu portfólio e redes.

5. RESCISÃO
5.1. Em caso de cancelamento pela CONTRATANTE após o início dos trabalhos,
serão devidos os valores proporcionais às etapas já executadas.

6. ACEITE
6.1. As partes aceitam este contrato de forma eletrônica, valendo o registro
de aceite (nome, documento, data e hora) como manifestação de concordância.

Data: {{data}}
$modelo$, true
where not exists (select 1 from public.modelos_contrato);
