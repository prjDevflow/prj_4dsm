import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { EventoDeAcesso } from '@/lib/types/accessEvents';
import {
  FakeAccessEventDirectory,
  sampleAccessEvents,
} from '@/service/fakes/FakeAccessEventDirectory';
import { FakeListAccessEventsService } from '@/service/fakes/FakeAccessEventServices';
import { FakeLocationDirectory } from '@/service/fakes/FakeLocationDirectory';
import {
  FakeListAccessPointsService,
  FakeListBuildingsService,
} from '@/service/fakes/FakeLocationServices';
import { FakeUserDirectory } from '@/service/fakes/FakeUserDirectory';
import { FakeListUsersService } from '@/service/fakes/FakeUserServices';
import { createWrapper } from '@test/renderWithProviders';
import { useAccessHistoryModel } from './accessHistory.model';
import { AccessHistoryView } from './accessHistory.view';

const NOW = new Date('2026-10-24T18:00:00Z');

// The view with its real model and fake services: what the page renders, without the router.
const renderHistory = async (events: EventoDeAcesso[] = sampleAccessEvents(NOW)) => {
  const locations = new FakeLocationDirectory();
  const services = {
    listAccessEventsService: new FakeListAccessEventsService(new FakeAccessEventDirectory(events)),
    listUsersService: new FakeListUsersService(new FakeUserDirectory()),
    listBuildingsService: new FakeListBuildingsService(locations),
    listAccessPointsService: new FakeListAccessPointsService(locations),
  };
  const navigation = { onBack: jest.fn(), onOpen: jest.fn() };
  const Screen = () => (
    <AccessHistoryView
      {...useAccessHistoryModel({ ...services, now: () => NOW })}
      {...navigation}
    />
  );
  await render(<Screen />, { wrapper: createWrapper() });
  return { ...services, navigation };
};

const codes = [
  'CREDENCIAL_INVALIDA',
  'CREDENCIAL_EXPIRADA',
  'CREDENCIAL_REUTILIZADA',
  'DISTANTE_DO_TERMINAL',
  'LOCALIZACAO_INVALIDA',
  'SEM_AUTORIZACAO',
  'AUTORIZACAO_CANCELADA',
  'FORA_DO_PERIODO',
  'USOS_ESGOTADOS',
  'USUARIO_INATIVO',
  'TAG_DESCONHECIDA',
  'TAG_INATIVA',
  'TERMINAL_OFFLINE',
];

describe('Histórico (T26)', () => {
  it('cada item lê pessoa, local, método, data e hora e o resultado', async () => {
    await renderHistory();

    expect(screen.getByRole('header', { name: 'Histórico' })).toBeOnTheScreen();
    expect(
      await screen.findByRole('button', {
        name: 'Visitante (dev), Catraca Social, QR Code, 24/10 14:48:00, Autorizado',
      }),
    ).toBeOnTheScreen();
  });

  it('a tentativa sem pessoa aparece como "Não identificado"', async () => {
    await renderHistory();

    expect(
      await screen.findByRole('button', {
        name: 'Não identificado, Porta da Garagem, Tag NFC, 24/10 13:25:00, Negado, Tag não reconhecida',
      }),
    ).toBeOnTheScreen();
  });

  it('a tentativa sem local aparece como "Local não identificado"', async () => {
    await renderHistory();

    expect(
      await screen.findByRole('button', { name: /^Condômino \(dev\), Local não identificado,/ }),
    ).toBeOnTheScreen();
  });

  it('o método aparece com ícone e texto', async () => {
    await renderHistory();

    expect((await screen.findAllByText(/, Tag NFC$/)).length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('metodo-icon', { includeHiddenElements: true }).length).toBe(
      sampleAccessEvents(NOW).length,
    );
  });

  it('o motivo da negação aparece em texto, nunca o código técnico', async () => {
    const events = codes.map((motivo, index) => ({
      ...sampleAccessEvents(NOW)[1],
      id: `e-${index}`,
      motivo,
      ocorridoEm: new Date(NOW.getTime() - index * 60_000).toISOString(),
    }));
    await renderHistory(events);
    await screen.findAllByText('QR Code expirado');

    for (const code of codes) {
      expect(screen.queryByText(new RegExp(code))).toBeNull();
      expect(screen.queryByLabelText(new RegExp(code))).toBeNull();
    }
    expect(screen.getByText('QR Code inválido')).toBeOnTheScreen();
  });

  it('tocar num item abre o detalhe', async () => {
    const { navigation } = await renderHistory();

    await fireEvent.press(
      await screen.findByRole('button', {
        name: /^Visitante \(dev\), Catraca Social, QR Code, 24\/10 14:48:00/,
      }),
    );

    expect(navigation.onOpen).toHaveBeenCalledWith(sampleAccessEvents(NOW)[0].id);
  });

  it('sem tentativas, diz que não há nenhuma no período', async () => {
    await renderHistory([]);

    expect(await screen.findByText('Nenhuma tentativa no período.')).toBeOnTheScreen();
  });

  it('o período começa nos últimos 7 dias, e escolher "Negado" filtra e mostra "Limpar filtros"', async () => {
    await renderHistory();
    await screen.findByRole('button', {
      name: /^Visitante \(dev\), Catraca Social, QR Code, 24\/10 14:48:00/,
    });
    expect(screen.getByRole('button', { name: 'Período: Últimos 7 dias' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Resultado' }));
    await fireEvent.press(await screen.findByRole('radio', { name: 'Negado' }));

    expect(await screen.findByRole('button', { name: 'Limpar filtros' })).toBeOnTheScreen();
    await waitFor(() =>
      expect(
        screen.queryByRole('button', {
          name: /^Visitante \(dev\), Catraca Social, QR Code, 24\/10 14:48:00, Autorizado/,
        }),
      ).toBeNull(),
    );
  });

  it('"Período" abre as datas "De" e "Até"', async () => {
    await renderHistory();

    await fireEvent.press(await screen.findByRole('button', { name: 'Período: Últimos 7 dias' }));

    expect(await screen.findByText('De')).toBeOnTheScreen();
    expect(screen.getByText('Até')).toBeOnTheScreen();
  });

  it.each(['Pessoa', 'Local', 'Método', 'Motivo'])('o filtro "%s" está na tela', async (name) => {
    await renderHistory();

    expect(await screen.findByRole('button', { name })).toBeOnTheScreen();
  });
});
