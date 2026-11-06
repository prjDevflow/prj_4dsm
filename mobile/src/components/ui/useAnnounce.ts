import { useEffect } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Announces a message when it appears or changes. Android reads `accessibilityLiveRegion` on its own;
 * iOS has no live regions, so VoiceOver needs an explicit announcement.
 */
export const useAnnounce = (message: string | null | undefined) => {
  useEffect(() => {
    if (message && Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(message);
  }, [message]);
};
