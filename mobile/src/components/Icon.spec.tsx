import { render, screen } from '@testing-library/react-native';
import { Icon, toMaterialIconName } from './Icon';

describe('Icon', () => {
  it('converte o nome do Material Symbols do Figma para o MaterialIcons', () => {
    expect(toMaterialIconName('qr_code_scanner')).toBe('qr-code-scanner');
    expect(toMaterialIconName('arrow_back')).toBe('arrow-back');
    expect(toMaterialIconName('progress_activity')).toBe('autorenew');
  });

  it('sem rótulo, é decorativo e o leitor de tela não o anuncia', async () => {
    await render(<Icon name="check" />);

    expect(screen.queryByRole('image')).toBeNull();
  });

  it('com rótulo, é anunciado como imagem', async () => {
    await render(<Icon name="wifi_off" accessibilityLabel="Sem internet" />);

    expect(screen.getByRole('image', { name: 'Sem internet' })).toBeOnTheScreen();
  });
});
