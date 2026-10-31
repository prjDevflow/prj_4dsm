export interface DevQrIssued {
  payload: string;
  expiraEm: string;
}

export interface DevQrDeps {
  nodeEnv: string | undefined;
  terminalId: string;
  issue(terminalId: string): Promise<DevQrIssued>;
  /** The payload only, so it can be piped into a QR renderer. */
  out(text: string): void;
  /** Everything else a person should read. */
  err(text: string): void;
}

export function assertNotProduction(nodeEnv: string | undefined) {
  void nodeEnv;
}

export async function runDevQr(deps: DevQrDeps) {
  void deps;
}
