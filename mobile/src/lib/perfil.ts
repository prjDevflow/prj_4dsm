import type { Perfil } from './types/auth';

const labels: Record<Perfil, string> = {
  ADMIN: 'Administrador',
  CONDOMINO: 'Condômino',
  VISITANTE: 'Visitante',
};

/** How the profile appears on screen ("Condômino", never "CONDOMINO"). */
export const perfilLabel = (perfil: Perfil) => labels[perfil];

/** "Maria Souza" → "MS": first and last word, letters only ("Administrador (dev)" → "AD"). */
export const initials = (nome: string) => {
  const words = nome
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}]/gu, ''))
    .filter(Boolean);
  if (words.length === 0) return '';
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (words[0][0] + last).toUpperCase();
};

/** "Maria Souza" → "Maria", for greetings. */
export const firstName = (nome: string) => nome.trim().split(/\s+/)[0] ?? '';
