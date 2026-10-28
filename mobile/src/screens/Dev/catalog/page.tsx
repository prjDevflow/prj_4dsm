import { Redirect, useRouter } from 'expo-router';
import { useCatalogModel } from './catalog.model';
import { CatalogView } from './catalog.view';

const CatalogScreen = () => {
  const router = useRouter();
  const methods = useCatalogModel();
  return <CatalogView {...methods} onBack={() => router.back()} />;
};

/** Component catalog: only in development; release builds go back to the start. */
export const CatalogPage = () => (__DEV__ ? <CatalogScreen /> : <Redirect href="/" />);
