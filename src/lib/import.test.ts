import { describe, expect, it } from 'vitest';

import { parseImportCsv, parseImportXml } from './import';

describe('parseImportCsv', () => {
  it('linha válida vira vista ou parcelada', () => {
    const r = parseImportCsv('Mercado;123,45;1;2026-10;Ana\nLoja;200;3;2026-10;Beto');
    expect(r.issues).toEqual([]);
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0]).toMatchObject({ loja: 'Mercado', tipo: 'vista', totalCentavos: 12345, qtdParcelas: 1 });
    expect(r.rows[1]).toMatchObject({ loja: 'Loja', tipo: 'parcelada', qtdParcelas: 3 });
  });

  it('aponta erros por linha sem abortar o resto', () => {
    const r = parseImportCsv('Ok;10;1;2026-10;Ana\nRuim;xx;1;2026-10;Ana\n;10;1;2026-10;Ana');
    expect(r.rows).toHaveLength(1);
    expect(r.issues).toHaveLength(2);
  });
});

describe('parseImportXml', () => {
  const xml = `<?xml version="1.0"?><fatura mes="2026-10"><compra loja="Mercado" membro="Ana" tipo="parcelada" foraCartao="false" totalCentavos="10000" qtdParcelas="2" mesInicio="2026-10"><parcela mes="2026-10" valorCentavos="5000" pago="true"/><parcela mes="2026-11" valorCentavos="5000" pago="false"/></compra><totais totalCentavos="10000"/></fatura>`;

  it('lê compra com parcelas e pagos', () => {
    const r = parseImportXml(xml);
    expect(r.issues).toEqual([]);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].parcelas).toEqual([
      { mes: '2026-10', valorCentavos: 5000, pago: true },
      { mes: '2026-11', valorCentavos: 5000, pago: false },
    ]);
  });

  it('rejeita tipo inválido e arquivo sem fatura', () => {
    const r = parseImportXml(xml.replace('parcelada', 'x12'));
    expect(r.rows).toHaveLength(0);
    expect(r.issues).toHaveLength(1);
    expect(parseImportXml('<nada/>').issues).toHaveLength(1);
  });
});
