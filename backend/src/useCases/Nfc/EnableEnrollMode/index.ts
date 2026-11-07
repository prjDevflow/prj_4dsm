import { container as c } from '../../../main/container';
import { EnableEnrollModeController } from './EnableEnrollMode_Controller';
import { EnableEnrollModeUseCase } from './EnableEnrollMode_UseCase';

const useCase = new EnableEnrollModeUseCase(c.terminals, c.users, c.clock, {
  enrollModeSeconds: c.env.ENROLL_MODE_SECONDS,
});
export const enableEnrollModeController = new EnableEnrollModeController(useCase);
