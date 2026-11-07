import type { LoginResponse, Usuario } from '@/lib/types/auth';
import type { Health } from '@/lib/types/health';
import type { UsuarioCompleto } from '@/lib/types/users';

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

const complete = (usuario: Usuario, ativo = true): UsuarioCompleto => ({
  ...usuario,
  ativo,
  criadoEm: '2026-10-19T12:00:00.000Z',
});

// People of the fake directory: more than one page of 20, so the "load more" shows up.
const people: [string, Usuario['perfil'], boolean][] = [
  ['Ana Lima', 'CONDOMINO', true],
  ['Beatriz Rocha', 'CONDOMINO', true],
  ['Bruno Alves', 'VISITANTE', true],
  ['Carla Mendes', 'ADMIN', true],
  ['Daniel Costa', 'CONDOMINO', true],
  ['Eduarda Martins', 'VISITANTE', false],
  ['Fábio Nunes', 'CONDOMINO', true],
  ['Gabriela Dias', 'CONDOMINO', true],
  ['Heitor Ramos', 'VISITANTE', true],
  ['Isabela Freitas', 'CONDOMINO', true],
  ['João Pereira', 'VISITANTE', true],
  ['Larissa Gomes', 'CONDOMINO', false],
  ['Lucas Barbosa', 'CONDOMINO', true],
  ['Mariana Teixeira', 'VISITANTE', true],
  ['Maria Souza', 'CONDOMINO', true],
  ['Nicolas Araújo', 'CONDOMINO', true],
  ['Otávio Moreira', 'VISITANTE', true],
  ['Paula Cardoso', 'CONDOMINO', true],
  ['Rafael Correia', 'ADMIN', true],
  ['Sofia Ribeiro', 'CONDOMINO', true],
  ['Thiago Pinto', 'VISITANTE', false],
  ['Vitória Castro', 'CONDOMINO', true],
];

const emailOf = (nome: string) =>
  `${nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '.')}@email.com`;

export const sampleUsers: UsuarioCompleto[] = [
  complete(sampleAdmin),
  complete(sampleCondomino),
  complete(sampleVisitante),
  ...people.map(([nome, perfil, ativo], index) =>
    complete(
      {
        id: `7c9e6679-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
        nome,
        email: emailOf(nome),
        perfil,
      },
      ativo,
    ),
  ),
];

export const sampleLoginResponses: Record<string, { senha: string; response: LoginResponse }> = {
  'admin@dev.local': { senha: 'Admin-Dev-2026', response: sampleLoginResponse },
  'condomino@dev.local': { senha: 'Usuario-Dev-2026', response: loginResponse(sampleCondomino) },
  'visitante@dev.local': { senha: 'Usuario-Dev-2026', response: loginResponse(sampleVisitante) },
};
