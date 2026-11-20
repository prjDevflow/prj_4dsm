// npm run dev:qr: issues a QR code for the development terminal of the seed and prints its payload.
import { SEED_IDS } from '../prisma/seed';
import { container } from '../src/main/container';
import { issueQrCredentialUseCase } from '../src/useCases/TerminalChannel/IssueQrCredential';
import { assertNotProduction, runDevQr } from './devQr';

async function main() {
  // The container does not touch the database until the first query, so both checks come first.
  // `NODE_ENV` may come from the shell or from the .env file that the container loads.
  assertNotProduction(process.env.NODE_ENV);
  try {
    await runDevQr({
      nodeEnv: container.env.NODE_ENV,
      terminalId: SEED_IDS.terminal,
      issue: (terminalId) => issueQrCredentialUseCase.execute(terminalId),
      out: (text) => process.stdout.write(text),
      err: (text) => process.stderr.write(text),
    });
  } finally {
    await container.prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
