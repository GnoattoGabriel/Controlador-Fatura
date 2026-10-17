-- Seed do admin (rodar DEPOIS da 0001, com o UUID real do usuário).
-- Passo 1: no Dashboard Supabase → Authentication → Users → Add user → Email.
-- Passo 2: copie o UUID do usuário criado e cole abaixo no lugar de COLE_UUID_ADMIN_AQUI.
-- Passo 3: rode este script no SQL editor.

insert into public.profiles (id, nome, role)
values ('COLE_UUID_ADMIN_AQUI', 'Admin', 'admin')
on conflict (id) do update set nome = excluded.nome, role = 'admin';

-- Members: o admin cadastra no app depois (Sprint 3+). Sem seed fixo (Sprint 0).
