import { describe, expect, it, vi } from 'vitest';

// Só testamos a regra pura aqui; as chamadas de rede não são exercitadas.
vi.mock('@/lib/supabase', () => ({ supabase: {}, supabaseConfigured: true }));

import { isPixConfigured } from './settings';

describe('isPixConfigured', () => {
  const base = { chave: 'gnoatto@exemplo.com', nome: 'Gabriel Gnoatto', cidade: 'Caxias do Sul' };

  it('exige chave + nome + cidade', () => {
    expect(isPixConfigured(base)).toBe(true);
  });

  it('rejeita campo em branco', () => {
    expect(isPixConfigured({ ...base, chave: '' })).toBe(false);
    expect(isPixConfigured({ ...base, nome: '' })).toBe(false);
    expect(isPixConfigured({ ...base, cidade: '' })).toBe(false);
  });

  it('rejeita só espaços', () => {
    expect(isPixConfigured({ ...base, chave: '   ' })).toBe(false);
  });
});
