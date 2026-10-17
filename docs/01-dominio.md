# 01 — Domínio

## Divisão

`quem gastou, paga`. Todo `purchase` tem `member_id` obrigatório. Sem rateio. Sem `Participação anual`.

## Tipos (`tipo`)

1. `vista` — 1x, cai na fatura pela regra do corte (fatura MM = dia 5/MM a 4/MM+1).
2. `parcelada` — 1–48x, parcela 1 segue o corte, demais `mes_inicio + qtd`.
3. `fixa` — mensal fora do cartão (`fora_cartao=true`), vale até pausar (`ativa=false`), com `mes_inicio` definido.

## Dinheiro

- Sempre centavos `INTEGER` no banco (`valor_total_centavos`, `valor_parcela_centavos`).
- Parcela = `floor(total / n)`, resto na última parcela.
- Formatação `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` só na UI (formatter hoisted no módulo).

## Cálculo

`minhaParte(mes) = vistas(mes) + parcelas vincendas + fixas ativas`

## Semântica de `pago` (Sprint 0 — híbrido)

- Baixa avulsa por parcela (só admin) + fechamento total do mês via Edge Function marca `pago=true` nas parcelas do mês; `x/y` avança +1.
