# Changelog

Todas as mudanças relevantes do **Fatura Familiar** são documentadas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e
[SemVer](https://semver.org/lang/pt-BR/).

## [1.0.0] - 2026-10-17

### Adicionado
- **Pix estático (BR Code)**: gerador do "Copia e Cola" com CRC16/CCITT-FALSE (`src/lib/pix.ts`) + testes.
- Máscara de entrada de moeda centavos-primeiro (`centsFromDigits` / `formatCentsInput`) — `500` = R$ 5,00, `50000` = R$ 500,00 — + testes.
- Migration `0003_pix.sql`: tabela `app_settings` (chave do recebedor; leitura para todo autenticado, escrita só admin).
- `PayModal` em duas etapas: confirma o valor (total + "quanto quero pagar" com botões +R$10/+R$20/+R$50) e só então mostra o QR + Pix Copia e Cola + Copiar/Compartilhar.
- `CurrencyInput` (máscara), `QrCode` (grade de `View`s — sem `react-native-svg`) e `PixSettingsModal` (chave, nome, cidade + prévia do QR).
- Seção **Conta › Pix** para o admin configurar a chave.
- Gatilho "Cobrar no Pix" no card de total do admin (usa o total do membro filtrado, se houver).

### Alterado
- O modal de pagamento deixa de ser um QR ilustrativo e passa a gerar um Pix de verdade (BR Code estático).

### Notas
- O QR é montado no aparelho de quem paga, com o valor escolhido; só a chave é persistida.
- Member sem chave cadastrada vê aviso pedindo para o admin configurar em Conta › Pix.
- `versionName` interno passa a bater com a tag (o build de 0.1.0 reportava `1.0.0` por ter sido feito antes da adoção do SemVer).

### Técnico
- Build EAS / versionCode / tamanho do APK: a registrar após o build desta versão.

<!-- Links de comparação (adicionar conforme novas tags):
[1.0.0]: https://github.com/GnoattoGabriel/Controlador-Fatura/compare/v0.1.0...v1.0.0
-->

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
