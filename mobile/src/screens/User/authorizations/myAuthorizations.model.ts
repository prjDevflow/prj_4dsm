import { useMemo, useState } from 'react';
import { loadErrorMessage } from '@/lib/apiMessages';
import { formatPeriod } from '@/lib/dateValue';
import type { Autorizacao } from '@/lib/types/authorizations';
import { useNow } from '@/lib/useNow';
import type { ApiError } from '@/service/ApiError';
import type { IListMyAuthorizationsService } from '@/service/IAuthorizationService';
import { isAllowedNow } from './allowedNow';
import { useMyAuthorizationsQuery } from './myAuthorizationsQuery';

export type MyAuthorizationsStatus = 'loading' | 'error' | 'empty' | 'ready';

// The warning appears or goes away on its own while the screen stays open.
const CLOCK_REFRESH_MS = 30_000;

const toCard = (authorization: Autorizacao, now: Date) => {
  const { dataInicio, dataFim, horaInicio, horaFim, usosRestantes, usosPermitidos } = authorization;
  const situacao = authorization.situacaoEfetiva;

  return {
    id: authorization.id,
    local: authorization.local.nome,
    edificio: authorization.local.edificio.nome,
    situacao,
    validade: `Válida de ${formatPeriod(dataInicio, dataFim)}`,
    horario: `Das ${horaInicio} às ${horaFim}`,
    entradas: `${usosRestantes === 1 ? 'Resta' : 'Restam'} ${usosRestantes} de ${usosPermitidos}`,
    usosRestantes,
    usosPermitidos,
    foraDoHorario: situacao === 'ATIVA' && !isAllowedNow(authorization, now),
  };
};

export type AuthorizationCardData = ReturnType<typeof toCard>;

type MyAuthorizationsModelProps = {
  listMyAuthorizationsService: IListMyAuthorizationsService;
  clock?: () => Date;
};

// T04: the state comes from the server (`situacaoEfetiva`); the app only warns about the hours.
export const useMyAuthorizationsModel = ({
  listMyAuthorizationsService,
  clock,
}: MyAuthorizationsModelProps) => {
  const query = useMyAuthorizationsQuery(listMyAuthorizationsService);
  const now = useNow(clock, CLOCK_REFRESH_MS);
  const [anterioresOpen, setAnterioresOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const cards = useMemo(
    () => (query.data ?? []).map((authorization) => toCard(authorization, now)),
    [query.data, now],
  );
  const ativas = useMemo(() => cards.filter(({ situacao }) => situacao === 'ATIVA'), [cards]);
  // The API sends the ones ending first; among past ones, the latest is what the person remembers.
  const anteriores = useMemo(
    () => cards.filter(({ situacao }) => situacao !== 'ATIVA').reverse(),
    [cards],
  );

  const status: MyAuthorizationsStatus = query.data
    ? cards.length === 0
      ? 'empty'
      : 'ready'
    : query.isError
      ? 'error'
      : 'loading';

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  };

  return {
    status,
    ativas,
    anteriores,
    anterioresOpen,
    onToggleAnteriores: () => setAnterioresOpen((open) => !open),
    errorMessage: query.error ? loadErrorMessage(query.error as ApiError) : '',
    onRetry: () => query.refetch(),
    refreshing,
    onRefresh,
  };
};
