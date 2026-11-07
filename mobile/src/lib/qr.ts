// The only rule about the QR format in the app (`00-onboarding.md`, 2.3). The server decides the rest.
const SYSTEM_QR = /^ACS1:[A-Za-z0-9_-]{22}$/;

export const isSystemQr = (text: string) => SYSTEM_QR.test(text);
