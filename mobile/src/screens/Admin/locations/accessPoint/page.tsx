import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { services } from '@/service/container';
import { useAccessPointFormModel } from './accessPointForm.model';
import { AccessPointFormView } from './accessPointForm.view';

/** "/admin/locations/points/new?buildingId=<id>" creates; "/admin/locations/points/<id>" edits. */
export const AccessPointFormPage = () => {
  const router = useRouter();
  const { id, buildingId } = useLocalSearchParams<{ id?: string; buildingId?: string }>();
  const methods = useAccessPointFormModel({
    accessPointId: id,
    initialBuildingId: buildingId,
    listBuildingsService: services.listBuildings,
    listAccessPointsService: services.listAccessPoints,
    createAccessPointService: services.createAccessPoint,
    updateAccessPointService: services.updateAccessPoint,
    currentPositionService: services.currentPosition,
    onClose: () => (router.canGoBack() ? router.back() : router.replace('/admin/locations')),
  });

  return (
    <>
      <Stack.Screen options={{ gestureEnabled: !methods.isDirty }} />
      <AccessPointFormView {...methods} />
    </>
  );
};
