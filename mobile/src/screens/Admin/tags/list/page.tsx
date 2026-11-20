import { useRouter } from 'expo-router';
import { services } from '@/service/container';
import { useTagsListModel } from './tagsList.model';
import { TagsListView } from './tagsList.view';

export const TagsListPage = () => {
  const router = useRouter();
  const methods = useTagsListModel({
    listNfcTagsService: services.listNfcTags,
    listUsersService: services.listUsers,
  });

  return (
    <TagsListView
      {...methods}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      onNew={() => router.push('/admin/tags/new')}
      onOpen={(id) => router.push({ pathname: '/admin/tags/[id]', params: { id } })}
    />
  );
};
