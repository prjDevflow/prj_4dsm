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

/** A development tool that mints valid QR codes must never run against a production environment. */
export function assertNotProduction(nodeEnv: string | undefined) {
  if (nodeEnv === 'production') {
    throw new Error('dev:qr não roda com NODE_ENV=production.');
  }
}

export async function runDevQr(deps: DevQrDeps) {
  assertNotProduction(deps.nodeEnv);
  const issued = await deps.issue(deps.terminalId);
  deps.out(`${issued.payload}\n`);
  deps.err(`QR emitido para o terminal ${deps.terminalId}, válido até ${issued.expiraEm}.\n`);
}
