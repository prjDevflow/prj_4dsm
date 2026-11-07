export type Coordinates = { latitude: number; longitude: number };

/** The phone's position, asking for the permission when needed; null when it cannot be read. */
export interface ICurrentPositionService {
  exec: () => Promise<Coordinates | null>;
}

export interface IClipboardService {
  exec: (text: string) => Promise<void>;
}

/** The permission as the system sees it; "undetermined" means nobody asked yet. */
export type CameraAccess = 'granted' | 'undetermined' | 'denied';

/** Reads the permission, without showing the system's question. */
export interface IGetCameraAccessService {
  exec: () => Promise<CameraAccess>;
}

/** Shows the system's question and answers what the person chose. */
export interface IRequestCameraAccessService {
  exec: () => Promise<CameraAccess>;
}

/** A short vibration; a phone that cannot vibrate just stays still. */
export interface IVibrateService {
  exec: () => Promise<void>;
}

/** Opens the app's page in the system settings, where a denied permission can be changed. */
export interface IOpenSettingsService {
  exec: () => Promise<void>;
}
