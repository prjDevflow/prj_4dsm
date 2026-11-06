import { fireEvent, render, screen } from '@testing-library/react-native';
import { comingSoonArea } from './comingSoon.areas';
import { ComingSoonView } from './comingSoon.view';

describe('Em breve', () => {
  it.each([
    ['catraca', 'Abrir catraca', 'F10'],
    ['minhas-autorizacoes', 'Minhas autorizações', 'F09'],
    ['meu-historico', 'Meu histórico', 'F12'],
    ['tags', 'Tags NFC', 'F13'],
    ['historico', 'Histórico', 'F12'],
  ])('a área %s é "%s", que chega na %s', (area, title, step) => {
    expect(comingSoonArea(area)).toMatchObject({ title, step });
  });

  it('área desconhecida (ou que já chegou, como "usuarios") não existe', () => {
    expect(comingSoonArea('qualquer')).toBeNull();
    expect(comingSoonArea('usuarios')).toBeNull();
    expect(comingSoonArea('locais')).toBeNull();
    expect(comingSoonArea('autorizacoes')).toBeNull();
  });

  it('a tela mostra o título, que a tela chega em breve, e o "Voltar"', async () => {
    const onBack = jest.fn();
    await render(<ComingSoonView area={comingSoonArea('tags')!} onBack={onBack} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));

    expect(screen.getByRole('header', { name: 'Tags NFC' })).toBeOnTheScreen();
    expect(screen.getByText('Em breve')).toBeOnTheScreen();
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
