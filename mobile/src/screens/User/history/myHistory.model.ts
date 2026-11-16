import type { IListMyAccessEventsService } from '@/service/IAccessEventService';
import {
  accessEventsQueryKeys,
  PAGE_SIZE,
  useAccessEventsList,
} from '@/screens/Admin/history/historyQueries';

type MyHistoryModelProps = { listMyAccessEventsService: IListMyAccessEventsService };

// T12: the person's own attempts, newest first, without filters.
export const useMyHistoryModel = ({ listMyAccessEventsService }: MyHistoryModelProps) =>
  useAccessEventsList(accessEventsQueryKeys.mine, (page) =>
    listMyAccessEventsService.exec({ page, pageSize: PAGE_SIZE }),
  );
