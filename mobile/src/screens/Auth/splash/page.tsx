import type { ReactNode } from 'react';
import { services } from '@/service/container';
import { useSplashModel } from './splash.model';
import { SplashView } from './splash.view';

/** T01: shows the opening while the saved session is restored, then the app routes. */
export const SplashPage = ({ children }: { children: ReactNode }) => {
  const methods = useSplashModel({ getMeService: services.getMe });
  return methods.status === 'ready' ? children : <SplashView {...methods} />;
};
