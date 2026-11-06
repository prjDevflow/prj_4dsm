import { renderHook, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { useReducedMotion } from './useReducedMotion';

describe('useReducedMotion', () => {
  afterEach(() => jest.restoreAllMocks());

  it('segue a opção "remover animações" do sistema', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);

    const { result } = await renderHook(() => useReducedMotion());

    await waitFor(() => expect(result.current).toBe(true));
  });

  it('anima quando o sistema não pede para reduzir', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);

    const { result } = await renderHook(() => useReducedMotion());

    await waitFor(() => expect(result.current).toBe(false));
  });
});
