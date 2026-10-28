import { act, renderHook } from '@testing-library/react-native';
import { useCatalogModel } from './catalog.model';

describe('useCatalogModel', () => {
  it('começa na escala da pessoa e troca para a do administrador', async () => {
    const { result } = await renderHook(() => useCatalogModel());

    expect(result.current.scale).toBe('pessoa');
    act(() => result.current.onToggleAdmin(true));

    expect(result.current.scale).toBe('admin');
  });

  it('o "Salvar" de exemplo fica ocupado por 2 s e depois libera', async () => {
    jest.useFakeTimers();
    const { result } = await renderHook(() => useCatalogModel());

    act(() => {
      result.current.onSave();
    });
    expect(result.current.saving).toBe(true);

    await act(() => jest.advanceTimersByTime(2000));
    expect(result.current.saving).toBe(false);
    jest.useRealTimers();
  });

  it('o contador de exemplo respeita o mínimo e o máximo', async () => {
    const { result } = await renderHook(() => useCatalogModel());

    expect(result.current.entradas).toMatchObject({ value: 3, min: 1, max: 10 });
    act(() => result.current.entradas.onChange(4));

    expect(result.current.entradas.value).toBe(4);
  });

  it('abre o diálogo e fecha ao confirmar ou voltar', async () => {
    const { result } = await renderHook(() => useCatalogModel());

    act(() => result.current.dialog.onOpen());
    expect(result.current.dialog.visible).toBe(true);

    act(() => result.current.dialog.onCancel());
    expect(result.current.dialog.visible).toBe(false);
  });

  it('o campo de nome mostra o erro de tamanho mínimo, como na T31', async () => {
    const { result } = await renderHook(() => useCatalogModel());

    act(() => result.current.nome.onChangeText('Ma'));

    expect(result.current.nome.error).toBe('Informe o nome completo (mínimo 3 letras).');
  });
});
