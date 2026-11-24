import { act, renderHook } from '@testing-library/react-native';
import { useNow } from './useNow';

describe('useNow', () => {
  afterEach(() => jest.useRealTimers());

  it('lê o relógio de novo a cada intervalo', async () => {
    jest.useFakeTimers();
    let current = new Date('2026-11-02T15:00:00.000Z');
    const clock = () => current;
    const { result } = await renderHook(() => useNow(clock, 30_000));
    expect(result.current).toEqual(new Date('2026-11-02T15:00:00.000Z'));

    current = new Date('2026-11-02T15:00:30.000Z');
    await act(() => jest.advanceTimersByTimeAsync(30_000));

    expect(result.current).toEqual(new Date('2026-11-02T15:00:30.000Z'));
  });

  it('sem relógio dado, usa o do aparelho', async () => {
    jest.useFakeTimers({ now: new Date('2026-11-02T15:00:00.000Z') });
    const { result } = await renderHook(() => useNow());

    await act(() => jest.advanceTimersByTimeAsync(30_000));

    expect(result.current.toISOString()).toBe('2026-11-02T15:00:30.000Z');
  });
});
