import express from 'express';
import { AssignmentCreateSchema, AssignmentQuickSchema } from '@provit/shared/schemas';
import { prisma } from '../db.js';
import { adapters } from '../adapters/index.js';
import { requireAuth } from '../auth.js';
import { wrap, notFound, badRequest } from '../errors.js';
import { expandRecurrence, buildRunsPlan } from '../services/recurrence.js';

export const assignmentsRoutes = express.Router();
assignmentsRoutes.use(requireAuth);

async function materializeRuns(assignmentId, tx = prisma) {
  const a = await tx.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      group: { include: { tasks: { orderBy: { order: 'asc' } } } },
      team: { include: { members: true } },
    },
  });
  if (!a) return;
  const dates = expandRecurrence(a.group.recurrence, a.startsAt, a.endsAt);
  const plan = buildRunsPlan(a, a.group, dates);

  for (const p of plan) {
    const run = await tx.taskGroupRun.upsert({
      where: { assignmentId_date: { assignmentId: a.id, date: p.date } },
      update: {},
      create: { assignmentId: a.id, date: p.date },
    });
    for (const tr of p.taskRuns) {
      await tx.taskRun.upsert({
        where: { runId_taskId: { runId: run.id, taskId: tr.taskId } },
        update: {},
        create: { runId: run.id, taskId: tr.taskId, status: tr.status },
      });
    }
  }
  return a;
}

export { materializeRuns };

assignmentsRoutes.get(
  '/',
  wrap(async (req, res) => {
    const where = {};
    if (req.query.teamId) where.teamId = String(req.query.teamId);
    if (req.query.status) where.status = String(req.query.status);
    if (req.query.from || req.query.to) {
      where.AND = [];
      if (req.query.from) where.AND.push({ endsAt: { gte: new Date(String(req.query.from)) } });
      if (req.query.to) where.AND.push({ startsAt: { lte: new Date(String(req.query.to)) } });
    }
    const list = await prisma.assignment.findMany({
      where,
      include: { team: true, group: true, runs: true },
      orderBy: { startsAt: 'asc' },
      take: 200,
    });
    res.json(list);
  }),
);

assignmentsRoutes.post(
  '/',
  wrap(async (req, res) => {
    const data = AssignmentCreateSchema.parse(req.body);
    const a = await prisma.assignment.create({
      data: {
        groupId: data.groupId,
        teamId: data.teamId,
        startsAt: new Date(data.startsAt),
        endsAt: new Date(data.endsAt),
        approverId: data.approverId ?? null,
        createdById: req.user.id,
      },
    });

    await materializeRuns(a.id);

    const grp = await prisma.taskGroup.findUnique({ where: { id: data.groupId } });
    const team = await prisma.teamRef.findUnique({ where: { id: data.teamId } });

    if (data.assigneeId) {
      // Single-assignee path: assign every freshly materialized TaskRun to this
      // user and notify them once with a deep-link to the first task.
      const assignee = await prisma.user.findUnique({ where: { id: data.assigneeId } });
      if (!assignee) throw notFound('Assignee not found');

      const runs = await prisma.taskGroupRun.findMany({
        where: { assignmentId: a.id },
        include: { taskRuns: { include: { task: true }, orderBy: { task: { order: 'asc' } } } },
        orderBy: { date: 'asc' },
      });
      const allTaskRuns = runs.flatMap((r) => r.taskRuns);
      if (allTaskRuns.length) {
        await prisma.taskRun.updateMany({
          where: { id: { in: allTaskRuns.map((tr) => tr.id) } },
          data: { assigneeId: assignee.id },
        });
        const first = allTaskRuns[0];
        adapters.push.sendToUser(assignee.id, {
          title: 'Yeni görev sana atandı',
          body: `${first.task.name} · ${grp?.name ?? ''}`.trim(),
          data: {
            kind: 'TASK_ASSIGNED',
            screen: 'task-detail',
            entityType: 'taskRun',
            entityId: first.id,
            taskRunId: first.id,
            assignmentId: a.id,
            path: `/task-runs/${first.id}`,
            deepLink: `provit://taskRun/${first.id}`,
          },
        });
      }
    } else {
      // Team-wide path: notify each member.
      const members = await prisma.teamMember.findMany({
        where: { teamId: data.teamId },
      });
      for (const m of members) {
        adapters.push.sendToUser(m.userId, {
          title: 'Yeni atama',
          body: `${grp?.name ?? 'Görev grubu'} → ${team?.name ?? ''}`.trim(),
          data: {
            kind: 'ASSIGNMENT_NEW',
            screen: 'assignment-detail',
            entityType: 'assignment',
            entityId: a.id,
            assignmentId: a.id,
          },
        });
      }
    }

    res.status(201).json(a);
  }),
);

assignmentsRoutes.post(
  '/quick',
  wrap(async (req, res) => {
    const data = AssignmentQuickSchema.parse(req.body);
    const grp = await prisma.taskGroup.findUnique({ where: { id: data.groupId } });
    if (!grp) throw notFound('TaskGroup not found');

    let teamId;
    if (data.target.kind === 'TEAM') {
      teamId = data.target.id;
    } else {
      // user → take any team they belong to
      const m = await prisma.teamMember.findFirst({ where: { userId: data.target.id } });
      if (!m) throw badRequest('User is not a member of any team');
      teamId = m.teamId;
    }

    const now = new Date();
    let startsAt = now;
    if (data.when === 'NOW') startsAt = now;
    else if (data.when === 'TODAY') startsAt = new Date(now.toISOString().slice(0, 10));
    else if (data.when === 'TOMORROW') {
      const t = new Date(now);
      t.setDate(t.getDate() + 1);
      t.setHours(0, 0, 0, 0);
      startsAt = t;
    } else {
      const d = new Date(data.when);
      if (Number.isNaN(d.getTime())) throw badRequest('Invalid when');
      startsAt = d;
    }
    const endsAt = new Date(startsAt);
    endsAt.setDate(endsAt.getDate() + 1);

    const a = await prisma.assignment.create({
      data: { groupId: grp.id, teamId, startsAt, endsAt, createdById: req.user.id },
    });
    await materializeRuns(a.id);
    res.status(201).json(a);
  }),
);

assignmentsRoutes.put(
  '/:id',
  wrap(async (req, res) => {
    const data = AssignmentCreateSchema.partial().parse(req.body);
    const a = await prisma.assignment.update({
      where: { id: req.params.id },
      data: {
        ...(data.startsAt && { startsAt: new Date(data.startsAt) }),
        ...(data.endsAt && { endsAt: new Date(data.endsAt) }),
        ...(data.approverId !== undefined && { approverId: data.approverId }),
      },
    });
    res.json(a);
  }),
);

assignmentsRoutes.post(
  '/:id/cancel',
  wrap(async (req, res) => {
    const a = await prisma.assignment.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' },
    });
    res.json(a);
  }),
);
