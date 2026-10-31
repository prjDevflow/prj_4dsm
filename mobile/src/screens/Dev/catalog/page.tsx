import { Redirect, useRouter } from 'expo-router';
import { useCatalogModel } from './catalog.model';
import { CatalogView } from './catalog.view';

const CatalogScreen = () => {
  const router = useRouter();
  const methods = useCatalogModel();
  // Opened by a direct link there is no screen behind it: go to the start instead.
  const onBack = () => (router.canGoBack() ? router.back() : router.replace('/'));
  return <CatalogView {...methods} onBack={onBack} />;
};

/** Component catalog: only in development; release builds go back to the start. */
export const CatalogPage = () => (__DEV__ ? <CatalogScreen /> : <Redirect href="/" />);
