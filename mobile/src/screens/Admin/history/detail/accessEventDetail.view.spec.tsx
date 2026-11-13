import { fireEvent, render, screen } from '@testing-library/react-native';
import type { EventoDeAcesso } from '@/lib/types/accessEvents';
import { sampleAccessEvents } from '@/service/fakes/FakeAccessEventDirectory';
import { AccessEventDetailView } from './accessEventDetail.view';

const NOW = new Date('2026-10-24T18:00:00Z');
const [approved, expired, unknownTag] = sampleAccessEvents(NOW);
const distant = sampleAccessEvents(NOW)[4];

const renderDetail = async (event: EventoDeAcesso | null) => {
  const actions = { onBack: jest.fn(), onOpenAuthorization: jest.fn() };
  await render(<AccessEventDetailView event={event} {...actions} />);
  return actions;
};

const field = (label: string, value: string) =>
  expect(screen.getByLabelText(`${label}: ${value}`)).toBeOnTheScreen();

describe('Tentativa de acesso (T27)', () => {
  it('mostra todos os campos de uma tentativa aprovada pelo QR', async () => {
    await renderDetail(approved);

    expect(screen.getByRole('header', { name: 'Tentativa de acesso' })).toBeOnTheScreen();
    expect(screen.getByText('Autorizado')).toBeOnTheScreen();
    field('Pessoa', 'Visitante (dev)');
    field('Local', 'Catraca Social, Edifício Central');
    field('Método', 'QR Code');
    field('Data e hora', '24/10/2026 às 14:48:00');
    field('Terminal', 'Terminal Social');
    field('Distância', '14 m');
  });

  it('"Ver autorização" abre a autorização usada', async () => {
    const { onOpenAuthorization } = await renderDetail(approved);

    await fireEvent.press(screen.getByRole('button', { name: 'Ver autorização' }));

    expect(onOpenAuthorization).toHaveBeenCalledWith(approved.authorizationId);
  });

  it('a negação mostra o motivo em texto e não oferece autorização quando não há', async () => {
    await renderDetail(expired);

    expect(screen.getByText('Negado')).toBeOnTheScreen();
    expect(screen.getByText('QR Code expirado')).toBeOnTheScreen();
    expect(JSON.stringify(screen.toJSON())).not.toContain('CREDENCIAL_EXPIRADA');
    expect(screen.queryByRole('button', { name: 'Ver autorização' })).toBeNull();
    expect(screen.queryByLabelText(/^Distância/)).toBeNull();
  });

  it('a distância também aparece quando a pessoa estava longe', async () => {
    await renderDetail(distant);

    field('Distância', '212 m');
  });

  it('sem pessoa identificada, mostra "Não identificado"', async () => {
    await renderDetail(unknownTag);

    field('Pessoa', 'Não identificado');
    field('Método', 'Tag NFC');
  });

  it('uma tentativa que não está carregada mostra um aviso e o voltar', async () => {
    const { onBack } = await renderDetail(null);

    expect(screen.getByText('Tentativa não encontrada.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar ao histórico' }));
    expect(onBack).toHaveBeenCalled();
  });
});
