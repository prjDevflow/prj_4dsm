import { fireEvent, render, screen } from '@testing-library/react-native';
import { colors, ThemeProvider } from '@/theme';
import { Button, type ButtonVariant } from './Button';

describe('Button', () => {
  it('é um botão acessível com o rótulo e chama onPress', async () => {
    const onPress = jest.fn();
    await render(<Button label="Entrar" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('em loading mostra o loadingLabel, fica ocupado e não chama onPress de novo', async () => {
    const onPress = jest.fn();
    await render(<Button label="Entrar" loadingLabel="Entrando…" loading onPress={onPress} />);

    const button = screen.getByRole('button', { name: 'Entrando…' });
    await fireEvent.press(button);

    expect(screen.getByText('Entrando…')).toBeOnTheScreen();
    expect(screen.queryByText('Entrar')).toBeNull();
    expect(button).toBeBusy();
    expect(onPress).not.toHaveBeenCalled();
  });

  it('toque duplo enquanto a ação anterior não termina chama onPress uma vez só', async () => {
    let finish = () => {};
    const onPress = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    await render(<Button label="Salvar" onPress={onPress} />);
    const button = screen.getByRole('button', { name: 'Salvar' });

    await fireEvent.press(button);
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);

    finish();
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(2);
  });

  it('desabilitado não chama onPress', async () => {
    const onPress = jest.fn();
    await render(<Button label="Salvar" disabled onPress={onPress} />);

    const button = screen.getByRole('button', { name: 'Salvar' });
    await fireEvent.press(button);

    expect(button).toBeDisabled();
    expect(onPress).not.toHaveBeenCalled();
  });

  it.each<[ButtonVariant, string | undefined, string, string | undefined]>([
    ['principal', colors.primaria, colors.primariaSobre, undefined],
    ['tonal', colors.primariaContainer, colors.primariaContainerSobre, undefined],
    ['contorno', undefined, colors.primaria, colors.contorno],
    ['texto', undefined, colors.primaria, undefined],
    ['perigo', colors.erro, colors.erroSobre, undefined],
    ['perigoContorno', undefined, colors.erro, colors.erro],
    ['catraca', colors.acao, colors.acaoSobre, undefined],
  ])('a variante %s usa as cores do tokens.md', async (variant, background, text, border) => {
    await render(<Button label="Botão" variant={variant} onPress={jest.fn()} />);

    const button = screen.getByRole('button', { name: 'Botão' });
    expect(button).toHaveStyle({ backgroundColor: background ?? 'transparent' });
    if (border) expect(button).toHaveStyle({ borderColor: border, borderWidth: 1 });
    expect(screen.getByText('Botão')).toHaveStyle({ color: text });
  });

  it('tem 60 de altura na pessoa e 48 no administrador, em pílula', async () => {
    await render(
      <>
        <Button label="Pessoa" onPress={jest.fn()} />
        <ThemeProvider scale="admin">
          <Button label="Admin" onPress={jest.fn()} />
        </ThemeProvider>
      </>,
    );

    expect(screen.getByRole('button', { name: 'Pessoa' })).toHaveStyle({
      minHeight: 60,
      borderRadius: 30,
    });
    expect(screen.getByRole('button', { name: 'Admin' })).toHaveStyle({
      minHeight: 48,
      borderRadius: 24,
    });
  });
});
