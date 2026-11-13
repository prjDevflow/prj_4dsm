import { useEffect, useMemo, useRef, useState } from 'react';
import type { ApiError } from '@/service/ApiError';
import type { IListTerminalsService } from '@/service/ITerminalService';
import type { IEnableEnrollModeService, IListNfcTagsService } from '@/service/INfcTagService';
import type { IListUsersService } from '@/service/IUserService';
import { useTerminalsQuery } from '../../locations/locationsQueries';
import { usePeopleQuery } from '../../users/usersQueries';
import { enrollErrorMessage } from '../tags.messages';

export type EnrollStage = 'choosing' | 'starting' | 'waiting' | 'linked' | 'expired';

export const ENROLL_SECONDS = 60;
const POLL_EVERY_SECONDS = 2;

type TagEnrollModelProps = {
  usuarioId: string;
  enableEnrollModeService: IEnableEnrollModeService;
  listNfcTagsService: IListNfcTagsService;
  listTerminalsService: IListTerminalsService;
  listUsersService: IListUsersService;
};

// T30 Ler tag no terminal (❓ 19): the terminal links the next tag it reads, and the app learns it
// by asking for the person's tags every 2 s until a new one shows up or the 60 s end.
export const useTagEnrollModel = ({
  usuarioId,
  enableEnrollModeService,
  listNfcTagsService,
  listTerminalsService,
  listUsersService,
}: TagEnrollModelProps) => {
  const [stage, setStage] = useState<EnrollStage>('choosing');
  const [terminalId, setTerminalId] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(ENROLL_SECONDS);
  const [errorMessage, setErrorMessage] = useState('');
  const known = useRef(new Set<string>());

  const terminals = useTerminalsQuery(listTerminalsService);
  const people = usePeopleQuery(listUsersService, { onlyActive: false });
  const nome = people.data?.find((person) => person.id === usuarioId)?.nome ?? 'a pessoa';

  const tagsOfPerson = () =>
    listNfcTagsService.exec({ usuarioId, page: 1, pageSize: 100 }).then((page) => page.data);

  const start = async (chosen: string) => {
    setStage('starting');
    setErrorMessage('');
    try {
      // The tags the person already has, so a new one can be told apart.
      known.current = new Set((await tagsOfPerson()).map((tag) => tag.id));
      await enableEnrollModeService.exec(chosen, usuarioId);
      setRemaining(ENROLL_SECONDS);
      setStage('waiting');
    } catch (error) {
      setStage('choosing');
      setErrorMessage(enrollErrorMessage(error as ApiError));
    }
  };

  useEffect(() => {
    if (stage !== 'waiting') return;
    let active = true;
    let left = ENROLL_SECONDS;
    const timer = setInterval(() => {
      left -= 1;
      setRemaining(left);
      if (left <= 0) {
        clearInterval(timer);
        setStage('expired');
        return;
      }
      if (left % POLL_EVERY_SECONDS !== 0) return;
      void tagsOfPerson()
        .then((tags) => {
          if (active && tags.some((tag) => !known.current.has(tag.id))) {
            clearInterval(timer);
            setStage('linked');
          }
        })
        // A failed check is tried again on the next tick.
        .catch(() => undefined);
    }, 1000);
    return () => {
      active = false;
      clearInterval(timer);
    };
    // `tagsOfPerson` only reads props that do not change on this screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  return {
    stage,
    terminalId,
    remaining,
    errorMessage,
    message:
      stage === 'linked'
        ? `Tag vinculada a ${nome}.`
        : stage === 'expired'
          ? 'Tempo esgotado. Nenhuma tag foi lida.'
          : '',
    terminalOptions: useMemo(
      () =>
        (terminals.data ?? [])
          .filter((terminal) => terminal.ativo)
          .map((terminal) => ({
            value: terminal.id,
            label: terminal.nome,
            description: terminal.online ? 'Online' : 'Offline',
          })),
      [terminals.data],
    ),
    onChooseTerminal: (chosen: string) => {
      setTerminalId(chosen);
      void start(chosen);
    },
    onTryAgain: () => {
      if (terminalId) void start(terminalId);
    },
  };
};
