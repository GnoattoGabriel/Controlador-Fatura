# Supabase — Sprint 2

## Aplicar (5 min, no Dashboard Supabase)

1. Crie o projeto em `supabase.com` (Free basta) e abra o **SQL editor**.
2. Cole e rode `migrations/0001_schema_rls.sql`, depois `migrations/0002_close_billing.sql` (ordem importa).
3. Rode `verify.sql` — itens 1–3 devem passar (RLS on, só `authenticated`, função definer).
4. Crie o usuário admin: **Authentication → Users → Add user → Email**.
5. Cole o UUID dele em `seed-admin.sql` e rode. `verify.sql` item 4 deve retornar 1 linha `admin`.
6. Copie **Project URL** + **anon key** (Settings → API) para o `.env` do app:
   `EXPO_PUBLIC_SUPABASE_URL=` e `EXPO_PUBLIC_SUPABASE_ANON_KEY=`.

## Teste de isolamento

Estrutural aqui (verify 1–4). O teste ponta a ponta (member só vê o próprio) é na Sprint 3, com logins reais no app.
