import { fireEvent, render, screen } from '@testing-library/react-native';
import { SplashView } from './splash.view';

describe('SplashView (T01)', () => {
  it('mostra o logo, o nome e "Carregando…" enquanto confere a sessão', async () => {
    await render(<SplashView status="checking" errorMessage={null} onRetry={jest.fn()} />);

    expect(screen.getByText('Passe')).toBeOnTheScreen();
    expect(screen.getByText('Controle de Acesso')).toBeOnTheScreen();
    expect(screen.getByLabelText('Carregando…')).toBeBusy();
  });

  it('sem rede, mostra o erro e "Tentar novamente" chama onRetry', async () => {
    const onRetry = jest.fn();
    await render(
      <SplashView
        status="error"
        errorMessage="Sem conexão com o servidor. Verifique sua internet e tente de novo."
        onRetry={onRetry}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(
      screen.getByText('Sem conexão com o servidor. Verifique sua internet e tente de novo.'),
    ).toBeOnTheScreen();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
