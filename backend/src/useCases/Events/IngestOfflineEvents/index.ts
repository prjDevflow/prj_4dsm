import { container as c } from '../../../main/container';
import { IngestOfflineEventsController } from './IngestOfflineEvents_Controller';
import { IngestOfflineEventsUseCase } from './IngestOfflineEvents_UseCase';

const useCase = new IngestOfflineEventsUseCase(
  c.terminals,
  c.nfcTags,
  c.accessEvents,
  c.ids,
  c.clock,
);
export const ingestOfflineEventsController = new IngestOfflineEventsController(useCase);
