import express from 'express';
import { AssignmentCreateSchema, AssignmentQuickSchema } from '@leaflow/shared/schemas';
import { z } from 'zod';
import { prisma } from '../db.js';
import { adapters } from '../adapters/index.js';
import { requireAuth } from '../auth.js';
import { wrap, notFound, badRequest } from '../errors.js';
import {
  buildAssignmentParticipantSummary,
  ensureAssignmentParticipants,
  materializeAssignmentRuns,
  seedAssignmentParticipantsFromTeam,
} from '../services/assignmentParticipants.js';

export const assignmentsRoutes = express.Router();
assignmentsRoutes.use(requireAuth);

const AssignmentUpdateSchema = z.object({
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  approverId: z.string().nullable().optional(),
  executionMode: z.enum(['REPRESENTATIVE', 'INDIVIDUAL']).optional(),
  approvalMode: z.enum(['NONE', 'TEAM_MANAGER']).optional(),
});

async function materializeRuns(assignmentId, tx = prisma) {
  return materializeAssignmentRuns(assignmentId, undefined, tx);
}

export { materializeRuns };

async function notifyAssignmentCreated({
  assignment,
  group,
  teamId,
  teamName,
  target,
  executionMode,
}: {
  assignment: any;
  group: any;
  teamId: string;
  teamName?: string | null;
  target: { kind: 'TEAM' | 'USER'; id?: string };
  executionMode: 'REPRESENTATIVE' | 'INDIVIDUAL';
}) {
  if (target.kind === 'USER' && target.id) {
    const runWhere: any = executionMode === 'INDIVIDUAL'
      ? { assignmentId: assignment.id, participantUserId: target.id }
      : { assignmentId: assignment.id };
    const runs: any[] = await prisma.taskGroupRun.findMany({
      where: runWhere,
      include: { taskRuns: { include: { task: true }, orderBy: { task: { order: 'asc' } } } },
      orderBy: { date: 'asc' },
    } as any);
    const allTaskRuns = runs.flatMap((run) => run.taskRuns);
    if (executionMode !== 'INDIVIDUAL' && allTaskRuns.length) {
      await prisma.taskRun.updateMany({
        where: { id: { in: allTaskRuns.map((taskRun) => taskRun.id) } },
        data: { assigneeId: target.id },
      });
    }
    const first = allTaskRuns[0];
    if (first) {
      adapters.push.sendToUser(target.id, {
        title: 'Yeni görev sana atandı',
        body: `${first.task.name} · ${group?.name ?? ''}`.trim(),
        data: {
          kind: 'TASK_ASSIGNED',
          screen: 'task-detail',
          entityType: 'taskRun',
          entityId: first.id,
          taskRunId: first.id,
          assignmentId: assignment.id,
          path: `/task-runs/${first.id}`,
          deepLink: `leaflow://taskRun/${first.id}`,
        },
      });
    }
    return;
  }

  const members = await prisma.teamMember.findMany({ where: { teamId } });
  for (const member of members) {
    adapters.push.sendToUser(member.userId, {
      title: 'Yeni atama',
      body: `${group?.name ?? 'Görev grubu'} → ${teamName ?? ''}`.trim(),
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

assignmentsRoutes.get(
  '/',
  wrap(async (req, res) => {
    const where: any = {};
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
    const participantSummary = await buildAssignmentParticipantSummary(
      list.map((assignment) => assignment.id),
    );
    res.json(list.map((assignment) => ({
      ...assignment,
      participantSummary: participantSummary.get(assignment.id) ?? null,
    })));
  }),
);

assignmentsRoutes.post(
  '/',
  wrap(async (req, res) => {
    const data = AssignmentCreateSchema.parse(req.body);
    const grp = await prisma.taskGroup.findUnique({ where: { id: data.groupId } });
    if (!grp) throw notFound('TaskGroup not found');

    const assignee = data.assigneeId
      ? await prisma.user.findUnique({ where: { id: data.assigneeId } })
      : null;
    if (data.assigneeId && !assignee) throw notFound('Assignee not found');

    let resolvedTeamId = data.teamId;
    if (!resolvedTeamId && assignee) {
      const membership = await prisma.teamMember.findFirst({ where: { userId: assignee.id } });
      if (!membership) throw badRequest('Selected user is not a member of any team', undefined);
      resolvedTeamId = membership.teamId;
    }
    if (!resolvedTeamId) throw badRequest('Team is required when assigning to a team', undefined);

    const executionMode = data.executionMode ?? grp.defaultExecutionMode;
    const approvalMode = data.approvalMode ?? grp.defaultApprovalMode;
    const targetMode = assignee ? 'USER' : 'TEAM';

    const a: any = await (prisma.assignment.create as any)({
      data: {
        groupId: data.groupId,
        teamId: resolvedTeamId,
        startsAt: new Date(data.startsAt),
        endsAt: new Date(data.endsAt),
        approverId: data.approverId ?? null,
        targetMode,
        executionMode,
        approvalMode,
        createdById: req.user.id,
      },
    });

    if (assignee) {
      await ensureAssignmentParticipants(a.id, [assignee.id]);
      await materializeAssignmentRuns(a.id, { participantUserIds: [assignee.id] });
    } else {
      await seedAssignmentParticipantsFromTeam(a.id, resolvedTeamId);
      await materializeRuns(a.id);
    }

    const team = await prisma.teamRef.findUnique({ where: { id: resolvedTeamId } });

    await notifyAssignmentCreated({
      assignment: a,
      group: grp,
      teamId: resolvedTeamId,
      teamName: team?.name,
      target: assignee ? { kind: 'USER', id: assignee.id } : { kind: 'TEAM' },
      executionMode,
    });

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
      if (!m) throw badRequest('User is not a member of any team', undefined);
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
      if (Number.isNaN(d.getTime())) throw badRequest('Invalid when', undefined);
      startsAt = d;
    }
    const endsAt = new Date(startsAt);
    endsAt.setDate(endsAt.getDate() + 1);

    const a: any = await (prisma.assignment.create as any)({
      data: {
        groupId: grp.id,
        teamId,
        startsAt,
        endsAt,
        targetMode: data.target.kind === 'USER' ? 'USER' : 'TEAM',
        executionMode: data.target.kind === 'TEAM' ? (data.executionMode ?? grp.defaultExecutionMode) : grp.defaultExecutionMode,
        approvalMode: grp.defaultApprovalMode,
        createdById: req.user.id,
      },
    });
    if (data.target.kind === 'USER') {
      await ensureAssignmentParticipants(a.id, [data.target.id]);
      await materializeAssignmentRuns(a.id, { participantUserIds: [data.target.id] });
    } else {
      await seedAssignmentParticipantsFromTeam(a.id, teamId);
      await materializeRuns(a.id);
    }

    const team = await prisma.teamRef.findUnique({ where: { id: teamId } });
    await notifyAssignmentCreated({
      assignment: a,
      group: grp,
      teamId,
      teamName: team?.name,
      target: data.target.kind === 'USER' ? { kind: 'USER', id: data.target.id } : { kind: 'TEAM' },
      executionMode: data.target.kind === 'TEAM' ? (data.executionMode ?? grp.defaultExecutionMode) : grp.defaultExecutionMode,
    });

    res.status(201).json(a);
  }),
);

assignmentsRoutes.put(
  '/:id',
  wrap(async (req, res) => {
    const data = AssignmentUpdateSchema.parse(req.body);
    const a: any = await (prisma.assignment.update as any)({
      where: { id: req.params.id },
      data: {
        ...(data.startsAt && { startsAt: new Date(data.startsAt) }),
        ...(data.endsAt && { endsAt: new Date(data.endsAt) }),
        ...(data.approverId !== undefined && { approverId: data.approverId }),
        ...(data.executionMode && { executionMode: data.executionMode }),
        ...(data.approvalMode && { approvalMode: data.approvalMode }),
      },
    });
    if (a.targetMode === 'TEAM') {
      await seedAssignmentParticipantsFromTeam(a.id, a.teamId);
    }
    await materializeRuns(a.id);
    res.json(a);
  }),
);

assignmentsRoutes.post(
  '/:id/suspend',
  wrap(async (req, res) => {
    const updated = await (prisma.assignment.update as any)({
      where: { id: req.params.id },
      data: { status: 'SUSPENDED' },
    });
    res.json(updated);
  }),
);

assignmentsRoutes.post(
  '/:id/activate',
  wrap(async (req, res) => {
    const updated = await (prisma.assignment.update as any)({
      where: { id: req.params.id },
      data: { status: 'ACTIVE' },
    });
    res.json(updated);
  }),
);

assignmentsRoutes.delete(
  '/:id',
  wrap(async (req, res) => {
    await prisma.assignment.delete({ where: { id: req.params.id } });
    res.status(204).end();
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
