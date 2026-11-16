import type { InfiniteData } from '@tanstack/react-query';
import type { TagNfc } from '@/lib/types/nfcTags';
import type { Page } from '@/lib/types/page';

export const PAGE_SIZE = 20;

export const nfcTagsQueryKeys = {
  all: ['nfc-tags'] as const,
  list: (params: object) => ['nfc-tags', 'list', params] as const,
};

export type NfcTagPages = InfiniteData<Page<TagNfc>>;
