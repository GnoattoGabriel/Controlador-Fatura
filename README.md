# Fatura Familiar — App Expo + Supabase

Controle de fatura de cartão compartilhada da família. Regra: **quem gastou, paga**.

## Documentação

Fonte de verdade do escopo: Obsidian (`App Fatura Familiar — Escopo` + notas ligadas).
Este `docs/` é o espelho técnico executável no repo.

- `docs/README.md` — mapa
- `docs/01-dominio.md` — divisão, tipos, dinheiro, minhaParte
- `docs/02-arquitetura.md` — Expo + Supabase, roles, RLS
- `docs/03-supabase.md` — schema, RLS, realtime, Edge Functions
- `docs/04-ui.md` — tema, PurchaseCard + timeline, telas
- `docs/05-import-export.md` — PDF/XML/CSV, schema XML
- `docs/06-pendencias.md` — decisões abertas do Build

## Stack

Expo Router + TypeScript, Zustand, Supabase (Postgres + Auth + Realtime). SQLite só como cache offline, se couber.

## Estado

Greenfield — sem `package.json`, sem código. Ver `docs/06-pendencias.md` antes do scaffold.
