import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ supabase: {}, supabaseConfigured: true }));
vi.mock('expo-file-system/legacy', () => ({ cacheDirectory: null, EncodingType: { UTF8: 'utf8', Base64: 'base64' } }));
vi.mock('expo-print', () => ({}));
vi.mock('expo-sharing', () => ({}));

import { buildExcelRows } from './export';
import type { InvoiceItem } from '@/hooks/use-invoice';

const item = (over: Partial<InvoiceItem> = {}): InvoiceItem => ({
  id: 'p1',
  memberId: 'a',
  loja: 'Mercado',
  tipo: 'parcelada',
  foraCartao: false,
  qtdParcelas: 3,
  valorTotalCentavos: 10000,
  valorParcelaCentavos: 3333,
  mesInicio: '2026-10',
  ownerName: 'Ana',
  installments: [],
  paidCount: 1,
  totalCount: 3,
  monthValorCentavos: 3333,
  status: 'a_vencer',
  ...over,
});

describe('buildExcelRows', () => {
  it('cabeçalho + linhas + total numérico', () => {
    const rows = buildExcelRows('2026-10', [item()], (id) => (id === 'a' ? 'Ana' : id), 3333);
    expect(rows[0]).toEqual(['Fatura', 'Loja', 'Dono', 'Tipo', 'Valor (R$)', 'Status']);
    expect(rows[1]).toEqual(['2026-10', 'Mercado', 'Ana', 'parcelada', 33.33, 'A vencer']);
    expect(rows[rows.length - 1]).toEqual(['', '', '', 'TOTAL', 33.33, '']);
  });
});
