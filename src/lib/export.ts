import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';

import { formatCentsBRL, formatInvoiceMonth } from '@/lib/format';
import type { InvoiceItem } from '@/hooks/use-invoice';
import type { CloseMember } from '@/lib/closure';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function buildPdfHtml(mes: string, items: InvoiceItem[], byMember: CloseMember[], totalCentavos: number): string {
  const sections = byMember
    .map((m) => {
      const mine = items.filter((i) => i.memberId === m.memberId);
      const rows = mine
        .map(
          (i) =>
            `<tr><td>${esc(i.loja)}</td><td>${i.tipo}</td><td style="text-align:right">${formatCentsBRL(i.monthValorCentavos)}</td></tr>`,
        )
        .join('');
      return `<h2>${esc(m.nome)} — ${formatCentsBRL(m.totalCentavos)}</h2><table><tr><th>Loja</th><th>Tipo</th><th style="text-align:right">Valor</th></tr>${rows}</table>`;
    })
    .join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:sans-serif;color:#111}table{width:100%;border-collapse:collapse;margin-bottom:16px}th,td{border:1px solid #999;padding:6px;text-align:left}h1{font-size:20px}</style></head><body><h1>Fatura Familiar — ${formatInvoiceMonth(mes)}</h1><p><strong>Total: ${formatCentsBRL(totalCentavos)}</strong></p>${sections}</body></html>`;
}

export type ExcelRow = [string, string, string, string, number | string, string];

const STATUS_PT: Record<string, string> = { paga: 'Paga', a_vencer: 'A vencer', atrasada: 'Atrasada' };

/** Linhas da planilha: cabeçalho + 1 por compra (valor do mês) + total. Valores numéricos p/ somar no Excel. */
export function buildExcelRows(
  mes: string,
  items: InvoiceItem[],
  ownerNameOf: (memberId: string) => string,
  totalCentavos: number,
): ExcelRow[] {
  const rows: ExcelRow[] = [['Fatura', 'Loja', 'Dono', 'Tipo', 'Valor (R$)', 'Status']];
  for (const i of items) {
    rows.push([mes, i.loja, ownerNameOf(i.memberId), i.tipo, i.monthValorCentavos / 100, STATUS_PT[i.status] ?? i.status]);
  }
  rows.push(['', '', '', 'TOTAL', totalCentavos / 100, '']);
  return rows;
}

export async function exportExcel(
  mes: string,
  items: InvoiceItem[],
  ownerNameOf: (memberId: string) => string,
  totalCentavos: number,
): Promise<void> {
  const ws = XLSX.utils.aoa_to_sheet(buildExcelRows(mes, items, ownerNameOf, totalCentavos));
  ws['!cols'] = [{ wch: 10 }, { wch: 24 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Fatura ${mes}`);
  const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  const base = FileSystem.cacheDirectory;
  if (!base) throw new Error('Cache indisponível.');
  const uri = `${base}fatura-${mes}.xlsx`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
  await shareFile(uri, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', `Fatura ${mes}`);
}

async function shareFile(uri: string, mimeType: string, dialogTitle: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Compartilhamento indisponível.');
  try {
    await Sharing.shareAsync(uri, { mimeType, dialogTitle });
  } catch {
    await Sharing.shareAsync(uri);
  }
}

export async function exportPdf(mes: string, items: InvoiceItem[], byMember: CloseMember[], totalCentavos: number): Promise<void> {
  const html = buildPdfHtml(mes, items, byMember, totalCentavos);
  try {
    const { uri } = await Print.printToFileAsync({ html });
    await shareFile(uri, 'application/pdf', `Fatura ${mes}`);
  } catch {
    // Fallback: diálogo de impressão do sistema (permite salvar como PDF).
    await Print.printAsync({ html });
  }
}
