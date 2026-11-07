import type { IconName } from '@/components/Icon';

export type ComingSoonArea = { title: string; step: string; icon: IconName; admin: boolean };

// Screens that the home already links to and that arrive in later steps.
const areas: Record<string, ComingSoonArea> = {
  'meu-historico': { title: 'Meu histórico', step: 'F12', icon: 'history', admin: false },
  tags: { title: 'Tags NFC', step: 'F13', icon: 'nfc', admin: true },
  historico: { title: 'Histórico', step: 'F12', icon: 'history', admin: true },
};

export const comingSoonArea = (area: string): ComingSoonArea | null => areas[area] ?? null;
