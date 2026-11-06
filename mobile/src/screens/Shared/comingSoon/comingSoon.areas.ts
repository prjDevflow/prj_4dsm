import type { Href } from 'expo-router';
import type { IconName } from '@/components/Icon';

export type ComingSoonArea = {
  title: string;
  step: string;
  icon: IconName;
  admin: boolean;
  /** Overrides "Esta tela chega na etapa…" when part of the area already exists. */
  message?: string;
  /** A screen of the area that already exists, offered while the rest does not. */
  action?: { label: string; href: Href };
};

// Screens that the home already links to and that arrive in later steps.
const areas: Record<string, ComingSoonArea> = {
  catraca: { title: 'Abrir catraca', step: 'F10', icon: 'qr_code_scanner', admin: false },
  'minhas-autorizacoes': {
    title: 'Minhas autorizações',
    step: 'F09',
    icon: 'confirmation_number',
    admin: false,
  },
  'meu-historico': { title: 'Meu histórico', step: 'F12', icon: 'history', admin: false },
  autorizacoes: {
    title: 'Autorizações',
    step: 'F08',
    icon: 'confirmation_number',
    admin: true,
    message: 'A lista chega na etapa F08 do app.',
    action: { label: 'Nova autorização', href: '/admin/authorizations/new' },
  },
  tags: { title: 'Tags NFC', step: 'F13', icon: 'nfc', admin: true },
  historico: { title: 'Histórico', step: 'F12', icon: 'history', admin: true },
};

export const comingSoonArea = (area: string): ComingSoonArea | null => areas[area] ?? null;
