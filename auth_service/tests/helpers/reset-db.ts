import { prisma } from "../../src/libs/prisma";

/**
 * Wipes every row from the User table inside a transaction.
 * Called in `beforeEach` to guarantee test isolation.
 */
export async function resetDb(): Promise<void> {
  await prisma.$transaction([prisma.user.deleteMany()]);
}
