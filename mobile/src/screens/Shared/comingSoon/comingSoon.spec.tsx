import { fireEvent, render, screen } from '@testing-library/react-native';
import { comingSoonArea } from './comingSoon.areas';
import { ComingSoonView } from './comingSoon.view';

describe('Em breve', () => {
  it.each([
    ['catraca', 'Abrir catraca', 'F10'],
    ['minhas-autorizacoes', 'Minhas autorizações', 'F09'],
    ['meu-historico', 'Meu histórico', 'F12'],
    ['autorizacoes', 'Autorizações', 'F08'],
    ['tags', 'Tags NFC', 'F13'],
    ['historico', 'Histórico', 'F12'],
  ])('a área %s é "%s", que chega na %s', (area, title, step) => {
    expect(comingSoonArea(area)).toMatchObject({ title, step });
  });

  it('área desconhecida (ou que já chegou, como "usuarios") não existe', () => {
    expect(comingSoonArea('qualquer')).toBeNull();
    expect(comingSoonArea('usuarios')).toBeNull();
    expect(comingSoonArea('locais')).toBeNull();
  });

  it('a tela mostra o título, que a tela chega em breve, e o "Voltar"', async () => {
    const onBack = jest.fn();
    await render(<ComingSoonView area={comingSoonArea('tags')!} onBack={onBack} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));

    expect(screen.getByRole('header', { name: 'Tags NFC' })).toBeOnTheScreen();
    expect(screen.getByText('Em breve')).toBeOnTheScreen();
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('"Autorizações" já oferece "Nova autorização" enquanto a lista não chega', async () => {
    const onAction = jest.fn();
    await render(
      <ComingSoonView
        area={comingSoonArea('autorizacoes')!}
        onBack={jest.fn()}
        onAction={onAction}
      />,
    );

    expect(screen.getByText('A lista chega na etapa F08 do app.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Nova autorização' }));

    expect(onAction).toHaveBeenCalledWith('/admin/authorizations/new');
  });
});
