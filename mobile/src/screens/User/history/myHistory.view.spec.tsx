import { render, screen } from '@testing-library/react-native';
import { useSessionStore } from '@/context/SessionStore';
import {
  FakeAccessEventDirectory,
  sampleAccessEvents,
} from '@/service/fakes/FakeAccessEventDirectory';
import { FakeListMyAccessEventsService } from '@/service/fakes/FakeAccessEventServices';
import { sampleCondomino, sampleVisitante } from '@/service/fakes/sampleData';
import { createWrapper } from '@test/renderWithProviders';
import { useMyHistoryModel } from './myHistory.model';
import { MyHistoryView } from './myHistory.view';

const NOW = new Date('2026-10-24T18:00:00Z');

const renderMine = async (events = sampleAccessEvents(NOW)) => {
  const service = new FakeListMyAccessEventsService(new FakeAccessEventDirectory(events));
  const onBack = jest.fn();
  const Screen = () => (
    <MyHistoryView {...useMyHistoryModel({ listMyAccessEventsService: service })} onBack={onBack} />
  );
  await render(<Screen />, { wrapper: createWrapper() });
};

describe('Meu histórico (T12)', () => {
  afterEach(() => useSessionStore.setState({ usuario: null }));

  it('cada tentativa lê o local, o método, a data e hora e o resultado', async () => {
    useSessionStore.setState({ usuario: sampleVisitante });
    await renderMine();

    expect(screen.getByRole('header', { name: 'Meu histórico' })).toBeOnTheScreen();
    expect(
      await screen.findByLabelText('Catraca Social, QR Code, 24/10 14:48:00, Autorizado'),
    ).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Catraca Social, QR Code, 24/10 14:20:00, Negado, QR Code expirado'),
    ).toBeOnTheScreen();
  });

  it('não mostra o nome da pessoa nem o código técnico', async () => {
    useSessionStore.setState({ usuario: sampleVisitante });
    await renderMine();
    await screen.findAllByText('Catraca Social');

    expect(screen.queryByText('Visitante (dev)')).toBeNull();
    expect(JSON.stringify(screen.toJSON())).not.toContain('CREDENCIAL_EXPIRADA');
  });

  it('sem tentativas, avisa', async () => {
    useSessionStore.setState({ usuario: sampleCondomino });
    await renderMine([]);

    expect(await screen.findByText('Nenhuma tentativa ainda.')).toBeOnTheScreen();
  });
});
