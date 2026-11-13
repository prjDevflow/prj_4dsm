import { fireEvent, render, screen } from '@testing-library/react-native';
import { comingSoonArea } from './comingSoon.areas';
import { ComingSoonView } from './comingSoon.view';

describe('Em breve', () => {
  it('área desconhecida (ou que já chegou, como "usuarios") não existe', () => {
    expect(comingSoonArea('qualquer')).toBeNull();
    expect(comingSoonArea('usuarios')).toBeNull();
    expect(comingSoonArea('locais')).toBeNull();
    expect(comingSoonArea('autorizacoes')).toBeNull();
    expect(comingSoonArea('tags')).toBeNull();
  });

  it('a tela mostra o título, que a tela chega em breve, e o "Voltar"', async () => {
    const onBack = jest.fn();
    const area = { title: 'Tags NFC', step: 'F13', icon: 'nfc' as const, admin: true };
    await render(<ComingSoonView area={area} onBack={onBack} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));

    expect(screen.getByRole('header', { name: 'Tags NFC' })).toBeOnTheScreen();
    expect(screen.getByText('Em breve')).toBeOnTheScreen();
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
