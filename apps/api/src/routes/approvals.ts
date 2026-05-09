import express from 'express';
import { ApprovalDecideSchema, ApprovalBulkDecideSchema } from '@provit/shared/schemas';
import { prisma } from '../db.js';
import { adapters } from '../adapters/index.js';
import { requireAuth } from '../auth.js';
import { wrap, notFound } from '../errors.js';
import { unblockDependents } from '../services/deps.js';

export const approvalsRoutes = express.Router();
approvalsRoutes.use(requireAuth);

approvalsRoutes.get(
  '/queue',
  wrap(async (req, res) => {
    const userId = req.user.id;
    const teamIds = req.user.memberships
      .filter((m) => m.role === 'MANAGER')
      .map((m) => m.teamId);

    // Manager of the team OR named approver OR assignment creator can decide.
    const where = {
      decision: 'PENDING',
      OR: [
        { taskRun: { run: { assignment: { teamId: { in: teamIds } } } } },
        { taskRun: { run: { assignment: { approverId: userId } } } },
        { taskRun: { run: { assignment: { createdById: userId } } } },
      ],
    };
    if (req.query.teamId) {
      where.OR = where.OR.map((branch) => ({
        ...branch,
        taskRun: {
          ...branch.taskRun,
          run: {
            ...branch.taskRun.run,
            assignment: {
              ...branch.taskRun.run.assignment,
              teamId: String(req.query.teamId),
            },
          },
        },
      }));
    }
    if (req.query.overdue === '1') {
      where.createdAt = { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) };
    }

    const list = await prisma.approval.findMany({
      where,
      include: {
        taskRun: {
          include: {
            task: true,
            assignee: true,
            proofs: true,
            answers: { include: { question: true } },
            run: { include: { assignment: { include: { group: true, team: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    res.json(list);
  }),
);

async function applyDecision(approvalId, userId, decision, comment) {
  const ap = await prisma.approval.findUnique({
    where: { id: approvalId },
    include: {
      taskRun: {
        include: {
          task: true,
          assignee: true,
          run: { include: { assignment: true } },
        },
      },
    },
  });
  if (!ap) throw notFound('Approval not found');

  await prisma.approval.update({
    where: { id: ap.id },
    data: {
      decision,
      comment: comment ?? null,
      approverId: userId,
      decidedAt: new Date(),
    },
  });

  const newStatus = decision === 'APPROVED' ? 'APPROVED' : 'IN_PROGRESS';
  await prisma.taskRun.update({
    where: { id: ap.taskRunId },
    data: { status: newStatus },
  });

  if (decision === 'APPROVED') {
    await unblockDependents(ap.taskRunId);
  }

  // Fan out to assignee + assignment creator (skip the actor).
  const targets = new Set<string>();
  if (ap.taskRun.assigneeId && ap.taskRun.assigneeId !== userId) {
    targets.add(ap.taskRun.assigneeId);
  }
  const creatorId = ap.taskRun.run.assignment.createdById;
  if (creatorId && creatorId !== userId) targets.add(creatorId);

  for (const uid of targets) {
    adapters.push.sendToUser(uid, {
      title: decision === 'APPROVED' ? 'Onaylandı' : 'Düzeltme istendi',
      body: ap.taskRun.task.name,
      data: {
        kind: 'APPROVAL_RESULT',
        decision,
        screen: 'task-detail',
        entityType: 'taskRun',
        entityId: ap.taskRunId,
        taskRunId: ap.taskRunId,
        path: `/task-runs/${ap.taskRunId}`,
        deepLink: `provit://taskRun/${ap.taskRunId}`,
      },
    });
  }
}

approvalsRoutes.post(
  '/:id/decide',
  wrap(async (req, res) => {
    const { decision, comment } = ApprovalDecideSchema.parse(req.body);
    await applyDecision(req.params.id, req.user.id, decision, comment);
    res.json({ ok: true });
  }),
);

approvalsRoutes.post(
  '/bulk-decide',
  wrap(async (req, res) => {
    const { ids, decision, comment } = ApprovalBulkDecideSchema.parse(req.body);
    for (const id of ids) {
      await applyDecision(id, req.user.id, decision, comment);
    }
    res.json({ ok: true, count: ids.length });
  }),
);
