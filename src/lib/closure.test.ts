import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ supabase: { rpc: vi.fn() }, supabaseConfigured: true }));

import { buildClosePushMessages, type CloseSummary } from './closure';

const summary: CloseSummary = {
  mes: '2026-10',
  totalCentavos: 8500,
  byMember: [
    { memberId: 'a', nome: 'Ana', totalCentavos: 6500 },
    { memberId: 'b', nome: 'Beto', totalCentavos: 2000 },
  ],
};

describe('buildClosePushMessages', () => {
  it('cada membro recebe só o próprio valor', () => {
    const msgs = buildClosePushMessages(
      summary,
      new Map([
        ['a', 'tok-a'],
        ['b', 'tok-b'],
      ]),
    );
    expect(msgs).toHaveLength(2);
    expect(msgs[0]).toEqual({ to: 'tok-a', title: 'Fatura out/2026 paga', body: 'Sua parte R$ 65,00 quitada.' });
    expect(msgs[1].body).toContain('R$ 20,00');
  });

  it('pula membro sem token', () => {
    const msgs = buildClosePushMessages(summary, new Map([['a', 'tok-a']]));
    expect(msgs).toHaveLength(1);
    expect(msgs[0].to).toBe('tok-a');
  });
});
