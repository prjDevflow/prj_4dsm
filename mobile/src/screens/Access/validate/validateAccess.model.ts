import { useEffect, useRef, useState } from 'react';
import { isDenialReason, type DenialReason } from '@/lib/denialReasons';
import type { AccessGranted } from '@/lib/types/access';
import { ApiError } from '@/service/ApiError';
import type { IValidateQrService } from '@/service/IAccessService';
import type {
  IGetLocationAccessService,
  IGetPositionService,
  IOpenSettingsService,
  IRequestLocationAccessService,
  IResultFeedbackService,
} from '@/service/IDeviceService';
import { usePermission, type PermissionStatus } from '../usePermission';

/** A result is a value, not an exception: a denial is an answer, and it has its own screen. */
export type AccessResult =
  | { tipo: 'AUTORIZADO'; local: string; usosRestantes: number; ocorridoEm: string }
  | { tipo: 'NEGADO'; motivo: DenialReason }
  | { tipo: 'SEM_CONEXAO' }
  | { tipo: 'ERRO_SERVIDOR' };

export type ValidateStage = 'checking' | 'ask' | 'denied' | 'locating' | 'validating' | 'result';

type ValidateAccessModelProps = {
  /** The text of the QR, already filtered by the reader. */
  payload: string;
  getLocationAccessService: IGetLocationAccessService;
  requestLocationAccessService: IRequestLocationAccessService;
  getPositionService: IGetPositionService;
  validateQrService: IValidateQrService;
  openSettingsService: IOpenSettingsService;
  resultFeedbackService: IResultFeedbackService;
};

const toGranted = ({ local, usosRestantes, ocorridoEm }: AccessGranted): AccessResult => ({
  tipo: 'AUTORIZADO',
  local: local.nome,
  usosRestantes,
  ocorridoEm,
});

/** Decides by the code: a 403 is also a profile without permission (FORBIDDEN). */
const toFailure = (error: unknown): AccessResult => {
  if (!(error instanceof ApiError)) return { tipo: 'ERRO_SERVIDOR' };
  if (error.status === 403 && isDenialReason(error.code)) {
    return { tipo: 'NEGADO', motivo: error.code };
  }
  if (error.code === 'NETWORK' || error.code === 'TIMEOUT') return { tipo: 'SEM_CONEXAO' };
  return { tipo: 'ERRO_SERVIDOR' };
};

const isSessionExpired = (error: unknown) => error instanceof ApiError && error.status === 401;

// "failed" also goes on: without a position the server answers LOCALIZACAO_INVALIDA and records it.
const stageOf: Record<PermissionStatus, ValidateStage> = {
  checking: 'checking',
  undetermined: 'ask',
  denied: 'denied',
  granted: 'locating',
  failed: 'locating',
};

// T08 to T11. Only the first pass sends: no retry of its own, and no second send on the same QR.
export const useValidateAccessModel = ({
  payload,
  getLocationAccessService,
  requestLocationAccessService,
  getPositionService,
  validateQrService,
  openSettingsService,
  resultFeedbackService,
}: ValidateAccessModelProps) => {
  const permission = usePermission({
    getAccessService: getLocationAccessService,
    requestAccessService: requestLocationAccessService,
    openSettingsService,
  });
  const [progress, setProgress] = useState<'locating' | 'validating' | null>(null);
  const [located, setLocated] = useState(false);
  const [result, setResult] = useState<AccessResult | null>(null);
  const started = useRef(false);

  const canGoOn = stageOf[permission.status] === 'locating';

  useEffect(() => {
    if (!canGoOn || started.current) return;
    started.current = true;

    const show = (shown: AccessResult) => {
      void resultFeedbackService.exec(shown.tipo === 'AUTORIZADO' ? 'sucesso' : 'erro');
      setResult(shown);
    };

    const validate = async () => {
      setProgress('locating');
      const position = await getPositionService.exec();
      setLocated(position !== null);
      setProgress('validating');
      try {
        show(toGranted(await validateQrService.exec({ payload, ...position })));
      } catch (error) {
        // The session store already took the person to the login.
        if (!isSessionExpired(error)) show(toFailure(error));
      }
    };

    void validate();
  }, [canGoOn, payload, getPositionService, validateQrService, resultFeedbackService]);

  return {
    stage: result ? 'result' : (progress ?? stageOf[permission.status]),
    located,
    result,
    onAllow: permission.ask,
    onOpenSettings: permission.openSettings,
  };
};
