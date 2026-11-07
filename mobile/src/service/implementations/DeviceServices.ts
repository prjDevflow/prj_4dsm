import { Camera } from 'expo-camera';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { Linking } from 'react-native';
import type {
  PermissionAccess,
  Coordinates,
  IClipboardService,
  ICurrentPositionService,
  IGetCameraAccessService,
  IOpenSettingsService,
  IRequestCameraAccessService,
  IVibrateService,
} from '../IDeviceService';

/** Asks for the foreground permission and reads one position; denied or failed → null. */
export class CurrentPositionService implements ICurrentPositionService {
  async exec(): Promise<Coordinates | null> {
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) return null;
      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      return { latitude: coords.latitude, longitude: coords.longitude };
    } catch {
      // Location services off, timeout...: the person types the coordinates.
      return null;
    }
  }
}

export class ClipboardService implements IClipboardService {
  async exec(text: string): Promise<void> {
    await Clipboard.setStringAsync(text);
  }
}

export class GetCameraAccessService implements IGetCameraAccessService {
  async exec(): Promise<PermissionAccess> {
    const { status } = await Camera.getCameraPermissionsAsync();
    return status;
  }
}

export class RequestCameraAccessService implements IRequestCameraAccessService {
  async exec(): Promise<PermissionAccess> {
    const { status } = await Camera.requestCameraPermissionsAsync();
    return status;
  }
}

export class VibrateService implements IVibrateService {
  async exec(): Promise<void> {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Not every phone vibrates, and the reading goes on without it.
    }
  }
}

export class OpenSettingsService implements IOpenSettingsService {
  async exec(): Promise<void> {
    await Linking.openSettings();
  }
}
