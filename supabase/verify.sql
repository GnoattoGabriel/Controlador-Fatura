-- Verificação da Sprint 2 (rodar no SQL editor após 0001 + seed).

-- 1. RLS ligada nas 6 tabelas (esperado: 6 linhas, todas true).
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('profiles','purchases','installments','closures','closure_items','push_tokens');

-- 2. Policies existentes (esperado: nenhuma para anon, só authenticated).
select tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
order by tablename, cmd;

-- 3. Função is_admin existe e é SECURITY DEFINER (esperado: 1 linha).
select proname, prosecdef
from pg_proc
join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
where pg_namespace.nspname = 'public' and proname = 'is_admin';

-- 4. Seed do admin aplicado (esperado: 1 linha role=admin).
select id, nome, role from public.profiles where role = 'admin';

-- 5. Teste de isolamento de verdade (Sprint 3, com logins reais):
--    logar como member no app e confirmar que só voltam as próprias compras,
--    sem total geral. Via SQL não dá para impersonar sem JWT; o teste final é no app.
