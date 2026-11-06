import { Stack, useRouter } from 'expo-router';
import { services } from '@/service/container';
import { useNewAuthorizationModel } from './newAuthorization.model';
import { NewAuthorizationView } from './newAuthorization.view';

/** "/admin/authorizations/new": T24. Until F08, it goes back to where it was opened. */
export const NewAuthorizationPage = () => {
  const router = useRouter();
  const methods = useNewAuthorizationModel({
    listUsersService: services.listUsers,
    listBuildingsService: services.listBuildings,
    listAccessPointsService: services.listAccessPoints,
    createAuthorizationService: services.createAuthorization,
    onClose: () => (router.canGoBack() ? router.back() : router.replace('/')),
  });

  return (
    <>
      {/* With changes, the iPhone swipe would lose them without asking: only the buttons leave. */}
      <Stack.Screen options={{ gestureEnabled: !methods.isDirty }} />
      <NewAuthorizationView
        {...methods}
        onGoToUsers={() => router.push('/admin/users/new')}
        onGoToLocations={() => router.push('/admin/locations')}
      />
    </>
  );
};
