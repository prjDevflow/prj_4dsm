import type {
  IGetLocationAccessService,
  IGetPositionService,
  IPreparePositionService,
  IRequestLocationAccessService,
  IResultFeedbackService,
  ISimulatePositionService,
  PermissionAccess,
  PhonePosition,
  ResultFeedback,
  SimulatedPosition,
} from '../IDeviceService';

export const samplePosition: PhonePosition = {
  latitude: -23.30512,
  longitude: -45.96551,
  precisaoMetros: 12.5,
};

/** Answers the given permission; `access` changes, like a person changing it in the settings. */
export class FakeGetLocationAccessService implements IGetLocationAccessService {
  calls = 0;

  constructor(public access: PermissionAccess = 'granted') {}

  async exec(): Promise<PermissionAccess> {
    this.calls += 1;
    return this.access;
  }
}

/** Plays the system's question: answers what the person would choose. */
export class FakeRequestLocationAccessService implements IRequestLocationAccessService {
  calls = 0;

  constructor(public answer: PermissionAccess = 'granted') {}

  async exec(): Promise<PermissionAccess> {
    this.calls += 1;
    return this.answer;
  }
}

export class FakePreparePositionService implements IPreparePositionService {
  calls = 0;

  constructor(public ready = true) {}

  async exec(): Promise<boolean> {
    this.calls += 1;
    return this.ready;
  }
}

/** Answers the given position; null plays a GPS that did not answer in 8 s. */
export class FakeGetPositionService implements IGetPositionService {
  calls = 0;

  constructor(public position: PhonePosition | null = samplePosition) {}

  async exec(): Promise<PhonePosition | null> {
    this.calls += 1;
    return this.position;
  }
}

export class FakeSimulatePositionService implements ISimulatePositionService {
  private position: SimulatedPosition = 'real';

  current(): SimulatedPosition {
    return this.position;
  }

  exec(position: SimulatedPosition): void {
    this.position = position;
  }
}

export class FakeResultFeedbackService implements IResultFeedbackService {
  readonly calls: ResultFeedback[] = [];

  async exec(feedback: ResultFeedback): Promise<void> {
    this.calls.push(feedback);
  }
}
