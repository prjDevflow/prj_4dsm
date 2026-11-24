import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
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

const READ_LIMIT_MS = 8_000;
const PREPARED_FOR_MS = 30_000;

// The turnstile of the seed (backend/docs/ambiente-dev.md); 0.0018 degree of latitude is about 200 m.
const AT_TURNSTILE = { latitude: -23.30512, longitude: -45.96551, precisaoMetros: 5 };
const AWAY_FROM_TURNSTILE = { ...AT_TURNSTILE, latitude: AT_TURNSTILE.latitude + 0.0018 };

const simulatedPositions: Record<Exclude<SimulatedPosition, 'real'>, PhonePosition> = {
  catraca: AT_TURNSTILE,
  longe: AWAY_FROM_TURNSTILE,
};

const askPhone = async (): Promise<PhonePosition> => {
  const { coords } = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  const { latitude, longitude, accuracy } = coords;
  return accuracy === null
    ? { latitude, longitude }
    : { latitude, longitude, precisaoMetros: accuracy };
};

/** The GPS has no time limit of its own, and a cold start can pass the 15 s of the QR. */
const readWithLimit = async (): Promise<PhonePosition | null> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limit = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), READ_LIMIT_MS);
  });
  try {
    return await Promise.race([askPhone(), limit]);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

// Shared by the services below: the QR lasts 15 s, so the reader starts the GPS before there is a QR.
export class PositionReader {
  simulated: SimulatedPosition = 'real';
  private prepared: { position: PhonePosition; at: number } | null = null;
  private reading: Promise<PhonePosition | null> | null = null;

  simulate(position: SimulatedPosition) {
    this.simulated = position;
    this.prepared = null;
  }

  private read(): Promise<PhonePosition | null> {
    if (this.simulated !== 'real') return Promise.resolve(simulatedPositions[this.simulated]);
    this.reading ??= readWithLimit().finally(() => {
      this.reading = null;
    });
    return this.reading;
  }

  async prepare(): Promise<boolean> {
    this.prepared = null;
    const position = await this.read();
    if (position) this.prepared = { position, at: Date.now() };
    return position !== null;
  }

  /** A prepared position serves one validation, so "Tentar de novo" sees where the person is now. */
  take(): Promise<PhonePosition | null> {
    const { prepared } = this;
    this.prepared = null;
    if (prepared && Date.now() - prepared.at <= PREPARED_FOR_MS) {
      return Promise.resolve(prepared.position);
    }
    return this.read();
  }
}

export class GetLocationAccessService implements IGetLocationAccessService {
  async exec(): Promise<PermissionAccess> {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status;
  }
}

export class RequestLocationAccessService implements IRequestLocationAccessService {
  async exec(): Promise<PermissionAccess> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status;
  }
}

export class PreparePositionService implements IPreparePositionService {
  constructor(private reader: PositionReader) {}

  async exec(): Promise<boolean> {
    try {
      if (this.reader.simulated === 'real') {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') return false;
      }
      return await this.reader.prepare();
    } catch {
      return false;
    }
  }
}

export class GetPositionService implements IGetPositionService {
  constructor(private reader: PositionReader) {}

  exec(): Promise<PhonePosition | null> {
    return this.reader.take();
  }
}

export class SimulatePositionService implements ISimulatePositionService {
  constructor(private reader: PositionReader) {}

  current(): SimulatedPosition {
    return this.reader.simulated;
  }

  exec(position: SimulatedPosition): void {
    this.reader.simulate(position);
  }
}

export class ResultFeedbackService implements IResultFeedbackService {
  async exec(feedback: ResultFeedback): Promise<void> {
    const { Success, Error: Failure } = Haptics.NotificationFeedbackType;
    try {
      await Haptics.notificationAsync(feedback === 'sucesso' ? Success : Failure);
    } catch {
      // Not every phone vibrates, and the result is on the screen anyway.
    }
  }
}
