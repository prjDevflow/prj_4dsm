import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { FakeCurrentPositionService } from '@/service/fakes/FakeDeviceServices';
import { FakeLocationDirectory } from '@/service/fakes/FakeLocationDirectory';
import {
  FakeCreateBuildingService,
  FakeListBuildingsService,
  FakeUpdateBuildingService,
} from '@/service/fakes/FakeLocationServices';
import { createWrapper } from '@test/renderWithProviders';
import { useBuildingFormModel } from './buildingForm.model';
import { BuildingFormView } from './buildingForm.view';

const all = { page: 1, pageSize: 100 };

const renderForm = ({ editing = false, denied = false } = {}) => {
  const directory = new FakeLocationDirectory();
  const central = directory.listBuildings(all).data[1];
  const services = {
    listBuildingsService: new FakeListBuildingsService(directory),
    createBuildingService: new FakeCreateBuildingService(directory),
    updateBuildingService: new FakeUpdateBuildingService(directory),
    currentPositionService: new FakeCurrentPositionService(),
  };
  if (denied) services.currentPositionService.willDeny();
  const onClose = jest.fn();
  const Screen = () => (
    <BuildingFormView
      {...useBuildingFormModel({
        buildingId: editing ? central.id : undefined,
        ...services,
        onClose,
      })}
    />
  );
  return {
    ...services,
    central,
    onClose,
    rendered: render(<Screen />, { wrapper: createWrapper() }),
  };
};

const fill = async (values: Record<string, string>) => {
  for (const [label, value] of Object.entries(values)) {
    await fireEvent.changeText(screen.getByLabelText(label), value);
  }
};

describe('Edifício (T18)', () => {
  it('cadastro: campos, "Usar minha localização atual", ajuda das coordenadas e "Ativo" ligado', async () => {
    const { rendered } = renderForm();
    await rendered;

    expect(screen.getByRole('header', { name: 'Novo edifício' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Nome')).toBeOnTheScreen();
    expect(screen.getByLabelText('Endereço')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Usar minha localização atual' })).toBeOnTheScreen();
    expect(screen.getByText('Entre -90 e 90')).toBeOnTheScreen();
    expect(screen.getByText('Entre -180 e 180')).toBeOnTheScreen();
    expect(screen.getByRole('switch', { name: 'Ativo' })).toBeChecked();
  });

  it('"Salvar" vazio marca nome, endereço e as coordenadas', async () => {
    const { createBuildingService, rendered } = renderForm();
    await rendered;

    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Informe o nome.')).toBeOnTheScreen();
    expect(screen.getByText('Informe o endereço.')).toBeOnTheScreen();
    expect(screen.getByText('Informe a latitude.')).toBeOnTheScreen();
    expect(screen.getByText('Informe a longitude.')).toBeOnTheScreen();
    expect(createBuildingService.calls).toHaveLength(0);
  });

  it('coordenadas fora da faixa são recusadas', async () => {
    const { createBuildingService, rendered } = renderForm();
    await rendered;

    await fill({ Nome: 'Bloco B', Endereço: 'Rua B, 1', Latitude: '90,5', Longitude: '-181' });
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Latitude inválida.')).toBeOnTheScreen();
    expect(screen.getByText('Longitude inválida.')).toBeOnTheScreen();
    expect(createBuildingService.calls).toHaveLength(0);
  });

  it('"Usar minha localização atual" preenche latitude e longitude com vírgula', async () => {
    const { currentPositionService, rendered } = renderForm();
    await rendered;

    await fireEvent.press(screen.getByRole('button', { name: 'Usar minha localização atual' }));

    await waitFor(() => expect(screen.getByLabelText('Latitude')).toHaveProp('value', '-23,30512'));
    expect(screen.getByLabelText('Longitude')).toHaveProp('value', '-45,96551');
    expect(currentPositionService.calls).toBe(1);
  });

  it('permissão negada mostra a mensagem e deixa digitar', async () => {
    const { rendered } = renderForm({ denied: true });
    await rendered;

    await fireEvent.press(screen.getByRole('button', { name: 'Usar minha localização atual' }));

    expect(
      await screen.findByText('Não foi possível obter a localização. Digite as coordenadas.'),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Latitude')).toHaveProp('value', '');
  });

  it('válido: envia números (vírgula convertida) e fecha', async () => {
    const { createBuildingService, onClose, rendered } = renderForm();
    await rendered;

    await fill({
      Nome: 'Bloco B',
      Endereço: 'Rua das Acácias, 200',
      Latitude: '-23,3',
      Longitude: '-45.9',
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(createBuildingService.calls).toEqual([
      {
        nome: 'Bloco B',
        endereco: 'Rua das Acácias, 200',
        latitude: -23.3,
        longitude: -45.9,
        ativo: true,
      },
    ]);
  });

  it('edição: carrega o edifício e envia só o que mudou', async () => {
    const { updateBuildingService, central, onClose, rendered } = renderForm({ editing: true });
    await rendered;

    expect(await screen.findByRole('header', { name: 'Editar edifício' })).toBeOnTheScreen();
    expect(await screen.findByLabelText('Nome')).toHaveProp('value', 'Edifício Central');
    expect(screen.getByLabelText('Latitude')).toHaveProp('value', '-23,30512');

    await fill({ Endereço: 'Rua das Acácias, 122' });
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(updateBuildingService.calls).toEqual([
      { id: central.id, body: { endereco: 'Rua das Acácias, 122' } },
    ]);
  });

  it('desativar edifício com autorização ativa mostra a mensagem do card', async () => {
    const { onClose, rendered } = renderForm({ editing: true });
    await rendered;

    await fireEvent.press(await screen.findByRole('switch', { name: 'Ativo' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    expect(
      within(await screen.findByRole('alert')).getByText(
        'Este local ainda tem autorizações ativas. Cancele-as antes.',
      ),
    ).toBeOnTheScreen();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('"Cancelar" com alterações pergunta "Descartar alterações?"', async () => {
    const { onClose, rendered } = renderForm();
    await rendered;

    await fill({ Nome: 'Bloco B' });
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Descartar' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
