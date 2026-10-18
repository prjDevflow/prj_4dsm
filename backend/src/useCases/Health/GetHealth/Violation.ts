// DEMO: a use case must never import infra (docs/ai/01-architecture.md, section 1).
import { SystemClock } from '../../../infra/providers/SystemClock';

export const violation = new SystemClock();
