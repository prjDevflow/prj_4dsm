import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { services } from '@/service/container';
import { useBuildingFormModel } from './buildingForm.model';
import { BuildingFormView } from './buildingForm.view';

/** "/admin/locations/buildings/new" creates; "/admin/locations/buildings/<id>" edits. */
export const BuildingFormPage = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const methods = useBuildingFormModel({
    buildingId: id,
    listBuildingsService: services.listBuildings,
    createBuildingService: services.createBuilding,
    updateBuildingService: services.updateBuilding,
    currentPositionService: services.currentPosition,
    onClose: () => (router.canGoBack() ? router.back() : router.replace('/admin/locations')),
  });

  return (
    <>
      {/* With changes, the iPhone swipe would lose them without asking: only the buttons leave. */}
      <Stack.Screen options={{ gestureEnabled: !methods.isDirty }} />
      <BuildingFormView {...methods} />
    </>
  );
};
