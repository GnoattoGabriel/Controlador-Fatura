export const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function formatCentsBRL(cents: number): string {
  return brl.format(cents / 100);
}

const MES_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'] as const;

export function formatInvoiceMonth(mes: string): string {
  const m = Number(mes.slice(5, 7));
  if (!Number.isInteger(m) || m < 1 || m > 12) return mes;
  return `${MES_PT[m - 1]}/${mes.slice(0, 4)}`;
}
