declare global {
  namespace Express {
    interface Request {
      requestId: string;
      /** Set by the `authenticate` middleware on user (JWT) routes. */
      auth?: { userId: string; perfil: import('../../entities/User').UserProfile };
      /** Set by the `authenticateTerminal` middleware on terminal routes. */
      terminal?: { terminalId: string; accessPointId: string };
    }
  }
}

export {};
