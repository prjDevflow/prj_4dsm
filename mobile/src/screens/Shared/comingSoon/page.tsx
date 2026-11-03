import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { comingSoonArea } from './comingSoon.areas';
import { ComingSoonView } from './comingSoon.view';

export const ComingSoonPage = () => {
  const router = useRouter();
  const { area } = useLocalSearchParams<{ area: string }>();
  const found = comingSoonArea(area ?? '');

  if (!found) return <Redirect href="/" />;
  return (
    <ComingSoonView
      area={found}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      onAction={(href) => router.push(href)}
    />
  );
};
