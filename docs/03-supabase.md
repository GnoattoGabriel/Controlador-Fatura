# 03 — Supabase

## Tabelas

- `profiles(id uuid PK, nome text, role text: 'admin'|'member')`
- `purchases(id uuid PK, member_id uuid FK, loja text, tipo text, valor_total_centavos int, qtd_parcelas int, valor_parcela_centavos int, mes_inicio text 'YYYY-MM', fora_cartao bool, ativa bool)` (+ coluna legada `categoria`, sem uso)
- `installments(id uuid PK, purchase_id uuid FK, mes text 'YYYY-MM', valor_centavos int, pago bool, pago_at timestamptz)`
- `closures(id uuid PK, mes text unique 'YYYY-MM', total_centavos int, pago_por uuid, pago_at timestamptz)`
- `closure_items(id uuid PK, closure_id uuid FK, member_id uuid FK, valor_centavos int, pago bool)`
- `push_tokens(user_id uuid PK, token text)`

## RLS (resumo — SQL final em `supabase/migrations/0001_schema_rls.sql`)

- `member`: `SELECT` em `purchases/installments/closure_items` só onde `member_id = auth.uid()`. Sem INSERT/UPDATE/DELETE.
- `admin`: tudo via função `is_admin()` (`SECURITY DEFINER`, sem recursão).
- `closures`: só admin; member vê o próprio valor via `closure_items`.
- Nenhuma policy para `anon`: sem login = sem acesso. Verificação em `supabase/verify.sql`, passo a passo em `supabase/README.md`.

## Fechamento

Só admin via RPC `close_billing(mes)` (`SECURITY DEFINER` + `is_admin`, sem Edge Function): marca `pago=true` nas parcelas do mês, grava `closures + closure_items`, materializa o próximo mês das fixas ativas. App envia push por membro (só o valor dele) via Expo Push API + popup 1x no próximo open.

## Lembrete vencimento

Local agendado no aparelho (dia 1 ao meio-dia) + push no fechamento. Cron/Edge Function ficou como endurecimento futuro. Dia/horário em `06-pendencias.md`.
