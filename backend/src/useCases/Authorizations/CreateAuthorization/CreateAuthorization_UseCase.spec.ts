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

  it('deve lançar NotFoundError quando o usuário não existe', async () => {
    const { sut, authorizations } = await makeSut();

    const error = await sut.execute(validInput({ usuarioId: idOf(99) }), ADMIN.id).catch((e) => e);

    expect(error).toMatchObject({ code: 'NOT_FOUND', status: 404 });
    expect(authorizations.all()).toEqual([]);
  });

  it('deve lançar NotFoundError quando o ponto de acesso não existe', async () => {
    const { sut, authorizations } = await makeSut();

    const error = await sut
      .execute(validInput({ accessPointId: idOf(99) }), ADMIN.id)
      .catch((e) => e);

    expect(error).toMatchObject({ code: 'NOT_FOUND', status: 404 });
    expect(authorizations.all()).toEqual([]);
  });

  it('deve rejeitar usuário inativo com erro de validação no campo usuarioId', async () => {
    const { sut, users, authorizations } = await makeSut();
    await users.save({ ...VISITOR, ativo: false });

    const error = await sut.execute(validInput(), ADMIN.id).catch((e) => e);

    expect(error).toMatchObject({
      code: 'VALIDATION_ERROR',
      status: 422,
      details: [{ field: 'usuarioId', message: 'Usuário inativo' }],
    });
    expect(authorizations.all()).toEqual([]);
  });

  it('deve rejeitar ponto de acesso inativo com erro de validação no campo accessPointId', async () => {
    const { sut, accessPoints, authorizations } = await makeSut();
    await accessPoints.save({ ...POINT, ativo: false });

    const error = await sut.execute(validInput(), ADMIN.id).catch((e) => e);

    expect(error).toMatchObject({
      code: 'VALIDATION_ERROR',
      status: 422,
      details: [{ field: 'accessPointId', message: 'Ponto de acesso inativo' }],
    });
    expect(authorizations.all()).toEqual([]);
  });

  it('deve travar o usuário e depois o ponto (FOR SHARE) antes de conferir ativo', async () => {
    const { sut, locks } = await makeSut();

    await sut.execute(validInput(), ADMIN.id);

    expect(locks).toEqual([`user:share:${VISITOR.id}`, `point:share:${POINT.id}`]);
  });

  it('deve travar o ponto mesmo quando o usuário inativo já basta para recusar', async () => {
    const { sut, users, locks } = await makeSut();
    await users.save({ ...VISITOR, ativo: false });

    await sut.execute(validInput(), ADMIN.id).catch(() => undefined);

    // Both problems are reported together, so both rows are read under their locks.
    expect(locks).toEqual([`user:share:${VISITOR.id}`, `point:share:${POINT.id}`]);
  });

  it('deve rejeitar dataFim anterior a dataInicio no campo dataFim', async () => {
    const { sut, authorizations } = await makeSut();

    const error = await sut
      .execute(validInput({ dataInicio: '2026-10-22', dataFim: '2026-10-21' }), ADMIN.id)
      .catch((e) => e);

    expect(error).toMatchObject({
      code: 'VALIDATION_ERROR',
      status: 422,
      details: [{ field: 'dataFim', message: 'Deve ser igual ou posterior à data de início' }],
    });
    expect(authorizations.all()).toEqual([]);
  });

  it('deve aceitar dataFim igual a dataInicio', async () => {
    const { sut } = await makeSut();

    const created = await sut.execute(
      validInput({ dataInicio: '2026-10-22', dataFim: '2026-10-22' }),
      ADMIN.id,
    );

    expect(created).toMatchObject({ dataInicio: '2026-10-22', dataFim: '2026-10-22' });
  });

  it('deve rejeitar dataFim no passado em São Paulo', async () => {
    const { sut, authorizations } = await makeSut();

    const error = await sut
      .execute(validInput({ dataInicio: '2026-10-18', dataFim: '2026-10-19' }), ADMIN.id)
      .catch((e) => e);

    expect(error).toMatchObject({
      code: 'VALIDATION_ERROR',
      status: 422,
      details: [{ field: 'dataFim', message: 'Não pode estar no passado' }],
    });
    expect(authorizations.all()).toEqual([]);
  });

  it('deve aceitar dataFim igual a hoje em São Paulo, mesmo com dataInicio no passado', async () => {
    const { sut } = await makeSut();

    const created = await sut.execute(
      validInput({ dataInicio: '2026-10-01', dataFim: '2026-10-20' }),
      ADMIN.id,
    );

    expect(created).toMatchObject({ dataInicio: '2026-10-01', dataFim: '2026-10-20' });
  });

  it('deve usar o dia de São Paulo, não o de UTC, na virada: 23:59 ainda é hoje e 00:00 já é amanhã', async () => {
    const { sut, clock } = await makeSut();

    // 2026-10-21T02:59Z is still 20/10 at 23:59 in São Paulo (UTC-3), though UTC is already the 21st.
    clock.set(new Date('2026-10-21T02:59:00Z'));
    const stillToday = await sut.execute(
      validInput({ dataInicio: '2026-10-20', dataFim: '2026-10-20' }),
      ADMIN.id,
    );
    clock.set(new Date('2026-10-21T03:00:00Z'));
    const error = await sut
      .execute(validInput({ dataInicio: '2026-10-20', dataFim: '2026-10-20' }), ADMIN.id)
      .catch((e) => e);

    expect(stillToday.dataFim).toBe('2026-10-20');
    expect(error).toMatchObject({
      status: 422,
      details: [{ field: 'dataFim', message: 'Não pode estar no passado' }],
    });
  });

  it('deve rejeitar horaFim igual a horaInicio no campo horaFim', async () => {
    const { sut, authorizations } = await makeSut();

    const error = await sut
      .execute(validInput({ horaInicio: '08:00', horaFim: '08:00' }), ADMIN.id)
      .catch((e) => e);

    expect(error).toMatchObject({
      code: 'VALIDATION_ERROR',
      status: 422,
      details: [{ field: 'horaFim', message: 'Deve ser depois da hora de início' }],
    });
    expect(authorizations.all()).toEqual([]);
  });

  it('deve rejeitar horaFim anterior a horaInicio, sem virada de meia-noite', async () => {
    const { sut } = await makeSut();

    const error = await sut
      .execute(validInput({ horaInicio: '22:00', horaFim: '06:00' }), ADMIN.id)
      .catch((e) => e);

    expect(error).toMatchObject({ status: 422, details: [{ field: 'horaFim' }] });
  });

  it('deve aceitar horaFim um minuto depois de horaInicio', async () => {
    const { sut } = await makeSut();

    const created = await sut.execute(
      validInput({ horaInicio: '08:00', horaFim: '08:01' }),
      ADMIN.id,
    );

    expect(created).toMatchObject({ horaInicio: '08:00', horaFim: '08:01' });
  });

  it('deve devolver um erro com um details por campo quando vários campos são inválidos', async () => {
    const { sut, users, accessPoints } = await makeSut();
    await users.save({ ...VISITOR, ativo: false });
    await accessPoints.save({ ...POINT, ativo: false });

    const error = await sut
      .execute(
        validInput({
          dataInicio: '2026-10-22',
          dataFim: '2026-10-19',
          horaInicio: '18:00',
          horaFim: '08:00',
        }),
        ADMIN.id,
      )
      .catch((e) => e);

    expect(error.details.map((d: { field: string }) => d.field)).toEqual([
      'usuarioId',
      'accessPointId',
      'dataFim',
      'horaFim',
    ]);
  });
});
