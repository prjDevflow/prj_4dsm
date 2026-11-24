import { useQuery } from '@tanstack/react-query';
import { fetchAllPages } from '@/lib/fetchAllPages';
import { authorizationsQueryKeys } from '@/screens/Admin/authorizations/authorizationsQueries';
import type { IListMyAuthorizationsService } from '@/service/IAuthorizationService';

// T04 and the counter of T03 read the same answer. A person has few authorizations, and T04 needs
// them all to split the sections, so there is no "load more".
export const useMyAuthorizationsQuery = (service: IListMyAuthorizationsService) =>
  useQuery({
    queryKey: authorizationsQueryKeys.mine,
    queryFn: () => fetchAllPages((page) => service.exec(page)),
  });
