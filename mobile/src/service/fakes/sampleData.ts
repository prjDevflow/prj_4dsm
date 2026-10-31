import type { LoginResponse, Usuario } from '@/lib/types/auth';
import type { Health } from '@/lib/types/health';

// Same values as the examples in backend/openapi.yaml.
export const sampleHealth: Health = {
  status: 'ok',
  version: '0.1.0',
  time: '2026-10-16T12:00:00.000Z',
  db: 'up',
};

// The seed users of backend/.env.example (public, development only).
const seedUser = (id: string, nome: string, email: string, perfil: Usuario['perfil']): Usuario => ({
  id: `5eed0000-0000-4000-8000-00000000000${id}`,
  nome,
  email,
  perfil,
});

const loginResponse = (usuario: Usuario): LoginResponse => ({
  accessToken: `fake-token-${usuario.perfil.toLowerCase()}`,
  tokenType: 'Bearer',
  expiresIn: 43200,
  usuario,
});

export const sampleAdmin = seedUser('1', 'Administrador (dev)', 'admin@dev.local', 'ADMIN');
export const sampleCondomino = seedUser('2', 'Condômino (dev)', 'condomino@dev.local', 'CONDOMINO');
export const sampleVisitante = seedUser('3', 'Visitante (dev)', 'visitante@dev.local', 'VISITANTE');

export const sampleLoginResponse = loginResponse(sampleAdmin);

export const sampleLoginResponses: Record<string, { senha: string; response: LoginResponse }> = {
  'admin@dev.local': { senha: 'Admin-Dev-2026', response: sampleLoginResponse },
  'condomino@dev.local': { senha: 'Usuario-Dev-2026', response: loginResponse(sampleCondomino) },
  'visitante@dev.local': { senha: 'Usuario-Dev-2026', response: loginResponse(sampleVisitante) },
};
