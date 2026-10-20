import type { User } from '../../src/entities/User';

/** A valid active user; tests override only the fields that matter to the case. */
export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: '00000000-0000-4000-8000-0000000000e1',
    nome: 'Pessoa de Teste',
    email: 'pessoa@teste.local',
    senhaHash: 'hashed:Senha-Valida-123',
    perfil: 'VISITANTE',
    ativo: true,
    criadoEm: new Date('2026-09-30T12:00:00Z'),
    atualizadoEm: new Date('2026-09-30T12:00:00Z'),
    ...overrides,
  };
}
