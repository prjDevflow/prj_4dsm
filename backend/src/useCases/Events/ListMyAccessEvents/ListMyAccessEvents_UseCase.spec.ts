import { describe, expect, it } from 'vitest';
import {
  InMemoryAccessEventRepository,
  type EventLookups,
} from '../../../../test/doubles/InMemoryAccessEventRepository';
import { InMemoryAccessPointRepository } from '../../../../test/doubles/InMemoryAccessPointRepository';
import { InMemoryBuildingRepository } from '../../../../test/doubles/InMemoryBuildingRepository';
import { InMemoryTerminalRepository } from '../../../../test/doubles/InMemoryTerminalRepository';
import { InMemoryUserRepository } from '../../../../test/doubles/InMemoryUserRepository';
import { makeAccessEvent } from '../../../../test/factories/makeAccessEvent';
import { makeUser } from '../../../../test/factories/makeUser';
import type { IListMyAccessEventsDTO } from './ListMyAccessEvents_DTO';
import { ListMyAccessEventsUseCase } from './ListMyAccessEvents_UseCase';

const idOf = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const MARIA = makeUser({ id: idOf(2), nome: 'Maria Souza', email: 'maria@teste.local' });
const JOAO = makeUser({ id: idOf(3), nome: 'João Alves', email: 'joao@teste.local' });

const query = (overrides: Partial<IListMyAccessEventsDTO> = {}): IListMyAccessEventsDTO => ({
  page: 1,
  pageSize: 20,
  ...overrides,
});

const makeSut = async () => {
  const lookups: EventLookups = {
    users: new InMemoryUserRepository(),
    accessPoints: new InMemoryAccessPointRepository(),
    buildings: new InMemoryBuildingRepository(),
    terminals: new InMemoryTerminalRepository(),
  };
  for (const user of [MARIA, JOAO]) await lookups.users.save(user);
  const events = new InMemoryAccessEventRepository(lookups);
  let next = 100;
  const add = async (overrides: Parameters<typeof makeAccessEvent>[0] = {}) => {
    const id = idOf(next++);
    await events.append(makeAccessEvent({ id, usuarioId: MARIA.id, ...overrides }));
    return id;
  };
  const sut = new ListMyAccessEventsUseCase(events);
  const idsOf = async (userId: string, input = query()) =>
    (await sut.execute(userId, input)).data.map((item) => item.id);
  return { sut, add, idsOf, events };
};

describe('ListMyAccessEvents', () => {
  it.todo('deve ignorar um usuarioId que venha na query');
  it.todo('deve aplicar os demais filtros só dentro dos eventos do usuário');
  it.todo('deve paginar e informar o total');

  it('deve devolver só os eventos do usuário do token', async () => {
    const { add, idsOf } = await makeSut();
    const mine = await add({ usuarioId: MARIA.id });
    const his = await add({ usuarioId: JOAO.id });
    await add({ usuarioId: null, resultado: 'NEGADO', motivo: 'TAG_DESCONHECIDA' });

    expect(await idsOf(MARIA.id)).toEqual([mine]);
    expect(await idsOf(JOAO.id)).toEqual([his]);
  });
});
