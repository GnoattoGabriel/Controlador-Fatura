import { supabase } from '@/lib/supabase';
import type { Role } from '@/stores/auth';

// Config de recebimento do Pix (tabela singleton app_settings, migration 0003).
// Leitura: qualquer autenticado (o member precisa da chave para montar o BR Code).
// Escrita: só admin (RLS impõe; requireAdmin é a defesa no cliente).

export interface PixSettings {
  chave: string;
  nome: string;
  cidade: string;
}

export const EMPTY_PIX_SETTINGS: PixSettings = { chave: '', nome: '', cidade: '' };

interface SettingsRow {
  pix_chave: string | null;
  pix_nome: string | null;
  pix_cidade: string | null;
}

/** Lê a config de Pix (linha única id=1). */
export async function fetchPixSettings(): Promise<PixSettings> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('pix_chave,pix_nome,pix_cidade')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { ...EMPTY_PIX_SETTINGS };
  const row = data as SettingsRow;
  return {
    chave: row.pix_chave ?? '',
    nome: row.pix_nome ?? '',
    cidade: row.pix_cidade ?? '',
  };
}

/** Salva a config de Pix. Só admin. */
export async function savePixSettings(role: Role, settings: PixSettings): Promise<void> {
  if (role !== 'admin') throw new Error('Somente admin pode alterar.');
  const { error } = await supabase
    .from('app_settings')
    .update({
      pix_chave: settings.chave.trim(),
      pix_nome: settings.nome.trim(),
      pix_cidade: settings.cidade.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1);
  if (error) throw new Error(error.message);
}

/** Config pronta para gerar QR? (chave + nome + cidade preenchidos) */
export function isPixConfigured(settings: PixSettings): boolean {
  return settings.chave.trim() !== '' && settings.nome.trim() !== '' && settings.cidade.trim() !== '';
}
