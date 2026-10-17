# 05 — Import / Export (só admin importa)

## Export

- PDF via `expo-print + sharing`; Excel (`.xlsx` via SheetJS) salvo no cache + `sharing`.
- Member exporta só o próprio; admin tudo. Recurso de registro/auditoria (realtime já sincroniza).

## Import

- Manual uma a uma.
- Bulk CSV `loja;total;parcelas;inicio;dono` com preview + validação (`document-picker`).
- XML no schema abaixo com resumo + detecção de duplicadas.

## Schema XML

```xml
<fatura mes="YYYY-MM">
  <compra loja="..." membro="..." tipo="vista|parcelada|fixa" foraCartao="true|false" totalCentavos="..." qtdParcelas="..." mesInicio="YYYY-MM">
    <parcela mes="YYYY-MM" valorCentavos="..." pago="true|false" />
  </compra>
  <totais totalCentavos="..." />
</fatura>
```
