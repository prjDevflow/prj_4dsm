import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { FakeClipboardService } from '@/service/fakes/FakeDeviceServices';
import { FakeLocationDirectory } from '@/service/fakes/FakeLocationDirectory';
import {
  FakeGetTerminalService,
  FakeListAccessPointsService,
  FakeListBuildingsService,
  FakeRotateTerminalKeyService,
  FakeUpdateTerminalService,
} from '@/service/fakes/FakeLocationServices';
import { createWrapper } from '@test/renderWithProviders';
import { useTerminalDetailModel } from './terminalDetail.model';
import { TerminalDetailView } from './terminalDetail.view';

const all = { page: 1, pageSize: 100 };
const now = new Date('2026-11-02T15:00:00.000Z');

const renderDetail = (nome = 'Terminal Social') => {
  const directory = new FakeLocationDirectory({ now: () => now });
  const terminal = directory.listTerminals(all).data.find((t) => t.nome === nome)!;
  const services = {
    getTerminalService: new FakeGetTerminalService(directory),
    updateTerminalService: new FakeUpdateTerminalService(directory),
    rotateTerminalKeyService: new FakeRotateTerminalKeyService(directory),
    listAccessPointsService: new FakeListAccessPointsService(directory),
    listBuildingsService: new FakeListBuildingsService(directory),
    clipboardService: new FakeClipboardService(),
  };
  const onClose = jest.fn();
  const Screen = () => (
    <TerminalDetailView
      {...useTerminalDetailModel({ terminalId: terminal.id, ...services, onClose, now: () => now })}
    />
  );
  return {
    ...services,
    terminal,
    onClose,
    rendered: render(<Screen />, { wrapper: createWrapper() }),
  };
};

describe('Detalhe do terminal (T21)', () => {
  it('mostra o selo, "Visto há", o local, o nome e o interruptor "Ativo"', async () => {
    const { rendered } = renderDetail();
    await rendered;

    expect(await screen.findByRole('header', { name: 'Terminal Social' })).toBeOnTheScreen();
    expect(screen.getByText('Online')).toBeOnTheScreen();
    expect(screen.getByText('Visto agora')).toBeOnTheScreen();
    expect(screen.getByText('Catraca Social, Edifício Central')).toBeOnTheScreen();
    expect(screen.getByText('-23,30512, -45,96551')).toBeOnTheScreen();
    expect(screen.getByLabelText('Nome')).toHaveProp('value', 'Terminal Social');
    expect(screen.getByRole('switch', { name: 'Ativo' })).toBeChecked();
    expect(
      screen.getByText('A chave só aparece quando é gerada. Se ela se perdeu, gere uma nova.'),
    ).toBeOnTheScreen();
  });

  it('salvar envia só o que mudou e fecha', async () => {
    const { updateTerminalService, terminal, onClose, rendered } = renderDetail();
    await rendered;

    await fireEvent.press(await screen.findByRole('switch', { name: 'Ativo' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(updateTerminalService.calls).toEqual([{ id: terminal.id, body: { ativo: false } }]);
  });

  it('"Gerar nova chave" pede confirmação; "Voltar" não gera nada', async () => {
    const { rotateTerminalKeyService, rendered } = renderDetail();
    await rendered;

    await fireEvent.press(await screen.findByRole('button', { name: 'Gerar nova chave' }));

    expect(screen.getByText('A chave antiga deixará de funcionar. Continuar?')).toBeOnTheScreen();
    const back = screen.getAllByRole('button', { name: 'Voltar' });
    await fireEvent.press(back[back.length - 1]); // the dialog's, not the header's
    expect(rotateTerminalKeyService.calls).toHaveLength(0);
  });

  it('confirmando, mostra a chave nova uma vez; "Concluir" volta ao detalhe', async () => {
    const { rotateTerminalKeyService, clipboardService, onClose, rendered } = renderDetail();
    await rendered;
    const keys: string[] = [];
    const original = rotateTerminalKeyService.exec.bind(rotateTerminalKeyService);
    rotateTerminalKeyService.exec = async (id) => {
      const answer = await original(id);
      keys.push(answer.apiKey);
      return answer;
    };

    await fireEvent.press(await screen.findByRole('button', { name: 'Gerar nova chave' }));
    const buttons = screen.getAllByRole('button', { name: 'Gerar nova chave' });
    await fireEvent.press(buttons[buttons.length - 1]);

    expect(await screen.findByLabelText('Chave do Terminal Social')).toHaveProp('value', keys[0]);
    await fireEvent.press(screen.getByRole('button', { name: 'Copiar chave' }));
    expect(clipboardService.copied).toEqual([keys[0]]);

    await fireEvent.press(screen.getByRole('button', { name: 'Concluir' }));
    expect(await screen.findByRole('header', { name: 'Terminal Social' })).toBeOnTheScreen();
    expect(screen.queryByText(keys[0])).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });
});
