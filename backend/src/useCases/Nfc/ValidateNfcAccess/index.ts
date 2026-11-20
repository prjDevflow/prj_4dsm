import { container as c } from '../../../main/container';
import { accessEventRecorder } from '../../Events';
import { ValidateNfcAccessController } from './ValidateNfcAccess_Controller';
import { ValidateNfcAccessUseCase } from './ValidateNfcAccess_UseCase';

const useCase = new ValidateNfcAccessUseCase(
  c.terminals,
  c.nfcTags,
  c.users,
  c.authorizations,
  c.accessEvents,
  c.accessGrants,
  accessEventRecorder,
  c.ids,
  c.clock,
  { debounceSeconds: c.env.NFC_DEBOUNCE_SECONDS, aberturaMs: c.env.OPEN_DURATION_MS },
);
export const validateNfcAccessController = new ValidateNfcAccessController(useCase);
