import { container as c } from '../../main/container';
import { AccessEventRecorder } from './AccessEventRecorder';

/** Shared by the access use cases (B15, B17). It has no controller: no route records an event. */
export const accessEventRecorder = new AccessEventRecorder(c.accessEvents, c.ids, c.clock, c.logger);
