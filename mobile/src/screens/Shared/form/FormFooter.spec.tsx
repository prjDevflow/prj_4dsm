import { render, screen } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import { FormFooter } from './FormFooter';

const withFontScale = (fontScale: number) => {
  const window = Dimensions.get('window');
  jest.spyOn(Dimensions, 'get').mockReturnValue({ ...window, fontScale });
};

const renderFooter = () =>
  render(
    <FormFooter
      apiError="Algo deu errado."
      isSaving={false}
      onCancel={jest.fn()}
      onSave={jest.fn()}
      saveLabel="Criar autorização"
      savingLabel="Criando…"
    />,
  );

describe('FormFooter', () => {
  afterEach(() => jest.restoreAllMocks());

  it('mostra a faixa de erro e os dois botões, com o texto pedido', async () => {
    withFontScale(1);
    await renderFooter();

    expect(screen.getByText('Algo deu errado.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Criar autorização' })).toBeOnTheScreen();
  });

  it('com a fonte normal os botões ficam lado a lado; a partir de 130%, um embaixo do outro', async () => {
    withFontScale(1);
    await renderFooter();
    expect(screen.getByTestId('form-footer-actions')).toHaveStyle({ flexDirection: 'row' });

    withFontScale(1.3);
    await renderFooter();
    expect(screen.getAllByTestId('form-footer-actions').at(-1)).toHaveStyle({
      flexDirection: 'column-reverse',
    });
    // Stacked, each button keeps its own height (flex: 1 would squash them into the same spot).
    const save = screen.getAllByRole('button', { name: 'Criar autorização' }).at(-1)!;
    expect(save.parent?.parent).not.toHaveStyle({ flex: 1 });
  });
});
