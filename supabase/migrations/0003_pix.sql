-- Sprint 10 (v1.0.0) — Pix estático: configuração de recebimento.
-- Aplicar no SQL editor do Supabase DEPOIS de 0001 e 0002.
--
-- Chave única do admin. O member precisa LER a chave para montar o BR Code,
-- por isso a tabela é legível por qualquer autenticado (não é dado de outro membro).
-- Escrita permanece restrita ao admin.

create table public.app_settings (
  id smallint primary key default 1 check (id = 1),
  pix_chave text not null default '',
  pix_nome text not null default '',
  pix_cidade text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

-- Leitura: todos os autenticados (admin e members) — a chave não é dado sensível de terceiro.
create policy "app_settings_select_authenticated"
  on public.app_settings for select to authenticated
  using (true);

-- Escrita: só admin (mesma regra do resto do app).
create policy "app_settings_insert_admin"
  on public.app_settings for insert to authenticated
  with check (public.is_admin());
create policy "app_settings_update_admin"
  on public.app_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "app_settings_delete_admin"
  on public.app_settings for delete to authenticated
  using (public.is_admin());

grant select, insert, update, delete on public.app_settings to authenticated;

-- Linha única (singleton) já existente.
insert into public.app_settings (id) values (1)
on conflict (id) do nothing;
