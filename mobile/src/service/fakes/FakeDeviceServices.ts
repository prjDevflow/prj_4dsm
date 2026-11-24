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

/** Answers the given position (Edifício Central by default); willDeny makes it answer null. */
export class FakeCurrentPositionService implements ICurrentPositionService {
  calls = 0;
  private result: Coordinates | null;

  constructor(position: Coordinates | null = { latitude: -23.30512, longitude: -45.96551 }) {
    this.result = position;
  }

  willDeny() {
    this.result = null;
  }

  async exec(): Promise<Coordinates | null> {
    this.calls += 1;
    return this.result;
  }
}

/** Keeps what was copied in `copied`, so a test can check it without a real clipboard. */
export class FakeClipboardService implements IClipboardService {
  readonly copied: string[] = [];

  async exec(text: string): Promise<void> {
    this.copied.push(text);
  }
}

/** Answers the given permission; `access` changes, like a person changing it in the settings. */
export class FakeGetCameraAccessService implements IGetCameraAccessService {
  calls = 0;

  constructor(public access: PermissionAccess = 'granted') {}

  async exec(): Promise<PermissionAccess> {
    this.calls += 1;
    return this.access;
  }
}

/** Plays the system's question: answers what the person would choose. */
export class FakeRequestCameraAccessService implements IRequestCameraAccessService {
  calls = 0;

  constructor(public answer: PermissionAccess = 'granted') {}

  async exec(): Promise<PermissionAccess> {
    this.calls += 1;
    return this.answer;
  }
}

export class FakeVibrateService implements IVibrateService {
  calls = 0;

  async exec(): Promise<void> {
    this.calls += 1;
  }
}

export class FakeOpenSettingsService implements IOpenSettingsService {
  calls = 0;

  async exec(): Promise<void> {
    this.calls += 1;
  }
}
