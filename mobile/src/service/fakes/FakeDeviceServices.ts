import type { Coordinates, IClipboardService, ICurrentPositionService } from '../IDeviceService';

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
