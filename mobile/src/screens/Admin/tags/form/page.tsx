import { useRouter } from 'expo-router';
import { services } from '@/service/container';
import { useTagFormModel } from './tagForm.model';
import { TagFormView } from './tagForm.view';

export const TagFormPage = () => {
  const router = useRouter();
  const methods = useTagFormModel({
    createNfcTagService: services.createNfcTag,
    listUsersService: services.listUsers,
    onClose: () => (router.canGoBack() ? router.back() : router.replace('/admin/tags')),
    // The tag is read on the terminal instead of typed: the form gives way to the reading.
    onOpenEnroll: (usuarioId) =>
      router.replace({ pathname: '/admin/tags/enroll', params: { usuarioId } }),
  });

  return <TagFormView {...methods} />;
};
