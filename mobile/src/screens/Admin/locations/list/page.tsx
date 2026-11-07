import { useRouter } from 'expo-router';
import { services } from '@/service/container';
import { useLocationsListModel } from './locationsList.model';
import { LocationsListView } from './locationsList.view';

export const LocationsListPage = () => {
  const router = useRouter();
  const methods = useLocationsListModel({
    listBuildingsService: services.listBuildings,
    listAccessPointsService: services.listAccessPoints,
    listTerminalsService: services.listTerminals,
  });

  return (
    <LocationsListView
      {...methods}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      onOpenTerminals={() => router.push('/admin/terminals')}
      onNewBuilding={() => router.push('/admin/locations/buildings/new')}
      onEditBuilding={(id) =>
        router.push({ pathname: '/admin/locations/buildings/[id]', params: { id } })
      }
      onNewAccessPoint={(buildingId) =>
        router.push({ pathname: '/admin/locations/points/new', params: { buildingId } })
      }
      onEditAccessPoint={(id) =>
        router.push({ pathname: '/admin/locations/points/[id]', params: { id } })
      }
    />
  );
};
