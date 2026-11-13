import { useLocalSearchParams, useRouter } from 'expo-router';
import { services } from '@/service/container';
import { useTagDetailModel } from './tagDetail.model';
import { TagDetailView } from './tagDetail.view';

export const TagDetailPage = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const methods = useTagDetailModel({
    tagId: id,
    updateNfcTagService: services.updateNfcTag,
    listUsersService: services.listUsers,
  });

  return (
    <TagDetailView
      {...methods}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/admin/tags'))}
    />
  );
};
