import { create } from 'zustand';

import { supabase } from '@/lib/supabase';

export type Role = 'admin' | 'member';

export interface Profile {
  id: string;
  nome: string;
  role: Role;
}

type Status = 'loading' | 'signed-out' | 'locked' | 'ready';

interface AuthState {
  status: Status;
  profile: Profile | null;
  authError: string | null;
  init: () => Promise<() => void>;
  signInEmail: (email: string, password: string) => Promise<void>;
  sendMagicLink: (email: string, redirectTo: string) => Promise<boolean>;
  unlock: () => void;
  lock: () => void;
  signOut: () => Promise<void>;
  clearError: () => void;
}

async function loadProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase.from('profiles').select('id,nome,role').eq('id', userId).maybeSingle();
  if (!data) return null;
  return data as Profile;
}

export const useAuth = create<AuthState>()((set) => ({
  status: 'loading',
  profile: null,
  authError: null,

  init: async () => {
    const sync = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        set({ status: 'signed-out', profile: null });
        return;
      }
      const profile = await loadProfile(session.user.id);
      if (!profile) {
        await supabase.auth.signOut();
        set({ status: 'signed-out', profile: null, authError: 'Usuário sem perfil. Peça ao admin para cadastrar.' });
        return;
      }
      set({ status: 'locked', profile, authError: null });
    };
    await sync();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) set({ status: 'signed-out', profile: null });
      else void sync();
    });
    return () => subscription.unsubscribe();
  },

  signInEmail: async (email, password) => {
    set({ authError: null });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) set({ authError: error.message });
  },

  sendMagicLink: async (email, redirectTo) => {
    set({ authError: null });
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
    if (error) {
      set({ authError: error.message });
      return false;
    }
    return true;
  },

  unlock: () => set({ status: 'ready' }),
  lock: () => set((s) => (s.profile ? { status: 'locked' } : s)),
  signOut: async () => {
    await supabase.auth.signOut();
    set({ status: 'signed-out', profile: null });
  },
  clearError: () => set({ authError: null }),
}));
