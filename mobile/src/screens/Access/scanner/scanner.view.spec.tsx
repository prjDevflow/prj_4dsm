import { fireEvent, render, screen } from '@testing-library/react-native';
import type { PermissionAccess } from '@/service/IDeviceService';
import {
  FakeGetCameraAccessService,
  FakeOpenSettingsService,
  FakeRequestCameraAccessService,
  FakeVibrateService,
} from '@/service/fakes/FakeDeviceServices';
import {
  FakePreparePositionService,
  FakeSimulatePositionService,
} from '@/service/fakes/FakePositionServices';
import { useScannerModel } from './scanner.model';
import { ScannerView } from './scanner.view';

const VALID_QR = 'ACS1:q3F8k2Zr1pLw9XbTn0YhVA';

// The view with its real model and fake services: what the page renders, without the router.
const renderScreen = async ({
  access = 'granted' as PermissionAccess,
  answer = 'granted' as PermissionAccess,
  devPaste = false,
  positionReady = true,
} = {}) => {
  const services = {
    getCameraAccessService: new FakeGetCameraAccessService(access),
    requestCameraAccessService: new FakeRequestCameraAccessService(answer),
    vibrateService: new FakeVibrateService(),
    openSettingsService: new FakeOpenSettingsService(),
    preparePositionService: new FakePreparePositionService(positionReady),
    simulatePositionService: new FakeSimulatePositionService(),
  };
  const onValidQr = jest.fn();
  const onBack = jest.fn();
  const Screen = () => (
    <ScannerView
      {...useScannerModel({ ...services, onValidQr })}
      onBack={onBack}
      devPaste={devPaste}
    />
  );
  await render(<Screen />);
  return { ...services, onValidQr, onBack };
};

const instruction = 'Aponte a câmera para o QR Code da catraca.';

describe('Permissão da câmera (T06)', () => {
  it('explica antes do pedido do sistema, com "Permitir câmera" e "Agora não"', async () => {
    await renderScreen({ access: 'undetermined' });

    expect(
      await screen.findByRole('header', {
        name: 'Precisamos da câmera para ler o QR Code da catraca.',
      }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Permitir câmera' })).toBeOnTheScreen();
    expect(screen.queryByTestId('camera')).toBeNull();
  });

  it('"Permitir câmera" aceito abre a câmera', async () => {
    await renderScreen({ access: 'undetermined' });

    await fireEvent.press(await screen.findByRole('button', { name: 'Permitir câmera' }));

    expect(await screen.findByTestId('camera')).toBeOnTheScreen();
  });

  it('"Agora não" fecha o leitor', async () => {
    const { onBack } = await renderScreen({ access: 'undetermined' });

    await fireEvent.press(await screen.findByRole('button', { name: 'Agora não' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('negada, explica e leva às configurações', async () => {
    const { openSettingsService } = await renderScreen({ access: 'denied' });

    expect(
      await screen.findByRole('header', {
        name: 'Sem acesso à câmera, não é possível ler o QR Code.',
      }),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Abrir configurações' }));

    expect(openSettingsService.calls).toBe(1);
  });

  it('negada, não prende a pessoa: há como voltar', async () => {
    const { onBack } = await renderScreen({ access: 'denied' });

    await fireEvent.press(await screen.findByRole('button', { name: 'Voltar' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe('Câmera indisponível', () => {
  const unavailable = async (devPaste: boolean) => {
    const context = await renderScreen({ devPaste });
    await fireEvent(await screen.findByTestId('camera'), 'mountError', { message: 'sem câmera' });
    return context;
  };

  it('diz que a câmera não está disponível', async () => {
    await unavailable(false);

    expect(
      await screen.findByRole('header', { name: 'Câmera indisponível neste aparelho.' }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeOnTheScreen();
  });

  it('em desenvolvimento, o campo de colar o QR substitui a câmera', async () => {
    const { onValidQr } = await unavailable(true);

    await fireEvent.changeText(await screen.findByLabelText('Texto do QR Code'), VALID_QR);
    await fireEvent.press(screen.getByRole('button', { name: 'Usar este texto' }));

    expect(onValidQr).toHaveBeenCalledWith(VALID_QR);
  });

  it('fora do desenvolvimento, o campo não aparece', async () => {
    await unavailable(false);

    expect(screen.queryByLabelText('Texto do QR Code')).toBeNull();
  });
});

describe('Leitor (T07)', () => {
  it('mostra a câmera, a instrução, a dica, "Voltar" e a lanterna', async () => {
    await renderScreen();

    expect(await screen.findByRole('header', { name: instruction })).toBeOnTheScreen();
    expect(
      screen.getByText('O QR Code muda a cada 10 segundos. Se der erro, leia o novo.'),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Ligar lanterna' })).toBeOnTheScreen();
    expect(screen.getByTestId('scanner-frame')).toBeOnTheScreen();
  });

  it('avisa que a localização está pronta', async () => {
    await renderScreen();

    expect(await screen.findByText('Localização pronta')).toBeOnTheScreen();
  });

  it('sem a posição, não promete nada', async () => {
    await renderScreen({ positionReady: false });

    await screen.findByRole('header', { name: instruction });
    expect(screen.queryByText('Localização pronta')).toBeNull();
  });

  it('em desenvolvimento, dá para simular onde o celular está', async () => {
    const { simulatePositionService } = await renderScreen({ devPaste: true });

    await fireEvent.press(await screen.findByRole('radio', { name: 'A 200 m' }));

    expect(simulatePositionService.current()).toBe('longe');
    expect(screen.getByRole('radio', { name: 'A 200 m' })).toBeChecked();
  });

  it('fora do desenvolvimento, não dá para simular a posição', async () => {
    await renderScreen();

    await screen.findByRole('header', { name: instruction });
    expect(screen.queryByRole('radio')).toBeNull();
  });

  it('a câmera só procura QR Code', async () => {
    await renderScreen();

    expect(await screen.findByTestId('camera')).toHaveProp('barcodeScannerSettings', {
      barcodeTypes: ['qr'],
    });
  });

  it('o botão da lanterna liga, troca o rótulo e desliga', async () => {
    await renderScreen();
    const camera = await screen.findByTestId('camera');
    expect(camera).toHaveProp('enableTorch', false);

    await fireEvent.press(screen.getByRole('button', { name: 'Ligar lanterna' }));
    expect(screen.getByTestId('camera')).toHaveProp('enableTorch', true);

    await fireEvent.press(screen.getByRole('button', { name: 'Desligar lanterna' }));
    expect(screen.getByTestId('camera')).toHaveProp('enableTorch', false);
  });

  it('um QR de outro tipo mostra a mensagem no lugar da dica e a câmera continua', async () => {
    const { onValidQr } = await renderScreen();

    await fireEvent(await screen.findByTestId('camera'), 'barcodeScanned', {
      data: 'https://exemplo.com.br',
    });

    expect(screen.getByText('Este não é o QR Code da catraca.')).toBeOnTheScreen();
    expect(screen.queryByText(/O QR Code muda/)).toBeNull();
    expect(screen.getByTestId('camera')).toBeOnTheScreen();
    expect(onValidQr).not.toHaveBeenCalled();
  });

  it('um QR válido entrega o texto lido', async () => {
    const { onValidQr, vibrateService } = await renderScreen();

    await fireEvent(await screen.findByTestId('camera'), 'barcodeScanned', { data: VALID_QR });

    expect(onValidQr).toHaveBeenCalledWith(VALID_QR);
    expect(vibrateService.calls).toBe(1);
  });

  it('em desenvolvimento, dá para colar o texto mesmo com a câmera aberta', async () => {
    const { onValidQr } = await renderScreen({ devPaste: true });

    await fireEvent.changeText(await screen.findByLabelText('Texto do QR Code'), VALID_QR);
    await fireEvent.press(screen.getByRole('button', { name: 'Usar este texto' }));

    expect(onValidQr).toHaveBeenCalledWith(VALID_QR);
  });

  it('colar um texto que não é da catraca mostra a mesma mensagem', async () => {
    const { onValidQr } = await renderScreen({ devPaste: true });

    await fireEvent.changeText(await screen.findByLabelText('Texto do QR Code'), 'qualquer coisa');
    await fireEvent.press(screen.getByRole('button', { name: 'Usar este texto' }));

    expect(screen.getByText('Este não é o QR Code da catraca.')).toBeOnTheScreen();
    expect(onValidQr).not.toHaveBeenCalled();
  });
});
