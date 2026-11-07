export type Coordinates = { latitude: number; longitude: number };

/** The phone's position, asking for the permission when needed; null when it cannot be read. */
export interface ICurrentPositionService {
  exec: () => Promise<Coordinates | null>;
}

export interface IClipboardService {
  exec: (text: string) => Promise<void>;
}
