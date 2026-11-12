import { renderHook, waitFor } from '@testing-library/react-native';
import { useSessionStore } from '@/context/SessionStore';
import {
  FakeAccessEventDirectory,
  sampleAccessEvents,
} from '@/service/fakes/FakeAccessEventDirectory';
import { FakeListMyAccessEventsService } from '@/service/fakes/FakeAccessEventServices';
import { sampleCondomino, sampleVisitante } from '@/service/fakes/sampleData';
import { createWrapper } from '@test/renderWithProviders';
import { useMyHistoryModel } from './myHistory.model';

const setup = () => {
  const service = new FakeListMyAccessEventsService(
    new FakeAccessEventDirectory(sampleAccessEvents()),
  );
  const hook = renderHook(() => useMyHistoryModel({ listMyAccessEventsService: service }), {
    wrapper: createWrapper(),
  });
  return { service, hook };
};

describe('useMyHistoryModel (T12)', () => {
  afterEach(() => useSessionStore.setState({ usuario: null }));

  it('lista só as tentativas da pessoa, sem filtros', async () => {
    useSessionStore.setState({ usuario: sampleVisitante });
    const { service, hook } = setup();
    const { result } = await hook;

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(service.calls).toEqual([{ page: 1, pageSize: 20 }]);
    expect(result.current.events.every((event) => event.usuario?.id === sampleVisitante.id)).toBe(
      true,
    );
  });

  it('a outra pessoa vê as dela', async () => {
    useSessionStore.setState({ usuario: sampleCondomino });
    const { hook } = setup();
    const { result } = await hook;

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.events.every((event) => event.usuario?.id === sampleCondomino.id)).toBe(
      true,
    );
  });
});
