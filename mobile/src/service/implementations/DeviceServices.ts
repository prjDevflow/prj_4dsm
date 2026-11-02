import * as Clipboard from 'expo-clipboard';
import * as Location from 'expo-location';
import type { Coordinates, IClipboardService, ICurrentPositionService } from '../IDeviceService';

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
