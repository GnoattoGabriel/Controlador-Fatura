import { describe, expect, it } from 'vitest';

import { buildPixPayload, crc16 } from './pix';

describe('crc16 (CCITT-FALSE)', () => {
  it('bate o vetor conhecido', () => {
    // Valor de verificação padrão do CRC-16/CCITT-FALSE.
    expect(crc16('123456789')).toBe('29B1');
  });

  it('retorna sempre 4 dígitos hex maiúsculos', () => {
    expect(crc16('')).toBe('FFFF');
    expect(crc16('A')).toMatch(/^[0-9A-F]{4}$/);
  });
});

describe('buildPixPayload', () => {
  const base = { chave: 'gnoatto@exemplo.com', nome: 'Gabriel Gnoatto', cidade: 'Caxias do Sul' };

  it('tem os campos fixos do BR Code', () => {
    const p = buildPixPayload(base);
    expect(p.startsWith('000201')).toBe(true); // payload format
    expect(p).toContain('26'); // merchant account
    expect(p).toContain('br.gov.bcb.pix');
    expect(p).toContain('52040000'); // MCC
    expect(p).toContain('5303986'); // moeda BRL
    expect(p).toContain('5802BR'); // país
    expect(p).toContain('62070503***'); // txid estático
  });

  it('sem valor => não inclui o campo 54', () => {
    expect(buildPixPayload(base)).not.toContain('5405');
  });

  it('com valor => inclui o campo 54 formatado em reais', () => {
    // 12345 centavos => "123.45" (6 chars) => 5406123.45
    expect(buildPixPayload({ ...base, valorCentavos: 12345 })).toContain('5406123.45');
  });

  it('embute a chave no template 26', () => {
    const p = buildPixPayload({ ...base, chave: '11999998888' });
    // tlv('01', chave) => 01 + len(11) + chave
    expect(p).toContain('011111999998888');
  });

  it('remove acentos de nome/cidade e limita tamanho', () => {
    const p = buildPixPayload({ chave: 'x@y.com', nome: 'José da Conceição', cidade: 'São Paulo' });
    expect(p).toContain('Jose da Conceicao');
    expect(p).toContain('Sao Paulo');
    expect(p).toContain('5917Jose da Conceicao'); // campo 59 = nome (17 chars)
  });

  it('termina com 6304 + CRC coerente', () => {
    const p = buildPixPayload({ ...base, valorCentavos: 500 });
    const body = p.slice(0, -4);
    expect(body.endsWith('6304')).toBe(true);
    expect(p.slice(-4)).toBe(crc16(body));
  });

  it('aceita txid alfanumérico e rejeita inválido', () => {
    expect(buildPixPayload({ ...base, txid: 'FAT202610' })).toContain('0509FAT202610');
    expect(() => buildPixPayload({ ...base, txid: 'com-espaco' })).toThrow();
  });

  it('exige chave, nome e cidade', () => {
    expect(() => buildPixPayload({ ...base, chave: '  ' })).toThrow();
    expect(() => buildPixPayload({ ...base, nome: '' })).toThrow();
    expect(() => buildPixPayload({ ...base, cidade: '' })).toThrow();
  });

  it('rejeita valor inválido', () => {
    expect(() => buildPixPayload({ ...base, valorCentavos: -1 })).toThrow();
    expect(() => buildPixPayload({ ...base, valorCentavos: 10.5 })).toThrow();
  });
});
