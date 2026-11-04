import type { QrDenialReason } from '../../entities/DenialReason';

/** What the app shows when a QR validation is denied (doc 03, section 4.4). */
export const QR_DENIAL_MESSAGES = {} as Record<QrDenialReason, string>;

/** What the app shows when it is allowed (doc 03, section 4.4). */
export const QR_GRANTED_MESSAGE = '';
