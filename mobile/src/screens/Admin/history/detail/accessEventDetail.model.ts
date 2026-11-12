import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { EventoDeAcesso } from '@/lib/types/accessEvents';
import { accessEventsQueryKeys, type AccessEventsPages } from '../historyQueries';

/**
 * T27: the API has no route for one event, and the list already brought every field, so the
 * detail reads the attempt from the pages already loaded. Events never change.
 */
export const useAccessEventDetail = (id: string) => {
  const queryClient = useQueryClient();
  const [event] = useState<EventoDeAcesso | null>(() => {
    const cached = queryClient.getQueriesData<AccessEventsPages>({
      queryKey: accessEventsQueryKeys.all,
    });
    for (const [, data] of cached) {
      const found = data?.pages.flatMap((page) => page.data).find((item) => item.id === id);
      if (found) return found;
    }
    return null;
  });

  return { event };
};
