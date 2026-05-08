import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const prisma = new PrismaClient();

/**
 * Seed = clean slate. Provit-internal entities (question/task groups,
 * assignments, runs) come from the UI. Identity (users, teams) comes from
 * agentechauth on demand. There is no mock data.
 *
 * Running this wipes the DB. Useful only for local resets.
 */
async function reset() {
  await prisma.approval.deleteMany();
  await prisma.answer.deleteMany();
  await prisma.proof.deleteMany();
  await prisma.taskRun.deleteMany();
  await prisma.taskGroupRun.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.taskGroup.deleteMany();
  await prisma.question.deleteMany();
  await prisma.questionGroup.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.teamRef.deleteMany();
  await prisma.user.deleteMany();
}

async function seed() {
  await reset();
  console.log('DB wiped. Provit starts empty — create content via the UI.');
  console.log('Login uses agentechauth; no test accounts are seeded.');
}

seed()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
