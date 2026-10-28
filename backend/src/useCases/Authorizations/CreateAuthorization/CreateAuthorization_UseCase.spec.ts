import { describe, expect, it } from 'vitest';
import { FakeClock } from '../../../../test/doubles/FakeClock';
import { SequentialIdGenerator } from '../../../../test/doubles/SequentialIdGenerator';
import { makeLocationDoubles } from '../../../../test/doubles/InMemoryLocationUnitOfWork';
import { makeAccessPoint } from '../../../../test/factories/makeAccessPoint';
import { makeBuilding } from '../../../../test/factories/makeBuilding';
import { makeUser } from '../../../../test/factories/makeUser';
import type { ICreateAuthorizationDTO } from './CreateAuthorization_DTO';
import { CreateAuthorizationUseCase } from './CreateAuthorization_UseCase';

const idOf = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const ADMIN = makeUser({ id: idOf(1), nome: 'Admin', perfil: 'ADMIN' });
const VISITOR = makeUser({ id: idOf(2), nome: 'Maria Souza', email: 'maria@teste.local' });
const BUILDING = makeBuilding({ id: idOf(10), nome: 'Edifício Central' });
const POINT = makeAccessPoint({ id: idOf(20), buildingId: BUILDING.id, nome: 'Catraca Social' });

// 2026-10-20 11:00 in São Paulo
const NOW = new Date('2026-10-20T14:00:00Z');

const validInput = (overrides: Partial<ICreateAuthorizationDTO> = {}): ICreateAuthorizationDTO => ({
  usuarioId: VISITOR.id,
  accessPointId: POINT.id,
  dataInicio: '2026-10-20',
  dataFim: '2026-10-25',
  horaInicio: '08:00',
  horaFim: '18:00',
  usosPermitidos: 3,
  ...overrides,
});

const makeSut = async () => {
  const doubles = makeLocationDoubles();
  const clock = new FakeClock(NOW);
  for (const user of [ADMIN, VISITOR]) await doubles.users.save(user);
  await doubles.buildings.save(BUILDING);
  await doubles.accessPoints.save(POINT);
  const sut = new CreateAuthorizationUseCase(doubles.uow, new SequentialIdGenerator(), clock);
  return { sut, clock, ...doubles };
};

describe('CreateAuthorization', () => {
  it('deve criar a autorização com os oito campos e situação ATIVA', async () => {
    const { sut } = await makeSut();

    const created = await sut.execute(validInput(), ADMIN.id);

    expect(created).toMatchObject({
      usuario: { id: VISITOR.id, nome: 'Maria Souza', perfil: 'VISITANTE' },
      local: {
        id: POINT.id,
        nome: 'Catraca Social',
        tipo: 'CATRACA',
        edificio: { id: BUILDING.id, nome: 'Edifício Central' },
      },
      dataInicio: '2026-10-20',
      dataFim: '2026-10-25',
      horaInicio: '08:00',
      horaFim: '18:00',
      usosPermitidos: 3,
      usosRealizados: 0,
      usosRestantes: 3,
      situacao: 'ATIVA',
      situacaoEfetiva: 'ATIVA',
    });
  });

  it('deve gravar a autorização no repositório com o mesmo id devolvido', async () => {
    const { sut, authorizations } = await makeSut();

    const created = await sut.execute(validInput(), ADMIN.id);

    expect(authorizations.all()).toEqual([
      expect.objectContaining({
        id: created.id,
        usuarioId: VISITOR.id,
        accessPointId: POINT.id,
        usosPermitidos: 3,
        usosRealizados: 0,
        situacao: 'ATIVA',
      }),
    ]);
  });

  it('deve gravar criadoPorId do administrador e criadoEm do relógio injetado', async () => {
    const { sut, authorizations, clock } = await makeSut();
    clock.set(new Date('2026-10-20T15:30:00Z'));

    const created = await sut.execute(validInput(), ADMIN.id);

    expect(authorizations.all()[0]).toMatchObject({
      criadoPorId: ADMIN.id,
      criadoEm: new Date('2026-10-20T15:30:00Z'),
    });
    expect(created.criadoEm).toEqual(new Date('2026-10-20T15:30:00Z'));
  });

  it('deve devolver criadoPor com o nome do administrador e os campos de cancelamento nulos', async () => {
    const { sut } = await makeSut();

    const created = await sut.execute(validInput(), ADMIN.id);

    expect(created.criadoPor).toEqual({ id: ADMIN.id, nome: 'Admin' });
    expect(created).toMatchObject({
      canceladoPor: null,
      canceladoEm: null,
      motivoCancelamento: null,
    });
  });

  it.todo('deve lançar NotFoundError quando o usuário não existe');
  it.todo('deve lançar NotFoundError quando o ponto de acesso não existe');
  it.todo('deve rejeitar usuário inativo com erro de validação no campo usuarioId');
  it.todo('deve rejeitar ponto de acesso inativo com erro de validação no campo accessPointId');
  it.todo('deve rejeitar dataFim anterior a dataInicio no campo dataFim e aceitar igual');
  it.todo('deve rejeitar dataFim no passado em São Paulo e aceitar hoje');
  it.todo('deve tratar a virada do dia pelo horário de São Paulo, não pelo UTC');
  it.todo('deve rejeitar horaFim igual ou anterior a horaInicio no campo horaFim');
  it.todo('deve aceitar horaFim um minuto depois de horaInicio');
  it.todo('deve devolver um erro com um details por campo quando vários campos são inválidos');
  it.todo('deve não gravar nada quando alguma regra falha');
  it.todo('deve travar o usuário e depois o ponto (FOR SHARE) antes de conferir ativo');
});
