# 06 — Pendências do Build (Sprint 0 — decidido 2026-10-15, corte corrigido 2026-10-15)

1. **Fechamento/vencimento + mês da fatura:** fatura MM cobre compras de **dia 5/MM até dia 4/MM+1** e **fecha dia 5 do mês seguinte** (vencimento a definir, sugestão: dia 12). Parcela 1 segue a mesma regra.
2. **Fixas:** valem **até pausar**, com `mes_inicio` definido; `ativa=false` pausa. Sem data de término obrigatória.
3. **`pago` híbrido:** admin pode dar baixa avulsa por parcela + fechamento total do mês via Edge Function.
4. **Categorias:** sem lista fixa — **nome/categoria livre por compra**, admin define na hora.
5. **App/plataforma/lembrete/PDF:** Android primeiro (nome oficial a definir, working title `Fatura Familiar`); lembrete dia **1 de cada mês ao meio-dia**; vencimento exato + layout do PDF ainda abertos (default: PDF simples por pessoa).

Refletido em `01-dominio.md` (corte dia 5, fixas até pausar, pago híbrido) + Obsidian `Fatura Familiar - Pendências Build`.
