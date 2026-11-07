import { denialReasons, type DenialReason } from '@/lib/denialReasons';
import type { AccessGranted, ValidateQrBody } from '@/lib/types/access';
import { ApiError } from '../ApiError';
import type { IValidateQrService } from '../IAccessService';

export const sampleAccessGranted: AccessGranted = {
  resultado: 'AUTORIZADO',
  mensagem: 'Acesso autorizado. Pode passar.',
  local: { nome: 'Catraca Social' },
  usosRestantes: 2,
  distanciaM: 14,
  ocorridoEm: '2026-10-20T14:32:07Z',
};

type FakeAnswer = 'AUTORIZADO' | DenialReason | ApiError;

const denial = (reason: DenialReason) => new ApiError(403, reason, denialReasons[reason].message);

/** Answers what the test chose; without coordinates it denies, like the server. */
export class FakeValidateQrService implements IValidateQrService {
  readonly calls: ValidateQrBody[] = [];

  constructor(public answer: FakeAnswer = 'AUTORIZADO') {}

  async exec(body: ValidateQrBody): Promise<AccessGranted> {
    this.calls.push(body);
    if (this.answer instanceof ApiError) throw this.answer;
    if (this.answer !== 'AUTORIZADO') throw denial(this.answer);
    if (body.latitude === undefined) throw denial('LOCALIZACAO_INVALIDA');
    return sampleAccessGranted;
  }
}
