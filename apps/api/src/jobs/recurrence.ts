import cron from 'node-cron';
import { prisma } from '../db.js';
import { log } from '../log.js';
import { materializeRuns } from '../routes/assignments.js';

/**
 * Runs every night: for each active assignment, ensure tomorrow's TaskGroupRun
 * (and TaskRuns) exist if it falls within the recurrence window.
 * The materializeRuns function is idempotent (uses upserts), so re-running is safe.
 */
export function startRecurrenceJob() {
  cron.schedule('5 0 * * *', async () => {
    log.info('cron:recurrence — materializing upcoming runs');
    const now = new Date();
    const horizon = new Date(now);
    horizon.setDate(horizon.getDate() + 7);

    const assignments = await prisma.assignment.findMany({
      where: {
        status: { in: ['SCHEDULED', 'ACTIVE'] },
        startsAt: { lte: horizon },
        endsAt: { gte: now },
      },
    });
    for (const a of assignments) {
      try {
        await materializeRuns(a.id);
      } catch (err) {
        log.error({ err, assignmentId: a.id }, 'cron:recurrence error');
      }
    }
  });
}
