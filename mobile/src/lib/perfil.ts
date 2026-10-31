import type { Perfil } from './types/auth';

const labels: Record<Perfil, string> = {
  ADMIN: 'Administrador',
  CONDOMINO: 'Condômino',
  VISITANTE: 'Visitante',
};

/** How the profile appears on screen ("Condômino", never "CONDOMINO"). */
export const perfilLabel = (perfil: Perfil) => labels[perfil];

/** "Maria Souza" → "Maria", for greetings. */
export const firstName = (nome: string) => nome.trim().split(/\s+/)[0] ?? '';
