import { fireEvent, render, screen } from '@testing-library/react-native';
import { HealthView } from './health.view';

type Props = Parameters<typeof HealthView>[0];

const baseProps: Props = {
  apiUrl: 'http://192.168.0.15:3000/api/v1',
  status: 'ok',
  title: 'API: ok',
  detail: 'Versão 0.1.0 · banco de dados conectado',
  isRetrying: false,
  onRetry: jest.fn(),
  showCatalog: false,
  onOpenCatalog: jest.fn(),
};

describe('HealthView', () => {
  it('mostra o nome do app, o resultado, o detalhe e a URL usada', async () => {
    await render(<HealthView {...baseProps} />);

    expect(screen.getByRole('header', { name: 'Passe' })).toBeOnTheScreen();
    expect(screen.getByText('API: ok')).toBeOnTheScreen();
    expect(screen.getByText('Versão 0.1.0 · banco de dados conectado')).toBeOnTheScreen();
    expect(screen.getByText('http://192.168.0.15:3000/api/v1')).toBeOnTheScreen();
  });

  it('"Tentar novamente" é um botão acessível que chama onRetry', async () => {
    const onRetry = jest.fn();
    await render(
      <HealthView
        {...baseProps}
        status="down"
        title="API: fora do ar"
        detail="Sem conexão com o servidor. Verifique sua internet e tente de novo."
        onRetry={onRetry}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(screen.getByText('API: fora do ar')).toBeOnTheScreen();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('enquanto verifica, o botão fica ocupado e não chama onRetry de novo', async () => {
    const onRetry = jest.fn();
    await render(<HealthView {...baseProps} isRetrying onRetry={onRetry} />);

    const button = screen.getByRole('button', { name: 'Verificando…' });
    await fireEvent.press(button);

    expect(button).toBeBusy();
    expect(onRetry).not.toHaveBeenCalled();
  });

  it('em desenvolvimento, mostra o atalho para o catálogo de componentes', async () => {
    const onOpenCatalog = jest.fn();
    await render(<HealthView {...baseProps} showCatalog onOpenCatalog={onOpenCatalog} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Abrir catálogo de componentes' }));

    expect(onOpenCatalog).toHaveBeenCalledTimes(1);
  });

  it('fora do desenvolvimento, não mostra o atalho do catálogo', async () => {
    await render(<HealthView {...baseProps} />);

    expect(screen.queryByRole('button', { name: 'Abrir catálogo de componentes' })).toBeNull();
  });
});
