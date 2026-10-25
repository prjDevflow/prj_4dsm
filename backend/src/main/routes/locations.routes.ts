import { Router } from 'express';
import { adapt } from '../../infra/http/adapt';
import { createAccessPointController } from '../../useCases/Locations/CreateAccessPoint';
import { createBuildingController } from '../../useCases/Locations/CreateBuilding';
import { listAccessPointsController } from '../../useCases/Locations/ListAccessPoints';
import { listBuildingsController } from '../../useCases/Locations/ListBuildings';
import { updateAccessPointController } from '../../useCases/Locations/UpdateAccessPoint';
import { updateBuildingController } from '../../useCases/Locations/UpdateBuilding';
import { authenticate, authorize } from '../middlewares';

export function buildLocationsRoutes() {
  const router = Router();
  const adminOnly = [authenticate(), authorize('ADMIN')];

  router.post('/buildings', ...adminOnly, adapt(createBuildingController));
  router.get('/buildings', ...adminOnly, adapt(listBuildingsController));
  router.patch('/buildings/:id', ...adminOnly, adapt(updateBuildingController));

  router.post('/access-points', ...adminOnly, adapt(createAccessPointController));
  router.get('/access-points', ...adminOnly, adapt(listAccessPointsController));
  router.patch('/access-points/:id', ...adminOnly, adapt(updateAccessPointController));

  return router;
}
