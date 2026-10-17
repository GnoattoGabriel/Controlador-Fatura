# Changelog

Todas as mudanças relevantes do **Fatura Familiar** são documentadas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e
[SemVer](https://semver.org/lang/pt-BR/).

## [Unreleased] — alvo **1.0.0** (MAJOR)

### Adicionado
- Pix estático (BR Code): gerador do "Copia e Cola" com CRC16/CCITT-FALSE (`src/lib/pix.ts`) + testes.
- Máscara de entrada de moeda centavos-primeiro (`centsFromDigits` / `formatCentsInput`) + testes.
- Migration `0003_pix.sql`: tabela `app_settings` (chave Pix do recebedor — leitura para todo autenticado, escrita só admin).

### Pendente nesta versão
- Redesenho do `PayModal`: confirmação do valor total + campo "quanto quero pagar" (máscara + botões +R$10/+R$20/+R$50) + QR real.
- Tela de configuração da chave Pix (admin).

## [0.1.0] - 2026-10-17

### Adicionado
- MVP: autenticação (Supabase), PIN/biometria local destravando a sessão.
- Papéis `admin` (CRUD, importar, fechar fatura) e `member` (somente-leitura do próprio, isolado por RLS).
- Divisão "quem gastou, paga": à vista, parcelada (1–48x) e fixa mensal fora do cartão.
- Lista com `PurchaseCard` + timeline expansível de parcelas, status pago/a vencer/atrasada.
- Fechamento de fatura (RPC `close_billing`) com notificação local + popup.
- Busca e filtros por mês/ano, loja, status, dono e valor.
- Export PDF (`expo-print`) e Excel `.xlsx` (SheetJS); import CSV e XML com preview, validação e detecção de duplicadas.

### Alterado
- APK restrito a `arm64-v8a` (via `expo-build-properties`): **106,8 MB → 35,9 MB (-66%)**.
- Removidas dependências nativas não usadas: `expo-device`, `react-native-svg`, `@expo/ui`.
- Patch versions do SDK 58 alinhadas (`expo-doctor` 20/20).

### Notas
- O APK desta versão reporta internamente `versionName 1.0.0` (foi construído antes da adoção do SemVer); a partir do próximo build a versão interna bate com a tag.
- Requer Android com CPU `arm64-v8a` (aparelhos ~2017+).

### Técnico
- Build EAS: `5352e5d1` · Commit: `42825f7` · versionCode: 1 · APK: 35,9 MB
- Link: https://expo.dev/accounts/gnoattogabriel/projects/fatura-familiar/builds/5352e5d1-2a35-4732-8a3b-29275a3cd6ce

<!-- Link de comparação entre versões (adicionar conforme novas tags):
[0.1.1]: https://github.com/GnoattoGabriel/Controlador-Fatura/compare/v0.1.0...v0.1.1
-->

---

## Como versionar

**Regra de bump (SemVer):**

| Tipo | Quando usar | Exemplo |
|------|-------------|---------|
| **MAJOR** | Marco grande / quebra de compatibilidade (ex.: MVP fecha, vai pro uso "de verdade") | `0.x.y` → `1.0.0` |
| **MINOR** | Nova funcionalidade ou tela | `0.1.0` → `0.2.0` |
| **PATCH** | Correção de bug ou ajuste visual | `0.1.0` → `0.1.1` |

**Fluxo manual assistido** (basta pedir "sobe pra X.Y.Z"):

1. Bump de `expo.version` no `app.json`.
2. Nova seção `## [X.Y.Z] - AAAA-MM-DD` no topo deste arquivo.
3. Commit `chore(release): vX.Y.Z`.
4. Tag anotada: `git tag -a vX.Y.Z -m "vX.Y.Z"`.
5. `git push origin main --tags`.
6. Build: `npx eas-cli build -p android --profile preview --non-interactive`.
7. Registrar no `### Técnico` da seção: build ID, commit, versionCode, tamanho do APK e link.

O `versionCode` é incrementado automaticamente pelo EAS (`autoIncrement: true` no perfil `preview`).
