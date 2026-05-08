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
    const teamIds = req.user.memberships
      .filter((m) => m.role === 'MANAGER')
      .map((m) => m.teamId);
    const where = {
      decision: 'PENDING',
      taskRun: {
        run: { assignment: { teamId: { in: teamIds } } },
      },
    };
    if (req.query.teamId) {
      where.taskRun.run.assignment.teamId = String(req.query.teamId);
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
    include: { taskRun: { include: { task: true, assignee: true } } },
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

  if (ap.taskRun.assigneeId) {
    adapters.push.sendToUser(ap.taskRun.assigneeId, {
      title: decision === 'APPROVED' ? 'Onaylandı' : 'Düzeltme istendi',
      body: ap.taskRun.task.name,
      data: { kind: 'APPROVAL_RESULT', taskRunId: ap.taskRunId, decision },
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
