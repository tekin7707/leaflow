import cron from 'node-cron';
import { prisma } from '../db.js';
import { adapters } from '../adapters/index.js';
import { log } from '../log.js';

/**
 * Runs hourly: notify assignees of TaskRuns whose run.date is today
 * and not yet started, plus those past expected completion.
 */
export function startReminderJob() {
  cron.schedule('0 * * * *', async () => {
    log.info('cron:reminders — checking due tasks');
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const runs = await prisma.taskRun.findMany({
      where: {
        status: 'PENDING',
        run: { date: { gte: startOfDay, lte: endOfDay } },
      },
      include: { task: true, run: { include: { assignment: { include: { team: { include: { members: true } } } } } } },
      take: 200,
    });

    for (const tr of runs) {
      const recipients = tr.assigneeId
        ? [tr.assigneeId]
        : tr.run.assignment.team.members.map((m) => m.userId);
      for (const userId of recipients) {
        try {
          await adapters.push.sendToUser(userId, {
            title: 'Görev hatırlatması',
            body: tr.task.name,
            data: { kind: 'TASK_DUE_SOON', taskRunId: tr.id },
          });
        } catch (err) {
          log.error({ err }, 'cron:reminders push error');
        }
      }
    }
  });
}
