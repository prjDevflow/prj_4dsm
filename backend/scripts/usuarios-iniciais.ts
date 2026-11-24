// npm run usuarios:iniciais: creates two users of each profile (scripts/initialUsers.ts) in the database
// of DATABASE_URL and prints each new password once. Run it on your own computer, never in CI.
import { createInterface } from 'node:readline/promises';
import { container } from '../src/main/container';
import { CreateUserUseCase } from '../src/useCases/Users/CreateUser/CreateUser_UseCase';
import { INITIAL_USERS, createInitialUsers, formatReport, generatePassword } from './initialUsers';

/** Host and database only: the password in the URL never reaches the terminal. */
function describeTarget(url: string): string {
  const parsed = new URL(url);
  return `${parsed.hostname}${parsed.pathname}`;
}

async function main() {
  const target = describeTarget(container.env.DATABASE_URL);
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  const answer = await rl.question(
    `Criar ${INITIAL_USERS.length} usuários (2 de cada perfil) em ${target}? Digite "sim": `,
  );
  rl.close();
  if (answer.trim().toLowerCase() !== 'sim') {
    process.stderr.write('Nada foi criado.\n');
    return;
  }

  const createUser = new CreateUserUseCase(
    container.users,
    container.hash,
    container.ids,
    container.clock,
  );
  try {
    const results = await createInitialUsers({
      users: INITIAL_USERS,
      create: (input) => createUser.execute(input),
      generatePassword,
    });
    process.stdout.write(formatReport(results));
    process.stderr.write(
      'Guarde as senhas agora, num gerenciador de senhas. Elas não aparecem de novo e não ficam salvas.\n',
    );
  } finally {
    await container.prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
