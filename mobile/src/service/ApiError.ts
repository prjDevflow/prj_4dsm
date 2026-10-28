export type FieldError = { field: string; message: string };

// code: a contract code (CREDENCIAIS_INVALIDAS, FORA_DO_PERIODO, ...) or an app-only code (NETWORK, TIMEOUT)
export class ApiError extends Error {
  constructor(
    readonly status: number | null,
    readonly code: string,
    message: string,
    readonly details: FieldError[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
