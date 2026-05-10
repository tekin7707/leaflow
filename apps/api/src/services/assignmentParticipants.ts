import { prisma } from '../db.js';
import { expandRecurrence } from './recurrence.js';

const startOfDay = (value: Date | string) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const initialTaskRunStatus = (task: { dependsOn?: string[] | null }) =>
  (task.dependsOn?.length ?? 0) > 0 ? 'BLOCKED' : 'PENDING';

export async function ensureAssignmentParticipants(
  assignmentId: string,
  userIds: string[],
  joinedAfterAssignment = false,
  tx = prisma,
) {
  const db: any = tx;
  if (userIds.length === 0) return [];

  await db.assignmentParticipant.createMany({
    data: userIds.map((userId) => ({
      assignmentId,
      userId,
      joinedAfterAssignment,
    })),
    skipDuplicates: true,
  });

  return db.assignmentParticipant.findMany({
    where: {
      assignmentId,
      userId: { in: userIds },
    },
    select: {
      userId: true,
      joinedAfterAssignment: true,
    },
  });
}

export async function seedAssignmentParticipantsFromTeam(
  assignmentId: string,
  teamId: string,
  joinedAfterAssignment = false,
  tx = prisma,
) {
  const members = await tx.teamMember.findMany({
    where: { teamId },
    select: { userId: true },
  });

  return ensureAssignmentParticipants(
    assignmentId,
    members.map((member) => member.userId),
    joinedAfterAssignment,
    tx,
  );
}

export async function materializeAssignmentRuns(
  assignmentId: string,
  options?: {
    participantUserIds?: string[];
    fromDate?: Date;
  },
  tx = prisma,
) {
  const db: any = tx;
  const assignment = await db.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      group: { include: { tasks: { where: { archivedAt: null }, orderBy: { order: 'asc' } } } },
      participants: { select: { userId: true } },
    },
  });

  if (!assignment) return null;

  const dates = expandRecurrence(assignment.group.recurrence, assignment.startsAt, assignment.endsAt)
    .filter((date) => !options?.fromDate || startOfDay(date) >= startOfDay(options.fromDate));

  const participantUserIds = options?.participantUserIds
    ?? (assignment.participants.length > 0
      ? assignment.participants.map((participant) => participant.userId)
      : [null]);

  for (const date of dates) {
    for (const participantUserId of participantUserIds) {
      const run = participantUserId
        ? await db.taskGroupRun.upsert({
          where: {
            assignmentId_date_participantUserId: {
              assignmentId: assignment.id,
              date,
              participantUserId,
            },
          },
          update: {},
          create: {
            assignmentId: assignment.id,
            date,
            participantUserId,
          },
        })
        : await (async () => {
          const existing = await db.taskGroupRun.findFirst({
            where: { assignmentId: assignment.id, date, participantUserId: null },
          });
          if (existing) return existing;
          return db.taskGroupRun.create({
            data: {
              assignmentId: assignment.id,
              date,
            },
          });
        })();

      for (const task of assignment.group.tasks) {
        await tx.taskRun.upsert({
          where: { runId_taskId: { runId: run.id, taskId: task.id } },
          update: participantUserId ? { assigneeId: participantUserId } : {},
          create: {
            runId: run.id,
            taskId: task.id,
            assigneeId: participantUserId,
            status: initialTaskRunStatus(task),
          },
        });
      }
    }
  }

  return assignment;
}

export async function syncIndividualAssignmentsForTeamMember(teamId: string, userId: string, tx = prisma) {
  const assignments = await (tx.assignment.findMany as any)({
    where: {
      teamId,
      targetMode: 'TEAM',
      status: { in: ['SCHEDULED', 'ACTIVE'] },
    },
    select: { id: true },
  });

  if (assignments.length === 0) return 0;

  const today = startOfDay(new Date());
  for (const assignment of assignments) {
    await ensureAssignmentParticipants(assignment.id, [userId], true, tx);
    await materializeAssignmentRuns(assignment.id, { participantUserIds: [userId], fromDate: today }, tx);
  }

  return assignments.length;
}

export async function buildAssignmentParticipantSummary(assignmentIds: string[], tx = prisma) {
  if (assignmentIds.length === 0) return new Map();

  const [participants, runs] = await Promise.all([
    (tx as any).assignmentParticipant.findMany({
      where: { assignmentId: { in: assignmentIds } },
      select: { assignmentId: true, userId: true, joinedAfterAssignment: true },
    }),
    tx.taskGroupRun.findMany({
      where: { assignmentId: { in: assignmentIds } },
      include: { taskRuns: { select: { status: true } } },
    }),
  ]);

  const participantsByAssignment = new Map<string, Array<{ userId: string; joinedAfterAssignment: boolean }>>();
  for (const participant of participants) {
    const list = participantsByAssignment.get(participant.assignmentId) ?? [];
    list.push(participant);
    participantsByAssignment.set(participant.assignmentId, list);
  }

  const runStats = new Map<string, { total: number; completed: number; approved: number; missing: number }>();
  for (const run of runs) {
    const current = runStats.get(run.assignmentId) ?? { total: 0, completed: 0, approved: 0, missing: 0 };
    current.total += 1;
    const statuses = run.taskRuns.map((taskRun) => taskRun.status);
    if (statuses.length > 0 && statuses.every((status) => status === 'APPROVED')) current.approved += 1;
    else if (statuses.length > 0 && statuses.every((status) => status === 'DONE' || status === 'APPROVED')) current.completed += 1;
    else if (run.date < startOfDay(new Date()) && statuses.some((status) => !['DONE', 'APPROVED'].includes(status))) current.missing += 1;
    runStats.set(run.assignmentId, current);
  }

  const summary = new Map<string, {
    participantCount: number;
    joinedAfterAssignmentCount: number;
    runCount: number;
    completedRunCount: number;
    approvedRunCount: number;
    missingRunCount: number;
  }>();

  for (const assignmentId of assignmentIds) {
    const assignmentParticipants = participantsByAssignment.get(assignmentId) ?? [];
    const stats = runStats.get(assignmentId) ?? { total: 0, completed: 0, approved: 0, missing: 0 };
    summary.set(assignmentId, {
      participantCount: assignmentParticipants.length,
      joinedAfterAssignmentCount: assignmentParticipants.filter((participant) => participant.joinedAfterAssignment).length,
      runCount: stats.total,
      completedRunCount: stats.completed,
      approvedRunCount: stats.approved,
      missingRunCount: stats.missing,
    });
  }

  return summary;
}
