import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { services } from '@/service/container';
import { useUserFormModel } from './userForm.model';
import { UserFormView } from './userForm.view';

/** "/admin/users/new" creates; "/admin/users/<id>" edits. */
export const UserFormPage = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const methods = useUserFormModel({
    userId: id,
    getUserService: services.getUser,
    createUserService: services.createUser,
    updateUserService: services.updateUser,
    onClose: () => (router.canGoBack() ? router.back() : router.replace('/admin/users')),
  });

  return (
    <>
      {/* With changes, the iPhone swipe would lose them without asking: only the buttons leave. */}
      <Stack.Screen options={{ gestureEnabled: !methods.isDirty }} />
      <UserFormView {...methods} />
    </>
  );
};
