import { useLocalSearchParams, useRouter } from 'expo-router';
import { services } from '@/service/container';
import { useTagEnrollModel } from './tagEnroll.model';
import { TagEnrollView } from './tagEnroll.view';

export const TagEnrollPage = () => {
  const router = useRouter();
  const { usuarioId } = useLocalSearchParams<{ usuarioId: string }>();
  const methods = useTagEnrollModel({
    usuarioId,
    enableEnrollModeService: services.enableEnrollMode,
    listNfcTagsService: services.listNfcTags,
    listTerminalsService: services.listTerminals,
    listUsersService: services.listUsers,
  });
  const toList = () => (router.canGoBack() ? router.back() : router.replace('/admin/tags'));

  return <TagEnrollView {...methods} onBack={toList} onDone={toList} />;
};
