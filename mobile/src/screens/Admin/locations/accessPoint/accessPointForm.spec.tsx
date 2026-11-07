import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { FakeCurrentPositionService } from '@/service/fakes/FakeDeviceServices';
import { FakeLocationDirectory } from '@/service/fakes/FakeLocationDirectory';
import {
  FakeCreateAccessPointService,
  FakeListAccessPointsService,
  FakeListBuildingsService,
  FakeUpdateAccessPointService,
} from '@/service/fakes/FakeLocationServices';
import { createWrapper } from '@test/renderWithProviders';
import { useAccessPointFormModel } from './accessPointForm.model';
import { AccessPointFormView } from './accessPointForm.view';

const all = { page: 1, pageSize: 100 };

const renderForm = ({ editing }: { editing?: string } = {}) => {
  const directory = new FakeLocationDirectory();
  const central = directory.listBuildings(all).data[1];
  const point = (nome: string) =>
    directory.listAccessPoints(all).data.find((ap) => ap.nome === nome)!;
  const services = {
    listBuildingsService: new FakeListBuildingsService(directory),
    listAccessPointsService: new FakeListAccessPointsService(directory),
    createAccessPointService: new FakeCreateAccessPointService(directory),
    updateAccessPointService: new FakeUpdateAccessPointService(directory),
    currentPositionService: new FakeCurrentPositionService(),
  };
  const onClose = jest.fn();
  const Screen = () => (
    <AccessPointFormView
      {...useAccessPointFormModel({
        accessPointId: editing ? point(editing).id : undefined,
        initialBuildingId: editing ? undefined : central.id,
        ...services,
        onClose,
      })}
    />
  );
  return {
    ...services,
    central,
    point,
    onClose,
    rendered: render(<Screen />, { wrapper: createWrapper() }),
  };
};

describe('Ponto de acesso (T19)', () => {
  it('cadastro: edifício já escolhido, tipo segmentado e exemplo da identificação', async () => {
    const { rendered } = renderForm();
    await rendered;

    expect(screen.getByRole('header', { name: 'Novo local' })).toBeOnTheScreen();
    expect(await screen.findByRole('button', { name: 'Edifício' })).toHaveAccessibilityValue({
      text: 'Edifício Central',
    });
    const tipo = screen.getByLabelText('Tipo');
    for (const name of ['Portaria', 'Porta', 'Catraca']) {
      expect(within(tipo).getByRole('radio', { name })).not.toBeChecked();
    }
    expect(screen.getByText('Exemplo: CAT-01')).toBeOnTheScreen();
    expect(screen.getByRole('switch', { name: 'Ativo' })).toBeChecked();
  });

  it('sem tipo, nome e identificação não envia', async () => {
    const { createAccessPointService, rendered } = renderForm();
    await rendered;

    await fireEvent.press(await screen.findByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Escolha o tipo.')).toBeOnTheScreen();
    expect(screen.getByText('Informe a identificação.')).toBeOnTheScreen();
    expect(createAccessPointService.calls).toHaveLength(0);
  });

  it('identificação repetida no edifício aparece no campo; corrigida, salva e fecha', async () => {
    const { createAccessPointService, central, onClose, rendered } = renderForm();
    await rendered;

    await fireEvent.press(await screen.findByRole('radio', { name: 'Porta' }));
    await fireEvent.changeText(screen.getByLabelText('Nome'), 'Porta dos Fundos');
    await fireEvent.changeText(screen.getByLabelText('Identificação'), 'CAT-01');
    await fireEvent.press(screen.getByRole('button', { name: 'Usar minha localização atual' }));
    await waitFor(() => expect(screen.getByLabelText('Latitude')).toHaveProp('value', '-23,30512'));
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    expect(
      await screen.findByText('Já existe um local com esta identificação neste edifício.'),
    ).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Identificação'), 'POR-03');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(createAccessPointService.calls.at(-1)).toEqual({
      buildingId: central.id,
      tipo: 'PORTA',
      nome: 'Porta dos Fundos',
      identificacao: 'POR-03',
      latitude: -23.30512,
      longitude: -45.96551,
      ativo: true,
    });
  });

  it('edição: "Editar local", edifício sem troca e os dados carregados', async () => {
    const { rendered } = renderForm({ editing: 'Catraca Social' });
    await rendered;

    expect(await screen.findByLabelText('Nome')).toHaveProp('value', 'Catraca Social');
    expect(screen.getByRole('header', { name: 'Editar local' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Edifício' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Catraca' })).toBeChecked();
    expect(screen.getByLabelText('Identificação')).toHaveProp('value', 'CAT-01');
  });

  it('desativar ponto com autorização ativa mostra a mensagem do card', async () => {
    const { onClose, rendered } = renderForm({ editing: 'Catraca Social' });
    await rendered;

    await fireEvent.press(await screen.findByRole('switch', { name: 'Ativo' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    expect(
      await screen.findByText('Este local ainda tem autorizações ativas. Cancele-as antes.'),
    ).toBeOnTheScreen();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('edição envia só o que mudou, nunca o edifício', async () => {
    const { updateAccessPointService, point, onClose, rendered } = renderForm({
      editing: 'Catraca do Anexo',
    });
    await rendered;

    await fireEvent.press(await screen.findByRole('switch', { name: 'Ativo' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(updateAccessPointService.calls).toEqual([
      { id: point('Catraca do Anexo').id, body: { ativo: true } },
    ]);
  });
});
