export type Coordinates = { latitude: number; longitude: number };

/** The phone's position, asking for the permission when needed; null when it cannot be read. */
export interface ICurrentPositionService {
  exec: () => Promise<Coordinates | null>;
}

export interface IClipboardService {
  exec: (text: string) => Promise<void>;
}

/** The permission as the system sees it; "undetermined" means nobody asked yet. */
export type PermissionAccess = 'granted' | 'undetermined' | 'denied';

/** Reads the permission, without showing the system's question. */
export interface IGetCameraAccessService {
  exec: () => Promise<PermissionAccess>;
}

/** Shows the system's question and answers what the person chose. */
export interface IRequestCameraAccessService {
  exec: () => Promise<PermissionAccess>;
}

/** The location permission, read without showing the system's question. */
export interface IGetLocationAccessService {
  exec: () => Promise<PermissionAccess>;
}

/** Shows the system's question about the location. */
export interface IRequestLocationAccessService {
  exec: () => Promise<PermissionAccess>;
}

/** Where the phone is, for a validation. The accuracy goes along when the phone tells it. */
export type PhonePosition = Coordinates & { precisaoMetros?: number };

/** Starts the GPS ahead of the QR, without asking anything; answers whether a position is ready. */
export interface IPreparePositionService {
  exec: () => Promise<boolean>;
}

/** The position of one validation, up to 8 s; null when there is none. */
export interface IGetPositionService {
  exec: () => Promise<PhonePosition | null>;
}

export type SimulatedPosition = 'real' | 'catraca' | 'longe';

/** To rehearse a validation away from the turnstile, in `__DEV__` only. */
export interface ISimulatePositionService {
  current: () => SimulatedPosition;
  exec: (position: SimulatedPosition) => void;
}

export type ResultFeedback = 'sucesso' | 'erro';

/** The vibration of a result; a phone that cannot vibrate just stays still. */
export interface IResultFeedbackService {
  exec: (feedback: ResultFeedback) => Promise<void>;
}

/** A short vibration; a phone that cannot vibrate just stays still. */
export interface IVibrateService {
  exec: () => Promise<void>;
}

/** Opens the app's page in the system settings, where a denied permission can be changed. */
export interface IOpenSettingsService {
  exec: () => Promise<void>;
}
