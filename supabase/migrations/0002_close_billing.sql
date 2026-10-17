-- Sprint 7 — fechamento via RPC (sem Edge Function/CLI: mesma garantia via RLS + is_admin).
-- Aplicar no SQL editor DEPOIS da 0001.

-- Tokens: cada usuário grava o próprio (só o token do próprio aparelho).
create policy "push_tokens_insert_own"
  on public.push_tokens for insert to authenticated
  with check (user_id = auth.uid());
create policy "push_tokens_update_own"
  on public.push_tokens for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Fechamento do mês (só admin): dá baixa nas parcelas vincendas, grava
-- closures + closure_items e materializa o próximo mês das fixas ativas.
create or replace function public.close_billing(p_mes text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next text;
  v_closure_id uuid;
  v_total integer;
begin
  if p_mes !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then
    raise exception 'Mês inválido: %', p_mes;
  end if;
  if not public.is_admin() then
    raise exception 'Somente admin pode fechar.';
  end if;
  if exists (select 1 from public.closures where mes = p_mes) then
    raise exception 'Fatura % já fechada.', p_mes;
  end if;

  -- Baixa avulsa em lote nas parcelas do mês ainda abertas.
  update public.installments
  set pago = true, pago_at = now()
  where mes = p_mes and pago = false;

  -- Total por membro no mês (vista/parcelada via installments + fixas via linha do mês).
  -- Fixas sem row materializada entram pelo fallback: valor_total da fixa ativa.
  with per_member as (
    select p.member_id, sum(i.valor_centavos)::integer as v
    from public.installments i
    join public.purchases p on p.id = i.purchase_id
    where i.mes = p_mes
    group by p.member_id
  ),
  fixas as (
    select p.member_id, sum(p.valor_total_centavos)::integer as v
    from public.purchases p
    where p.tipo = 'fixa' and p.ativa and p.mes_inicio <= p_mes
      and not exists (
        select 1 from public.installments i
        where i.purchase_id = p.id and i.mes = p_mes
      )
    group by p.member_id
  ),
  merged as (
    select member_id, sum(v)::integer as v from (
      select * from per_member union all select * from fixas
    ) s group by member_id
  )
  select coalesce(sum(v), 0)::integer into v_total from merged;

  insert into public.closures (mes, total_centavos, pago_por, pago_at)
  values (p_mes, v_total, auth.uid(), now())
  returning id into v_closure_id;

  with per_member as (
    select p.member_id, sum(i.valor_centavos)::integer as v
    from public.installments i
    join public.purchases p on p.id = i.purchase_id
    where i.mes = p_mes
    group by p.member_id
  ),
  fixas as (
    select p.member_id, sum(p.valor_total_centavos)::integer as v
    from public.purchases p
    where p.tipo = 'fixa' and p.ativa and p.mes_inicio <= p_mes
      and not exists (
        select 1 from public.installments i
        where i.purchase_id = p.id and i.mes = p_mes
      )
    group by p.member_id
  ),
  merged as (
    select member_id, sum(v)::integer as v from (
      select * from per_member union all select * from fixas
    ) s group by member_id
  )
  insert into public.closure_items (closure_id, member_id, valor_centavos, pago)
  select v_closure_id, member_id, v, true from merged;

  -- Próximo mês das fixas ativas (sem duplicar).
  v_next := to_char(to_date(p_mes, 'YYYY-MM') + interval '1 month', 'YYYY-MM');
  insert into public.installments (purchase_id, mes, valor_centavos, pago)
  select p.id, v_next, p.valor_total_centavos, false
  from public.purchases p
  where p.tipo = 'fixa' and p.ativa and p.mes_inicio <= v_next
    and not exists (
      select 1 from public.installments i
      where i.purchase_id = p.id and i.mes = v_next
    );

  return (
    select jsonb_build_object(
      'mes', p_mes,
      'totalCentavos', v_total,
      'byMember', coalesce(jsonb_agg(jsonb_build_object(
        'memberId', ci.member_id,
        'nome', pr.nome,
        'totalCentavos', ci.valor_centavos
      ) order by ci.valor_centavos desc), '[]'::jsonb)
    )
    from public.closure_items ci
    join public.profiles pr on pr.id = ci.member_id
    where ci.closure_id = v_closure_id
  );
end;
$$;

grant execute on function public.close_billing(text) to authenticated;
