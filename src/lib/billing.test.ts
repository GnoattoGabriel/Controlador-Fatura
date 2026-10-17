import { describe, expect, it } from 'vitest';

import {
  addInvoiceMonths,
  centsFromDigits,
  formatCentsInput,
  invoiceMonthForDate,
  minhaParte,
  parseBRLToCents,
  splitInstallments,
  summarizeInvoice,
  type InstallmentRow,
  type PurchaseRow,
} from './billing';

describe('splitInstallments', () => {
  it('divide exato sem resto', () => {
    expect(splitInstallments(9000, 3)).toEqual([3000, 3000, 3000]);
  });

  it('joga o resto na última parcela', () => {
    expect(splitInstallments(10000, 3)).toEqual([3333, 3333, 3334]);
  });

  it('1x retorna o total', () => {
    expect(splitInstallments(5599, 1)).toEqual([5599]);
  });

  it('soma das parcelas == total (48x)', () => {
    const parts = splitInstallments(100000, 48);
    expect(parts).toHaveLength(48);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(100000);
    expect(parts[47]).toBeGreaterThanOrEqual(parts[0]);
  });

  it('rejeita fora do domínio', () => {
    expect(() => splitInstallments(-1, 3)).toThrow();
    expect(() => splitInstallments(100, 0)).toThrow();
    expect(() => splitInstallments(100, 49)).toThrow();
    expect(() => splitInstallments(10.5, 2)).toThrow();
  });
});

describe('parseBRLToCents', () => {
  it('converte formatos BR', () => {
    expect(parseBRLToCents('123,45')).toBe(12345);
    expect(parseBRLToCents('1.234,56')).toBe(123456);
    expect(parseBRLToCents('100')).toBe(10000);
    expect(parseBRLToCents('0,99')).toBe(99);
  });

  it('rejeita inválidos', () => {
    expect(() => parseBRLToCents('')).toThrow();
    expect(() => parseBRLToCents('abc')).toThrow();
    expect(() => parseBRLToCents('0')).toThrow();
    expect(() => parseBRLToCents('-5')).toThrow();
  });
});

describe('máscara de moeda (centavos-primeiro)', () => {
  it('cada dígito entra nos centavos', () => {
    expect(centsFromDigits('5')).toBe(5); // R$ 0,05
    expect(centsFromDigits('50')).toBe(50); // R$ 0,50
    expect(centsFromDigits('500')).toBe(500); // R$ 5,00 (não R$ 500)
    expect(centsFromDigits('50000')).toBe(50000); // R$ 500,00
  });

  it('ignora caracteres não-numéricos', () => {
    expect(centsFromDigits('R$ 1.234,56')).toBe(123456);
    expect(centsFromDigits('abc')).toBe(0);
    expect(centsFromDigits('')).toBe(0);
  });

  it('formata para exibição sem "R$"', () => {
    expect(formatCentsInput(0)).toBe('0,00');
    expect(formatCentsInput(5)).toBe('0,05');
    expect(formatCentsInput(500)).toBe('5,00');
    expect(formatCentsInput(123456)).toBe('1.234,56');
  });

  it('round-trip dígitos → centavos → texto', () => {
    for (const d of ['500', '12345', '999999']) {
      expect(centsFromDigits(formatCentsInput(centsFromDigits(d)))).toBe(centsFromDigits(d));
    }
  });
});

describe('addInvoiceMonths', () => {
  it('soma dentro do ano', () => {
    expect(addInvoiceMonths('2026-10', 2)).toBe('2026-12');
  });

  it('vira o ano', () => {
    expect(addInvoiceMonths('2026-11', 2)).toBe('2027-01');
  });

  it('k=0 identidade', () => {
    expect(addInvoiceMonths('2026-05', 0)).toBe('2026-05');
  });

  it('k negativo volta meses (chips da lista)', () => {
    expect(addInvoiceMonths('2026-10', -4)).toBe('2026-06');
    expect(addInvoiceMonths('2026-01', -1)).toBe('2025-12');
  });

  it('rejeita mês inválido', () => {
    expect(() => addInvoiceMonths('2026-13', 1)).toThrow();
    expect(() => addInvoiceMonths('outubro', 1)).toThrow();
  });
});

describe('invoiceMonthForDate (fatura MM = dia 5/MM a 4/MM+1)', () => {
  it('dia 4 cai na fatura do mês anterior', () => {
    expect(invoiceMonthForDate(new Date(2026, 9, 4))).toBe('2026-09');
  });

  it('dia 5 cai na fatura do mês atual', () => {
    expect(invoiceMonthForDate(new Date(2026, 9, 5))).toBe('2026-10');
  });

  it('dia 15 cai na fatura do mês atual', () => {
    expect(invoiceMonthForDate(new Date(2026, 9, 15))).toBe('2026-10');
  });

  it('dia 4/jan cai na fatura de dezembro', () => {
    expect(invoiceMonthForDate(new Date(2026, 0, 4))).toBe('2025-12');
  });

  it('20/dez cai na fatura de dezembro', () => {
    expect(invoiceMonthForDate(new Date(2026, 11, 20))).toBe('2026-12');
  });
});

describe('minhaParte', () => {
  const purchases: PurchaseRow[] = [
    { tipo: 'vista', mes_inicio: '2026-10', valor_total_centavos: 5000, ativa: true },
    { tipo: 'vista', mes_inicio: '2026-09', valor_total_centavos: 9999, ativa: true },
    { tipo: 'fixa', mes_inicio: '2026-08', valor_total_centavos: 2000, ativa: true },
    { tipo: 'fixa', mes_inicio: '2026-10', valor_total_centavos: 777, ativa: false },
    { tipo: 'fixa', mes_inicio: '2026-11', valor_total_centavos: 100, ativa: true },
  ];
  const installments: InstallmentRow[] = [
    { mes: '2026-10', valor_centavos: 3333 },
    { mes: '2026-11', valor_centavos: 3334 },
  ];

  it('soma vistas + parcelas vincendas + fixas ativas', () => {
    // 5000 (vista out) + 3333 (parcela out) + 2000 (fixa ativa) = 10333
    expect(minhaParte('2026-10', purchases, installments)).toBe(10333);
  });

  it('fixa futura não entra; parcela futura não entra', () => {
    // 0 vista + 3334 parcela + 2000 fixa + 100 fixa iniciando em nov = 5434
    expect(minhaParte('2026-11', purchases, installments)).toBe(5434);
  });
});

describe('summarizeInvoice', () => {
  it('total geral + por membro ordenado', () => {
    const r = summarizeInvoice([
      { memberId: 'a', ownerName: 'Ana', monthValorCentavos: 5000 },
      { memberId: 'b', ownerName: 'Beto', monthValorCentavos: 2000 },
      { memberId: 'a', ownerName: 'Ana', monthValorCentavos: 1500 },
    ]);
    expect(r.totalCentavos).toBe(8500);
    expect(r.byMember).toEqual([
      { memberId: 'a', nome: 'Ana', totalCentavos: 6500 },
      { memberId: 'b', nome: 'Beto', totalCentavos: 2000 },
    ]);
  });

  it('lista vazia zera tudo', () => {
    expect(summarizeInvoice([])).toEqual({ totalCentavos: 0, byMember: [] });
  });
});
