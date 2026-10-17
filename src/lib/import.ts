import { parseBRLToCents } from '@/lib/billing';
import type { TipoCompra } from '@/lib/billing';

export interface ImportParcela {
  mes: string;
  valorCentavos: number;
  pago: boolean;
}

export interface ImportRow {
  loja: string;
  dono: string;
  tipo: TipoCompra;
  totalCentavos: number;
  qtdParcelas: number;
  mesInicio: string;
  parcelas: ImportParcela[];
}

export interface ImportIssue {
  ref: string;
  error: string;
}

export interface ImportParsed {
  rows: ImportRow[];
  issues: ImportIssue[];
}

const MES_RE = /^[0-9]{4}-(0[1-9]|1[0-2])$/;

function checkMes(mes: string, ref: string, issues: ImportIssue[]): boolean {
  if (!MES_RE.test(mes)) {
    issues.push({ ref, error: `Mês inválido: ${mes}` });
    return false;
  }
  return true;
}

function checkTipo(tipo: string, ref: string, issues: ImportIssue[]): tipo is TipoCompra {
  if (tipo !== 'vista' && tipo !== 'parcelada' && tipo !== 'fixa') {
    issues.push({ ref, error: `Tipo inválido: ${tipo}` });
    return false;
  }
  return true;
}

/** CSV `loja;total;parcelas;inicio;dono` — tipo inferido (1x vista, >1 parcelada). */
export function parseImportCsv(text: string): ImportParsed {
  const rows: ImportRow[] = [];
  const issues: ImportIssue[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  lines.forEach((line, idx) => {
    const ref = `linha ${idx + 1}`;
    const parts = line.split(';').map((p) => p.trim());
    if (parts.length !== 5) {
      issues.push({ ref, error: `Esperado 5 campos (loja;total;parcelas;inicio;dono), achei ${parts.length}.` });
      return;
    }
    const [loja, totalRaw, qtdRaw, inicio, dono] = parts;
    if (!loja) {
      issues.push({ ref, error: 'Loja vazia.' });
      return;
    }
    if (!dono) {
      issues.push({ ref, error: 'Dono vazio.' });
      return;
    }
    let totalCentavos = 0;
    try {
      totalCentavos = parseBRLToCents(totalRaw);
    } catch {
      issues.push({ ref, error: `Total inválido: ${totalRaw}` });
      return;
    }
    const qtd = Number(qtdRaw);
    if (!Number.isInteger(qtd) || qtd < 1 || qtd > 48) {
      issues.push({ ref, error: `Parcelas inválidas (1–48): ${qtdRaw}` });
      return;
    }
    if (!checkMes(inicio, ref, issues)) return;
    rows.push({
      loja,
      dono,
      tipo: qtd > 1 ? 'parcelada' : 'vista',
      totalCentavos,
      qtdParcelas: qtd,
      mesInicio: inicio,
      parcelas: [],
    });
  });
  return { rows, issues };
}

function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /(\w+)="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tag)) !== null) out[m[1]] = m[2];
  return out;
}

/** XML no schema do export (sem categoria). */
export function parseImportXml(text: string): ImportParsed {
  const rows: ImportRow[] = [];
  const issues: ImportIssue[] = [];
  const faturaMatch = text.match(/<fatura\b[^>]*>/);
  if (!faturaMatch) {
    return { rows, issues: [{ ref: 'arquivo', error: 'Tag <fatura> não encontrada.' }] };
  }
  const compraRe = /<compra\b([^>]*)>([\s\S]*?)<\/compra>/g;
  let m: RegExpExecArray | null;
  let idx = 0;
  let found = false;
  while ((m = compraRe.exec(text)) !== null) {
    found = true;
    idx += 1;
    const ref = `compra ${idx}`;
    const a = attrs(m[1]);
    const loja = (a.loja ?? '').trim();
    const dono = (a.membro ?? '').trim();
    const tipo = (a.tipo ?? '').trim();
    const mesInicio = (a.mesInicio ?? '').trim();
    if (!loja) {
      issues.push({ ref, error: 'Loja vazia.' });
      continue;
    }
    if (!dono) {
      issues.push({ ref, error: 'Dono vazio.' });
      continue;
    }
    if (!checkTipo(tipo, ref, issues)) continue;
    if (!checkMes(mesInicio, ref, issues)) continue;
    const totalCentavos = Number(a.totalCentavos ?? '');
    if (!Number.isInteger(totalCentavos) || totalCentavos <= 0) {
      issues.push({ ref, error: `totalCentavos inválido: ${a.totalCentavos ?? ''}` });
      continue;
    }
    const qtdParcelas = Number(a.qtdParcelas ?? '1');
    if (!Number.isInteger(qtdParcelas) || qtdParcelas < 1 || qtdParcelas > 48) {
      issues.push({ ref, error: `qtdParcelas inválida: ${a.qtdParcelas ?? ''}` });
      continue;
    }
    const parcelas: ImportParcela[] = [];
    let badParcela = false;
    const parcelaRe = /<parcela\b([^>]*)\/>/g;
    let pm: RegExpExecArray | null;
    while ((pm = parcelaRe.exec(m[2])) !== null) {
      const pa = attrs(pm[1]);
      const valor = Number(pa.valorCentavos ?? '');
      if (!MES_RE.test(pa.mes ?? '') || !Number.isInteger(valor) || valor < 0) {
        issues.push({ ref, error: `Parcela inválida: ${pm[1].trim()}` });
        badParcela = true;
        break;
      }
      parcelas.push({ mes: pa.mes, valorCentavos: valor, pago: pa.pago === 'true' });
    }
    if (badParcela) continue;
    rows.push({ loja, dono, tipo, totalCentavos, qtdParcelas, mesInicio, parcelas });
  }
  if (!found) issues.push({ ref: 'arquivo', error: 'Nenhuma <compra> encontrada.' });
  return { rows, issues };
}
