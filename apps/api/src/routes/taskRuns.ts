import express from 'express';
import { AnswerSchema, ProofSchema, TaskRunAssignSchema, TaskRunNoteSchema } from '@provit/shared/schemas';
import { prisma } from '../db.js';
import { adapters } from '../adapters/index.js';
import { requireAuth } from '../auth.js';
import { wrap, notFound, badRequest } from '../errors.js';
import { unblockDependents } from '../services/deps.js';

export const taskRunsRoutes = express.Router();
taskRunsRoutes.use(requireAuth);

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const endOfDay = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

taskRunsRoutes.get(
  '/mine/today',
  wrap(async (req, res) => {
    const userId = req.user.id;
    const teamIds = req.user.memberships.map((m) => m.teamId);
    const today = new Date();

    const runs = await prisma.taskRun.findMany({
      where: {
        OR: [{ assigneeId: userId }, { assigneeId: null }],
        status: { in: ['PENDING', 'IN_PROGRESS', 'AWAITING_APPROVAL', 'BLOCKED', 'REJECTED'] },
        run: {
          date: { gte: startOfDay(today), lte: endOfDay(today) },
          assignment: { teamId: { in: teamIds } },
        },
      },
      include: {
        task: { include: { questionGroup: true } },
        run: { include: { assignment: { include: { group: true, team: true } } } },
        proofs: true,
        answers: true,
      },
      orderBy: [{ run: { date: 'asc' } }, { task: { order: 'asc' } }],
    });
    res.json(runs);
  }),
);

taskRunsRoutes.get(
  '/mine/stats',
  wrap(async (req, res) => {
    const userId = req.user.id;
    const today = startOfDay(new Date());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 6);

    const [completedToday, completedWeek] = await Promise.all([
      prisma.taskRun.count({
        where: {
          assigneeId: userId,
          status: { in: ['DONE', 'APPROVED'] },
          completedAt: { gte: today },
        },
      }),
      prisma.taskRun.count({
        where: {
          assigneeId: userId,
          status: { in: ['DONE', 'APPROVED'] },
          completedAt: { gte: weekAgo },
        },
      }),
    ]);

    // streak — consecutive days with at least one completion ending today
    let streak = 0;
    let cursor = startOfDay(new Date());
    for (let i = 0; i < 60; i++) {
      const day = new Date(cursor);
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      const c = await prisma.taskRun.count({
        where: {
          assigneeId: userId,
          status: { in: ['DONE', 'APPROVED'] },
          completedAt: { gte: day, lt: next },
        },
      });
      if (c > 0) streak += 1;
      else break;
      cursor.setDate(cursor.getDate() - 1);
    }

    res.json({ completedToday, completedWeek, streak });
  }),
);

taskRunsRoutes.get(
  '/pool',
  wrap(async (req, res) => {
    const userId = req.user.id;
    const teamIds = req.user.memberships.map((m) => m.teamId);
    const scope = String(req.query.scope ?? 'mine');

    const where = {};
    if (scope === 'mine') where.assigneeId = userId;
    else if (scope === 'team') where.run = { assignment: { teamId: { in: teamIds } } };
    // 'all' — managers only; just return everything they belong to
    else if (scope === 'all') where.run = { assignment: { teamId: { in: teamIds } } };

    if (req.query.teamId) {
      where.run = { ...(where.run ?? {}), assignment: { teamId: String(req.query.teamId) } };
    }
    if (req.query.status) {
      where.status = { in: String(req.query.status).split(',') };
    }
    if (req.query.groupId) {
      where.run = {
        ...(where.run ?? {}),
        assignment: { ...(where.run?.assignment ?? {}), groupId: String(req.query.groupId) },
      };
    }
    if (req.query.from || req.query.to) {
      const dateRange = {};
      if (req.query.from) dateRange.gte = new Date(String(req.query.from));
      if (req.query.to) dateRange.lte = new Date(String(req.query.to));
      where.run = { ...(where.run ?? {}), date: dateRange };
    }
    if (req.query.q) {
      where.task = { name: { contains: String(req.query.q), mode: 'insensitive' } };
    }

    const runs = await prisma.taskRun.findMany({
      where,
      include: {
        task: true,
        run: { include: { assignment: { include: { group: true, team: true } } } },
      },
      orderBy: [{ run: { date: 'desc' } }, { task: { order: 'asc' } }],
      take: 200,
    });
    res.json(runs);
  }),
);

taskRunsRoutes.get(
  '/:id',
  wrap(async (req, res) => {
    const tr = await prisma.taskRun.findUnique({
      where: { id: req.params.id },
      include: {
        task: { include: { questionGroup: { include: { questions: { orderBy: { order: 'asc' } } } } } },
        run: { include: { assignment: { include: { group: true, team: true } } } },
        proofs: true,
        answers: true,
        approvals: true,
        assignee: true,
      },
    });
    if (!tr) throw notFound();
    res.json(tr);
  }),
);

taskRunsRoutes.patch(
  '/:id/note',
  wrap(async (req, res) => {
    const { note } = TaskRunNoteSchema.parse(req.body);
    const tr = await prisma.taskRun.findUnique({ where: { id: req.params.id } });
    if (!tr) throw notFound();
    const updated = await prisma.taskRun.update({
      where: { id: tr.id },
      data: { note: note ?? null },
    });
    res.json(updated);
  }),
);

taskRunsRoutes.post(
  '/:id/assign',
  wrap(async (req, res) => {
    const { userId } = TaskRunAssignSchema.parse(req.body);
    const tr = await prisma.taskRun.findUnique({
      where: { id: req.params.id },
      include: {
        task: true,
        run: { include: { assignment: { include: { group: true, team: true } } } },
      },
    });
    if (!tr) throw notFound();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw notFound('User not found');

    const updated = await prisma.taskRun.update({
      where: { id: tr.id },
      data: { assigneeId: user.id },
    });

    adapters.push.sendToUser(user.id, {
      title: 'Yeni görev sana atandı',
      body: `${tr.task.name} · ${tr.run.assignment.group.name}`,
      data: {
        kind: 'TASK_ASSIGNED',
        screen: 'task-detail',
        entityType: 'taskRun',
        entityId: tr.id,
        taskRunId: tr.id,
        path: `/task-runs/${tr.id}`,
        deepLink: `provit://taskRun/${tr.id}`,
      },
    });

    res.json(updated);
  }),
);

taskRunsRoutes.post(
  '/:id/start',
  wrap(async (req, res) => {
    const tr = await prisma.taskRun.findUnique({ where: { id: req.params.id }, include: { task: true } });
    if (!tr) throw notFound();
    if (tr.status === 'BLOCKED') throw badRequest('Task is still blocked by dependencies');
    const updated = await prisma.taskRun.update({
      where: { id: tr.id },
      data: {
        status: 'IN_PROGRESS',
        assigneeId: tr.assigneeId ?? req.user.id,
        startedAt: tr.startedAt ?? new Date(),
      },
    });
    res.json(updated);
  }),
);

taskRunsRoutes.post(
  '/:id/answer',
  wrap(async (req, res) => {
    const data = AnswerSchema.parse(req.body);
    const tr = await prisma.taskRun.findUnique({ where: { id: req.params.id } });
    if (!tr) throw notFound();
    const ans = await prisma.answer.upsert({
      where: { taskRunId_questionId: { taskRunId: tr.id, questionId: data.questionId } },
      update: { value: data.value, note: data.note ?? null },
      create: {
        taskRunId: tr.id,
        questionId: data.questionId,
        value: data.value,
        note: data.note ?? null,
      },
    });
    res.json(ans);
  }),
);

taskRunsRoutes.post(
  '/:id/proof',
  wrap(async (req, res) => {
    const data = ProofSchema.parse(req.body);
    const tr = await prisma.taskRun.findUnique({ where: { id: req.params.id } });
    if (!tr) throw notFound();

    if (data.answerId) {
      const ans = await prisma.answer.findUnique({ where: { id: data.answerId } });
      if (!ans) throw notFound('Answer not found');
      if (ans.taskRunId !== tr.id) {
        throw badRequest('answerId does not belong to this task run');
      }
    }

    const p = await prisma.proof.create({
      data: {
        taskRunId: tr.id,
        answerId: data.answerId ?? null,
        key: data.key,
        filename: data.filename,
        mime: data.mime,
        sizeBytes: data.sizeBytes,
      },
    });
    res.status(201).json(p);
  }),
);

taskRunsRoutes.post(
  '/:id/complete',
  wrap(async (req, res) => {
    const tr = await prisma.taskRun.findUnique({
      where: { id: req.params.id },
      include: {
        task: { include: { questionGroup: { include: { questions: true } } } },
        proofs: true,
        answers: true,
        run: { include: { assignment: { include: { group: true, team: true } } } },
      },
    });
    if (!tr) throw notFound();
    if (tr.proofs.length < (tr.task.minFiles ?? 0)) {
      throw badRequest(`Min ${tr.task.minFiles} dosya gerekli`);
    }
    if (tr.task.questionGroup) {
      const required = tr.task.questionGroup.questions.filter((q) => q.required);
      const answeredIds = new Set(tr.answers.map((a) => a.questionId));
      const missing = required.filter((q) => !answeredIds.has(q.id));
      if (missing.length > 0) {
        throw badRequest(`Cevaplanmamış zorunlu sorular: ${missing.length}`);
      }
    }

    const requiresApproval = tr.task.requiresApproval || tr.run.assignment.group.requiresApproval;
    const newStatus = requiresApproval ? 'AWAITING_APPROVAL' : 'DONE';

    const updated = await prisma.taskRun.update({
      where: { id: tr.id },
      data: {
        status: newStatus,
        completedAt: new Date(),
        assigneeId: tr.assigneeId ?? req.user.id,
      },
    });

    if (requiresApproval) {
      await prisma.approval.create({
        data: {
          taskRunId: tr.id,
          approverId: tr.run.assignment.approverId ?? null,
        },
      });
      // notify managers of the team
      const managers = await prisma.teamMember.findMany({
        where: { teamId: tr.run.assignment.teamId, role: 'MANAGER' },
      });
      for (const mgr of managers) {
        adapters.push.sendToUser(mgr.userId, {
          title: 'Onay bekliyor',
          body: `${tr.task.name}`,
          data: { kind: 'APPROVAL_REQUESTED', taskRunId: tr.id },
        });
      }
    } else {
      const ids = await unblockDependents(tr.id);
      for (const id of ids) {
        const sib = await prisma.taskRun.findUnique({
          where: { id },
          include: { task: true, run: { include: { assignment: { include: { team: true } } } } },
        });
        if (!sib) continue;
        const members = await prisma.teamMember.findMany({
          where: { teamId: sib.run.assignment.teamId, role: 'MEMBER' },
        });
        for (const m of members) {
          adapters.push.sendToUser(m.userId, {
            title: 'Görev açıldı',
            body: `${sib.task.name}`,
            data: { kind: 'TASK_UNBLOCKED', taskRunId: sib.id },
          });
        }
      }
    }

    res.json(updated);
  }),
);
