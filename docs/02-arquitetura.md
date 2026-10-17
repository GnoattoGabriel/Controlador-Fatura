# 02 — Arquitetura

## App

Expo Router + TypeScript, Zustand. Cada membro no próprio celular, sync realtime via Supabase.

## Roles

- `admin`: tudo — CRUD, importar, marcar pago, ver total + por pessoa.
- `member`: somente-leitura do próprio. Isolamento 100%: sem total geral, sem dados de outros.

## Isolamento (dupla camada)

1. **Servidor (fonte de verdade):** RLS — `member` = `SELECT` só `member_id = auth.uid()`, zero INSERT/UPDATE/DELETE; `admin` = tudo.
2. **Cliente (defesa):** toda query aplica `if (!isAdmin) WHERE member_id = me`; componentes recebem `editable={isAdmin}`.

## Auth

Supabase: admin email/senha, members magic link. PIN/biometria local destrava a sessão no aparelho.

## Realtime

Baixa paga/atualiza na hora no celular de cada um. Popup `fatura paga` 1x no próximo open (só valor próprio p/ member).
