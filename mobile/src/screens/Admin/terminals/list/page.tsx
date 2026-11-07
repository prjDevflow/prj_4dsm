import { useRouter } from 'expo-router';
import { services } from '@/service/container';
import { useTerminalsListModel } from './terminalsList.model';
import { TerminalsListView } from './terminalsList.view';

export const TerminalsListPage = () => {
  const router = useRouter();
  const methods = useTerminalsListModel({
    listTerminalsService: services.listTerminals,
    listAccessPointsService: services.listAccessPoints,
    listBuildingsService: services.listBuildings,
  });

  return (
    <TerminalsListView
      {...methods}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/admin/locations'))}
      onNew={() => router.push('/admin/terminals/new')}
      onOpen={(id) => router.push({ pathname: '/admin/terminals/[id]', params: { id } })}
    />
  );
};
