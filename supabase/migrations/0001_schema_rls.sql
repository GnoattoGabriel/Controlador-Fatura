-- Sprint 2 — schema base + RLS (Fatura Familiar)
-- Aplicar no SQL editor do Supabase, em ordem: 0001, depois seed-admin.sql
-- Decisões vindas da Sprint 0: corte dia 5 (resolvido no app, gravado em mes_inicio/mes),
-- fixas até pausar (ativa), pago híbrido (baixa avulsa + fechamento do mês).

-- gen_random_uuid() é nativo no Postgres 13+; linha abaixo só garante no Supabase.
create extension if not exists "pgcrypto";

-- ============ TABELAS ============

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  role text not null check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles (id) on delete restrict,
  loja text not null,
  categoria text not null default '',
  tipo text not null check (tipo in ('vista', 'parcelada', 'fixa')),
  valor_total_centavos integer not null check (valor_total_centavos >= 0),
  qtd_parcelas integer not null check (qtd_parcelas between 1 and 48),
  valor_parcela_centavos integer not null check (valor_parcela_centavos >= 0),
  -- Mês da FATURA (YYYY-MM), já com o corte dia 5 aplicado pelo app (Sprint 0).
  mes_inicio text not null check (mes_inicio ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  fora_cartao boolean not null default false,
  ativa boolean not null default true,
  created_at timestamptz not null default now()
);
create index purchases_member_mes_idx on public.purchases (member_id, mes_inicio);

create table public.installments (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases (id) on delete cascade,
  mes text not null check (mes ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  valor_centavos integer not null check (valor_centavos >= 0),
  pago boolean not null default false,
  pago_at timestamptz,
  unique (purchase_id, mes)
);
create index installments_mes_pago_idx on public.installments (mes, pago);
create index installments_purchase_idx on public.installments (purchase_id);

create table public.closures (
  id uuid primary key default gen_random_uuid(),
  mes text not null unique check (mes ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  total_centavos integer not null check (total_centavos >= 0),
  pago_por uuid references public.profiles (id) on delete set null,
  pago_at timestamptz
);

create table public.closure_items (
  id uuid primary key default gen_random_uuid(),
  closure_id uuid not null references public.closures (id) on delete cascade,
  member_id uuid not null references public.profiles (id) on delete restrict,
  valor_centavos integer not null check (valor_centavos >= 0),
  pago boolean not null default false,
  unique (closure_id, member_id)
);
create index closure_items_member_idx on public.closure_items (member_id);

create table public.push_tokens (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  token text not null,
  updated_at timestamptz not null default now()
);

-- ============ FUNÇÃO AUXILIAR (SECURITY DEFINER p/ evitar recursão na RLS) ============

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ============ RLS ============

alter table public.profiles enable row level security;
alter table public.purchases enable row level security;
alter table public.installments enable row level security;
alter table public.closures enable row level security;
alter table public.closure_items enable row level security;
alter table public.push_tokens enable row level security;

-- Nenhuma policy para anon: somente authenticated. Sem login = sem acesso.

-- profiles: cada um lê o próprio; admin lê tudo; escrita só admin.
create policy "profiles_select_own_or_admin"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy "profiles_write_admin"
  on public.profiles for insert to authenticated
  with check (public.is_admin());
create policy "profiles_update_admin"
  on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "profiles_delete_admin"
  on public.profiles for delete to authenticated
  using (public.is_admin());

-- purchases: member lê só as próprias (member_id obrigatório); escrita só admin.
create policy "purchases_select_own_or_admin"
  on public.purchases for select to authenticated
  using (member_id = auth.uid() or public.is_admin());
create policy "purchases_write_admin"
  on public.purchases for insert to authenticated
  with check (public.is_admin());
create policy "purchases_update_admin"
  on public.purchases for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "purchases_delete_admin"
  on public.purchases for delete to authenticated
  using (public.is_admin());

-- installments: member lê só as das próprias compras; escrita só admin.
create policy "installments_select_own_or_admin"
  on public.installments for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.purchases p
      where p.id = purchase_id and p.member_id = auth.uid()
    )
  );
create policy "installments_write_admin"
  on public.installments for insert to authenticated
  with check (public.is_admin());
create policy "installments_update_admin"
  on public.installments for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "installments_delete_admin"
  on public.installments for delete to authenticated
  using (public.is_admin());

-- closures: só admin (member vê o próprio valor via closure_items).
create policy "closures_admin_all"
  on public.closures for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- closure_items: member lê só o próprio; escrita só admin.
create policy "closure_items_select_own_or_admin"
  on public.closure_items for select to authenticated
  using (member_id = auth.uid() or public.is_admin());
create policy "closure_items_write_admin"
  on public.closure_items for insert to authenticated
  with check (public.is_admin());
create policy "closure_items_update_admin"
  on public.closure_items for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "closure_items_delete_admin"
  on public.closure_items for delete to authenticated
  using (public.is_admin());

-- push_tokens: cada um lê o próprio; escrita via admin/Edge Function (service_role pula a RLS).
create policy "push_tokens_select_own_or_admin"
  on public.push_tokens for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy "push_tokens_write_admin"
  on public.push_tokens for insert to authenticated
  with check (public.is_admin());
create policy "push_tokens_update_admin"
  on public.push_tokens for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "push_tokens_delete_admin"
  on public.push_tokens for delete to authenticated
  using (public.is_admin());

-- ============ GRANTS (RLS continua valendo por cima) ============

grant execute on function public.is_admin() to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- ============ REALTIME (baixa paga/popup na hora) ============

alter publication supabase_realtime add table public.installments;
alter publication supabase_realtime add table public.closure_items;
alter publication supabase_realtime add table public.purchases;
