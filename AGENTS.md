# AGENTS.md — Fatura Familiar (Expo)

Scaffold Expo (SDK 58) aplicado na Sprint 1: Expo Router + TS + Zustand + Supabase client. `npx expo-doctor` limpo.

## Stack travado
- App: Expo Router + TypeScript, `Zustand`, Supabase desde o MVP (cada membro no próprio celular, sync realtime).
- RLS impõe isolamento no servidor: `member` = `SELECT` só `member_id = auth.uid()`, sem INSERT/UPDATE/DELETE; `admin` = tudo. SQLite só como cache offline (se couber).
- Dinheiro: sempre centavos `INTEGER` no banco. Parcela = `floor(total/n)`, resto na última. Formatar só na UI com `Intl.NumberFormat('pt-BR', BRL)`.

## Regras de domínio (não quebrar)
- Divisão: `quem gastou, paga`. Todo `purchase` tem `member_id` obrigatório.
- Tipos: `vista (1x) | parcelada (1-48x) | fixa mensal fora-cartão (ativa até pausar)`.
- `minhaParte(mes) = vistas(mes) + parcelas vincendas + fixas ativas`.
- Fechar fatura (só admin): marca `pago=sim` nas parcelas do mês, `x/y` avança +1, dispara notificação local + popup 1x no próximo open.
- Roles: `admin` = tudo + CRUD + importar + marcar pago. `member` = somente-leitura do próprio (`WHERE member_id = me`), 100% isolado: sem total geral, sem dados de outros.
- Auth: Supabase (admin email/senha, members magic link) + PIN/biometria local destravando a sessão.

## UI
- Dark AMOLED `#000000` bg, `#10141F` cards, texto `#F5F7FA`. Primárias frias: magenta `#D946EF`, violeta `#6D28FF`, azul `#2F80FF→#2EC5FF`, teal `#3EDDD0`. Contraste só p/ status: pago `#22C55E`, a vencer `#FACC15`, atrasada `#EF4444`.
- Destaque = `PurchaseCard + InstallmentTimeline` (accordion 200-250ms ease-out). Sem `Participação anual`.
- Ícones Lucide/`expo-vector-icons`, sem emoji final.

## Escopo MVP vs backlog
- MVP: lista + timeline expansível, CRUD admin, fechamento, busca/filtros, lembrete vencimento, export PDF (`expo-print+sharing`) / Excel (`xlsx+sharing`), import bulk CSV + XML (`document-picker` com preview e validação).
- Backlog v2 (não implementar): Pix QR/BR Code com valor editável.
- Fora: anexo comprovante, backup auto, duplicar compra.

## XML schema
`<fatura mes="YYYY-MM"> <compra ... tipo="vista|parcelada|fixa" foraCartao="bool"> <parcela mes valor pago/> </compra> <totais/> </fatura>`
