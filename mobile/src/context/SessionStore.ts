import { create } from 'zustand';
import type { Usuario } from '@/lib/types/auth';
import { tokenStorage } from './tokenStorage';

type SessionStore = {
  token: string | null;
  usuario: Usuario | null;
  expired: boolean;
  signIn: (token: string, usuario: Usuario) => Promise<void>;
  setUsuario: (usuario: Usuario) => void;
  signOut: () => Promise<void>;
  expireSession: () => void;
};

export const useSessionStore = create<SessionStore>()((set) => ({
  token: null,
  usuario: null,
  expired: false,
  signIn: async (token, usuario) => {
    await tokenStorage.save(token);
    set({ token, usuario, expired: false });
  },
  setUsuario: (usuario) => set({ usuario }),
  signOut: async () => {
    await tokenStorage.clear();
    set({ token: null, usuario: null, expired: false });
  },
  expireSession: () => {
    void tokenStorage.clear();
    set({ token: null, usuario: null, expired: true });
  },
}));
