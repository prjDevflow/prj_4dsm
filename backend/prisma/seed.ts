// Placeholder: the idempotent seed (admin, test users, terminal, authorization) is built in B04.
export async function runSeed(): Promise<void> {}

if (require.main === module) {
  runSeed().catch((error: unknown) => {
    process.stderr.write(`${String(error)}\n`);
    process.exit(1);
  });
}
