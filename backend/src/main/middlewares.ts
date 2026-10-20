import { makeAuthenticate } from '../infra/http/authenticate';
import { authenticateUser } from '../useCases/Auth/AuthenticateUser';

export { authorize } from '../infra/http/authorize';
export const authenticate = makeAuthenticate(authenticateUser);
