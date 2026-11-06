import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { Autorizacao } from '@/lib/types/authorizations';
import { ApiError } from '@/service/ApiError';
import { createWrapper } from '@test/renderWithProviders';
import { useMyAuthorizationsModel } from './myAuthorizations.model';

// 18:00 UTC is 15:00 in São Paulo, inside the 08:00 to 18:00 of the base authorization.
const afternoon = () => new Date('2026-10-21T18:00:00.000Z');

const base: Autorizacao = {
  id: 'a1',
  usuario: { id: 'u1', nome: 'Maria Souza', perfil: 'VISITANTE' },
  local: {
    id: 'p1',
    nome: 'Catraca Social',
    tipo: 'CATRACA',
    edificio: { id: 'b1', nome: 'Edifício Central' },
  },
  dataInicio: '2026-10-20',
  dataFim: '2026-10-25',
  horaInicio: '08:00',
  horaFim: '18:00',
  usosPermitidos: 3,
  usosRealizados: 1,
  usosRestantes: 2,
  situacao: 'ATIVA',
  situacaoEfetiva: 'ATIVA',
  criadoPor: { id: 'u9', nome: 'Administrador' },
  criadoEm: '2026-10-19T12:00:00.000Z',
  canceladoPor: null,
  canceladoEm: null,
  motivoCancelamento: null,
};

const serviceWith = (items: Autorizacao[]) => ({
  exec: jest.fn(async ({ page, pageSize }: { page: number; pageSize: number }) => ({
    data: items.slice((page - 1) * pageSize, page * pageSize),
    page,
    pageSize,
    total: items.length,
  })),
});

const setup = async (items: Autorizacao[], clock = afternoon) => {
  const listMyAuthorizationsService = serviceWith(items);
  const { result } = await renderHook(
    () => useMyAuthorizationsModel({ listMyAuthorizationsService, clock }),
    { wrapper: createWrapper() },
  );
  await waitFor(() => expect(result.current.status).not.toBe('loading'));
  return { result, listMyAuthorizationsService };
};

describe('useMyAuthorizationsModel', () => {
  it('separa ativas e anteriores pela situação da API, sem recalcular', async () => {
    const { result } = await setup([
      { ...base, id: 'expirada', situacaoEfetiva: 'EXPIRADA' },
      // Past its end date, but the server says ATIVA: the app does not decide this.
      { ...base, id: 'ativa', dataFim: '2020-01-01' },
      { ...base, id: 'cancelada', situacaoEfetiva: 'CANCELADA' },
      { ...base, id: 'esgotada', situacaoEfetiva: 'ESGOTADA' },
    ]);

    expect(result.current.ativas.map(({ id }) => id)).toEqual(['ativa']);
    expect(result.current.anteriores.map(({ id }) => id).sort()).toEqual([
      'cancelada',
      'esgotada',
      'expirada',
    ]);
  });

  it('mantém as ativas na ordem da API, e as anteriores vêm da mais recente para a mais antiga', async () => {
    const { result } = await setup([
      { ...base, id: 'antiga', dataFim: '2026-09-01', situacaoEfetiva: 'EXPIRADA' },
      { ...base, id: 'recente', dataFim: '2026-10-01', situacaoEfetiva: 'EXPIRADA' },
      { ...base, id: 'primeira', dataFim: '2026-11-01' },
      { ...base, id: 'segunda', dataFim: '2026-12-01' },
    ]);

    expect(result.current.ativas.map(({ id }) => id)).toEqual(['primeira', 'segunda']);
    expect(result.current.anteriores.map(({ id }) => id)).toEqual(['recente', 'antiga']);
  });

  it('monta os textos do cartão', async () => {
    const { result } = await setup([base]);

    expect(result.current.ativas[0]).toMatchObject({
      local: 'Catraca Social',
      edificio: 'Edifício Central',
      situacao: 'ATIVA',
      validade: 'Válida de 20/10 a 25/10',
      horario: 'Das 08:00 às 18:00',
      entradas: 'Restam 2 de 3',
      usosRestantes: 2,
      usosPermitidos: 3,
    });
  });

  it('com uma entrada só, o texto vai para o singular', async () => {
    const { result } = await setup([{ ...base, usosRestantes: 1, usosRealizados: 2 }]);

    expect(result.current.ativas[0].entradas).toBe('Resta 1 de 3');
  });

  it.each([
    ['EXPIRADA', 1, 'Usada 1 de 3'],
    ['CANCELADA', 0, 'Usadas 0 de 3'],
    ['ESGOTADA', 3, 'Usadas 3 de 3'],
  ] as const)(
    '%s conta as entradas usadas: "restam" numa que não vale mais pareceria que ainda vale',
    async (situacaoEfetiva, usosRealizados, entradas) => {
      const { result } = await setup([
        { ...base, situacaoEfetiva, usosRealizados, usosRestantes: 3 - usosRealizados },
      ]);

      expect(result.current.anteriores[0].entradas).toBe(entradas);
    },
  );

  it.each([
    ['antes da janela', '2026-10-21T10:59:00.000Z', true],
    ['no primeiro minuto', '2026-10-21T11:00:00.000Z', false],
    ['dentro da janela', '2026-10-21T18:00:00.000Z', false],
    ['no último minuto', '2026-10-21T21:00:00.000Z', false],
    ['depois da janela', '2026-10-21T21:01:00.000Z', true],
  ])('aviso de fora do horário %s', async (_, instant, expected) => {
    const { result } = await setup([base], () => new Date(instant));

    expect(result.current.ativas[0].foraDoHorario).toBe(expected);
  });

  it('o aviso só vale para as ativas: uma cancelada não avisa nada', async () => {
    const { result } = await setup(
      [{ ...base, situacaoEfetiva: 'CANCELADA' }],
      () => new Date('2026-10-21T02:00:00.000Z'),
    );

    expect(result.current.anteriores[0].foraDoHorario).toBe(false);
  });

  it('busca todas as páginas: a tela não tem "carregar mais"', async () => {
    const items = Array.from({ length: 120 }, (_, index) => ({ ...base, id: `a${index}` }));

    const { result, listMyAuthorizationsService } = await setup(items);

    expect(result.current.ativas).toHaveLength(120);
    expect(listMyAuthorizationsService.exec).toHaveBeenCalledTimes(2);
  });

  it('"Anteriores" começa recolhida e o toque alterna', async () => {
    const { result } = await setup([base]);
    expect(result.current.anterioresOpen).toBe(false);

    await act(async () => result.current.onToggleAnteriores());
    expect(result.current.anterioresOpen).toBe(true);

    await act(async () => result.current.onToggleAnteriores());
    expect(result.current.anterioresOpen).toBe(false);
  });

  it('sem nenhuma autorização, o estado é vazio', async () => {
    const { result } = await setup([]);

    expect(result.current.status).toBe('empty');
  });

  it('só com anteriores não é vazio: a pessoa ainda vê o que já teve', async () => {
    const { result } = await setup([{ ...base, situacaoEfetiva: 'EXPIRADA' }]);

    expect(result.current.status).toBe('ready');
    expect(result.current.ativas).toEqual([]);
  });

  it('falha ao carregar mostra o erro, e "Tentar novamente" busca de novo', async () => {
    const listMyAuthorizationsService = serviceWith([base]);
    listMyAuthorizationsService.exec.mockRejectedValueOnce(
      new ApiError(500, 'INTERNAL_ERROR', 'Erro interno'),
    );
    const { result } = await renderHook(
      () => useMyAuthorizationsModel({ listMyAuthorizationsService, clock: afternoon }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.errorMessage).not.toBe('');

    await act(async () => {
      await result.current.onRetry();
    });

    await waitFor(() => expect(result.current.status).toBe('ready'));
  });

  it('puxar para atualizar busca de novo e termina sem o indicador', async () => {
    const { result, listMyAuthorizationsService } = await setup([base]);
    expect(listMyAuthorizationsService.exec).toHaveBeenCalledTimes(1);

    await act(() => result.current.onRefresh());

    expect(listMyAuthorizationsService.exec).toHaveBeenCalledTimes(2);
    expect(result.current.refreshing).toBe(false);
  });
});
