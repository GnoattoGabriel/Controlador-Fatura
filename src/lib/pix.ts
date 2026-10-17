// Pix BR Code estático (EMV® QRCPS-MPM) — puro, sem UI/rede/Supabase.
// Gera a string "Copia e Cola" a partir da chave do recebedor + valor.
// Sem valor => o pagador digita no app do banco.

export interface PixParams {
  /** Chave Pix do recebedor (CPF/CNPJ, e-mail, telefone ou chave aleatória). */
  chave: string;
  /** Nome do recebedor (máx. 25 chars, acentos removidos). */
  nome: string;
  /** Cidade do recebedor (máx. 15 chars, acentos removidos). */
  cidade: string;
  /** Valor em centavos. Ausente/0 => QR sem valor fixo. */
  valorCentavos?: number;
  /** Referência (txid). Alfanumérico até 25 chars. Padrão "***" (estático). */
  txid?: string;
  /** Descrição opcional (máx. 40 chars). */
  descricao?: string;
}

const MAX_NOME = 25;
const MAX_CIDADE = 15;
const MAX_DESC = 40;
const TXID_RE = /^[A-Za-z0-9]{1,25}$/;

/** Monta um campo EMV (id + tamanho com 2 dígitos + valor). */
function tlv(id: string, value: string): string {
  const len = value.length;
  if (len > 99) throw new Error(`Campo ${id} excede 99 caracteres (${len}).`);
  return `${id}${String(len).padStart(2, '0')}${value}`;
}

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function clamp(s: string, max: number): string {
  return stripAccents(s.trim()).slice(0, max);
}

/**
 * CRC16/CCITT-FALSE (poly 0x1021, init 0xFFFF, sem reflexão, xorout 0).
 * Vetor conhecido: crc16("123456789") === "29B1".
 */
export function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function normalizeTxid(txid: string | undefined): string {
  const t = (txid ?? '***').trim();
  if (t === '' || t === '***') return '***';
  if (!TXID_RE.test(t)) throw new Error(`txid inválido (alfanumérico, até 25): ${txid}`);
  return t;
}

/** Gera a string do BR Code (Pix Copia e Cola) pronta para virar QR. */
export function buildPixPayload(params: PixParams): string {
  const chave = params.chave.trim();
  if (!chave) throw new Error('Chave Pix obrigatória.');

  const nome = clamp(params.nome, MAX_NOME);
  const cidade = clamp(params.cidade, MAX_CIDADE);
  if (!nome) throw new Error('Nome do recebedor obrigatório.');
  if (!cidade) throw new Error('Cidade do recebedor obrigatória.');

  const merchantAccount = tlv(
    '26',
    tlv('00', 'br.gov.bcb.pix') +
      tlv('01', chave) +
      (params.descricao ? tlv('02', clamp(params.descricao, MAX_DESC)) : ''),
  );

  const valor = params.valorCentavos ?? 0;
  if (!Number.isInteger(valor) || valor < 0) throw new Error(`Valor inválido: ${params.valorCentavos}`);
  const amountField = valor > 0 ? tlv('54', (valor / 100).toFixed(2)) : '';

  const additional = tlv('62', tlv('05', normalizeTxid(params.txid)));

  const partial =
    tlv('00', '01') +
    merchantAccount +
    tlv('52', '0000') +
    tlv('53', '986') +
    amountField +
    tlv('58', 'BR') +
    tlv('59', nome) +
    tlv('60', cidade) +
    additional +
    '6304';

  return partial + crc16(partial);
}
