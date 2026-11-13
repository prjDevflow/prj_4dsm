import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useToast } from '@/components/ui';
import type { TagNfc } from '@/lib/types/nfcTags';
import type { ApiError } from '@/service/ApiError';
import type { IUpdateNfcTagService } from '@/service/INfcTagService';
import type { IListUsersService } from '@/service/IUserService';
import { usePeopleQuery } from '../../users/usersQueries';
import { toggleErrorMessage, UNKNOWN_PERSON } from '../tags.messages';
import { nfcTagsQueryKeys, type NfcTagPages } from '../tagsQueries';

type TagDetailModelProps = {
  tagId: string;
  updateNfcTagService: IUpdateNfcTagService;
  listUsersService: IListUsersService;
};

/**
 * The API has no route for one tag, and the list already brought every field, so the detail reads
 * it from the pages already loaded, like the T27.
 */
const findInLists = (queryClient: ReturnType<typeof useQueryClient>, id: string) => {
  for (const [, data] of queryClient.getQueriesData<NfcTagPages>({
    queryKey: nfcTagsQueryKeys.all,
  })) {
    const found = data?.pages.flatMap((page) => page.data).find((tag) => tag.id === id);
    if (found) return found;
  }
  return null;
};

// Detail of a tag: deactivating asks first, because the terminal stops accepting it at once.
export const useTagDetailModel = ({
  tagId,
  updateNfcTagService,
  listUsersService,
}: TagDetailModelProps) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [tag, setTag] = useState<TagNfc | null>(() => findInLists(queryClient, tagId));
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const people = usePeopleQuery(listUsersService, { onlyActive: false });
  const pessoa = tag
    ? (people.data?.find((person) => person.id === tag.usuarioId)?.nome ??
      (people.data ? UNKNOWN_PERSON : ''))
    : '';

  const toggle = useMutation<TagNfc, ApiError, boolean>({
    mutationFn: (ativa) => updateNfcTagService.exec(tagId, ativa),
    onSuccess: (saved) => {
      setTag(saved);
      setConfirmVisible(false);
      // The list shows the new badge at once; a refetch confirms it in the background.
      queryClient.setQueriesData<NfcTagPages>({ queryKey: nfcTagsQueryKeys.all }, (data) =>
        data
          ? {
              ...data,
              pages: data.pages.map((page) => ({
                ...page,
                data: page.data.map((item) => (item.id === saved.id ? saved : item)),
              })),
            }
          : data,
      );
      void queryClient.invalidateQueries({ queryKey: nfcTagsQueryKeys.all });
      toast.show(saved.ativa ? 'Tag ativada.' : 'Tag desativada.');
    },
    onError: (error) => {
      setConfirmVisible(false);
      setApiError(toggleErrorMessage(error));
    },
  });

  return {
    tag,
    pessoa,
    confirmVisible,
    isSaving: toggle.isPending,
    apiError,
    onToggleAtiva: (ativa: boolean) => {
      setApiError(null);
      if (ativa) toggle.mutate(true);
      else setConfirmVisible(true);
    },
    onConfirmDeactivate: () => toggle.mutateAsync(false).catch(() => undefined),
    onCancelDeactivate: () => setConfirmVisible(false),
  };
};
