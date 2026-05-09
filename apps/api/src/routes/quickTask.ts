import express from 'express';
import { QuickTaskSchema } from '@provit/shared/schemas';
import { prisma } from '../db.js';
import { adapters } from '../adapters/index.js';
import { requireAuth } from '../auth.js';
import { wrap, badRequest, notFound } from '../errors.js';
import { materializeRuns } from './assignments.js';

export const quickTaskRoutes = express.Router();
quickTaskRoutes.use(requireAuth);

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

function resolveWhen(when) {
  const now = new Date();
  if (!when || when === 'NOW') return now;
  if (when === 'TODAY') return startOfDay(now);
  if (when === 'TOMORROW') {
    const t = new Date(now);
    t.setDate(t.getDate() + 1);
    t.setHours(0, 0, 0, 0);
    return t;
  }
  const d = new Date(when);
  if (Number.isNaN(d.getTime())) throw badRequest('Invalid when');
  return d;
}

/**
 * One-shot: creates a TaskGroup with a single Task inside, then optionally
 * an Assignment for a team + (optional) assignee with a push notification.
 *
 * Designed for both web (header "+ Hızlı görev" button) and mobile (FAB).
 */
quickTaskRoutes.post(
  '/',
  wrap(async (req, res) => {
    const data = QuickTaskSchema.parse(req.body);

    // 1) TaskGroup + 1 Task atomically
    const group = await prisma.taskGroup.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        requiresApproval: data.requiresApproval,
        minFiles: data.minFiles,
        recurrence: data.recurrence ?? null,
        tasks: {
          create: [{
            name: data.name,
            description: data.description ?? null,
            order: 0,
            estimatedMinutes: data.estimatedMinutes,
            minFiles: data.minFiles,
            requiresApproval: data.requiresApproval,
          }],
        },
      },
      include: { tasks: true },
    });

    // 2) Optional immediate Assignment + assignee + push
    let assignment = null;
    let firstTaskRunId = null;

    if (data.teamId) {
      const team = await prisma.teamRef.findUnique({ where: { id: data.teamId } });
      if (!team) throw notFound('Team not found');

      const startsAt = resolveWhen(data.when);
      const endsAt = new Date(startsAt);
      endsAt.setDate(endsAt.getDate() + 1);

      assignment = await prisma.assignment.create({
        data: { groupId: group.id, teamId: team.id, startsAt, endsAt, createdById: req.user.id },
      });
      await materializeRuns(assignment.id);

      const taskRuns = await prisma.taskRun.findMany({
        where: { run: { assignmentId: assignment.id } },
        include: { task: true },
        orderBy: { run: { date: 'asc' } },
      });
      const first = taskRuns[0];
      firstTaskRunId = first?.id ?? null;

      if (data.assigneeId && first) {
        const assignee = await prisma.user.findUnique({ where: { id: data.assigneeId } });
        if (!assignee) throw notFound('Assignee not found');

        await prisma.taskRun.updateMany({
          where: { id: { in: taskRuns.map((tr) => tr.id) } },
          data: { assigneeId: assignee.id },
        });

        adapters.push.sendToUser(assignee.id, {
          title: 'Yeni görev sana atandı',
          body: `${first.task.name} · ${group.name}`,
          data: {
            kind: 'TASK_ASSIGNED',
            screen: 'task-detail',
            entityType: 'taskRun',
            entityId: first.id,
            taskRunId: first.id,
            assignmentId: assignment.id,
            path: `/task-runs/${first.id}`,
            deepLink: `provit://taskRun/${first.id}`,
          },
        });
      } else {
        // Team-wide notify
        const members = await prisma.teamMember.findMany({ where: { teamId: team.id } });
        for (const m of members) {
          adapters.push.sendToUser(m.userId, {
            title: 'Yeni atama',
            body: `${group.name} · ${team.name}`,
            data: {
              kind: 'ASSIGNMENT_NEW',
              screen: 'assignment-detail',
              entityType: 'assignment',
              entityId: assignment.id,
              assignmentId: assignment.id,
            },
          });
        }
      }
    }

    res.status(201).json({
      group: { id: group.id, name: group.name, recurrence: group.recurrence },
      task: group.tasks[0],
      assignment,
      taskRunId: firstTaskRunId,
    });
  }),
);
