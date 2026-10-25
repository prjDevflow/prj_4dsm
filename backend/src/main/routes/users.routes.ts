import { Router } from 'express';
import { adapt } from '../../infra/http/adapt';
import { createUserController } from '../../useCases/Users/CreateUser';
import { getUserController } from '../../useCases/Users/GetUser';
import { listUsersController } from '../../useCases/Users/ListUsers';
import { updateUserController } from '../../useCases/Users/UpdateUser';
import { authenticate, authorize } from '../middlewares';

export function buildUsersRoutes() {
  const router = Router();
  const adminOnly = [authenticate(), authorize('ADMIN')];

  router.post('/users', ...adminOnly, adapt(createUserController));
  router.get('/users', ...adminOnly, adapt(listUsersController));
  router.get('/users/:id', ...adminOnly, adapt(getUserController));
  router.patch('/users/:id', ...adminOnly, adapt(updateUserController));

  return router;
}
