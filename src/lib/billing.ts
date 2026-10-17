// Regra de divisão (Sprint 4) — puro, sem UI, sem Supabase.
// Decisões Sprint 0: corte dia 5, fixas até pausar, pago híbrido.
// Dinheiro sempre em centavos INTEGER; formato BRL só na UI (ver format.ts).

export type TipoCompra = 'vista' | 'parcelada' | 'fixa';

export interface PurchaseRow {
  tipo: TipoCompra;
  mes_inicio: string; // mês da FATURA (YYYY-MM), corte dia 5 já aplicado
  valor_total_centavos: number;
  ativa: boolean;
}

export interface InstallmentRow {
  mes: string; // YYYY-MM
  valor_centavos: number;
}

const MES_RE = /^[0-9]{4}-(0[1-9]|1[0-2])$/;

function assertMes(mes: string): void {
  if (!MES_RE.test(mes)) throw new Error(`Mês inválido (esperado YYYY-MM): ${mes}`);
}

/** Divide total em n parcelas: floor em todas, resto na última. */
export function splitInstallments(totalCentavos: number, n: number): number[] {
  if (!Number.isInteger(totalCentavos) || totalCentavos < 0) {
    throw new Error(`Total inválido: ${totalCentavos}`);
  }
  if (!Number.isInteger(n) || n < 1 || n > 48) {
    throw new Error(`Parcelas inválidas (1–48): ${n}`);
  }
  const base = Math.floor(totalCentavos / n);
  const out = new Array<number>(n).fill(base);
  out[n - 1] += totalCentavos - base * n;
  return out;
}

/** Soma k meses a um YYYY-MM (k pode ser negativo, p/ navegar p/ trás). */
export function addInvoiceMonths(mes: string, k: number): string {
  assertMes(mes);
  if (!Number.isInteger(k)) throw new Error(`k inválido: ${k}`);
  const year = Number(mes.slice(0, 4));
  const month = Number(mes.slice(5, 7)); // 1–12
  const total = year * 12 + (month - 1) + k;
  const y = Math.floor(total / 12);
  const m = ((total % 12) + 12) % 12 + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

/** Mês da fatura para uma data de compra: fatura MM cobre dia 5/MM até dia 4/MM+1.
 * Dia 1–4 cai na fatura do mês anterior; dia 5+ no mês atual. Fecha dia 5 do mês seguinte. */
export function invoiceMonthForDate(d: Date): string {
  const base = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return d.getDate() >= 5 ? base : addInvoiceMonths(base, -1);
}

/** Converte texto BRL ("1.234,56" ou "123,45" ou "100") em centavos. */
export function parseBRLToCents(text: string): number {
  const clean = text.trim().replace(/\s/g, '');
  if (!clean) throw new Error('Valor vazio.');
  const normalized = clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`Valor inválido: ${text}`);
  return Math.round(value * 100);
}

/**
 * Máscara de entrada de moeda (centavos-primeiro): cada dígito digitado entra nos
 * CENTAVOS, eliminando a ambiguidade "500" = R$ 5,00 (e não R$ 500 → digita "50000").
 * Ignora qualquer caractere não-numérico. `"500"` → 500; `"50000"` → 50000.
 */
export function centsFromDigits(input: string): number {
  const digits = input.replace(/\D/g, '').slice(0, 12); // teto ~ R$ 9.999.999.999,99
  if (!digits) return 0;
  return Number(digits);
}

/** Formata centavos para exibição dentro do input, sem "R$": `500` → "5,00". */
export function formatCentsInput(cents: number): string {
  const safe = Number.isFinite(cents) && cents > 0 ? Math.floor(cents) : 0;
  const reais = String(Math.floor(safe / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const cent = String(safe % 100).padStart(2, '0');
  return `${reais},${cent}`;
}

/**
 * minhaParte(mes) = vistas(mes) + parcelas vincendas + fixas ativas.
 * - vistas: tipo=vista com mes_inicio == mes.
 * - parcelas: installments (só de parceladas) com mes == mes.
 * - fixas: tipo=fixa, ativa, mes_inicio <= mes (não materializa installment rows).
 */
export function minhaParte(mes: string, purchases: PurchaseRow[], installments: InstallmentRow[]): number {
  assertMes(mes);
  let total = 0;
  for (const p of purchases) {
    assertMes(p.mes_inicio);
    if (p.tipo === 'vista' && p.mes_inicio === mes) total += p.valor_total_centavos;
    if (p.tipo === 'fixa' && p.ativa && p.mes_inicio <= mes) total += p.valor_total_centavos;
  }
  for (const i of installments) {
    assertMes(i.mes);
    if (i.mes === mes) total += i.valor_centavos;
  }
  return total;
}

export interface BillableEntry {
  memberId: string;
  ownerName: string | null;
  monthValorCentavos: number;
}

export interface MemberTotal {
  memberId: string;
  nome: string;
  totalCentavos: number;
}

/** Calculadora de totais da fatura: total geral + por membro (ordem decrescente). */
export function summarizeInvoice(entries: BillableEntry[]): { totalCentavos: number; byMember: MemberTotal[] } {
  const map = new Map<string, MemberTotal>();
  let total = 0;
  for (const e of entries) {
    total += e.monthValorCentavos;
    const cur = map.get(e.memberId) ?? { memberId: e.memberId, nome: e.ownerName ?? 'Sem nome', totalCentavos: 0 };
    if (e.ownerName) cur.nome = e.ownerName;
    cur.totalCentavos += e.monthValorCentavos;
    map.set(e.memberId, cur);
  }
  return { totalCentavos: total, byMember: [...map.values()].sort((a, b) => b.totalCentavos - a.totalCentavos) };
}
