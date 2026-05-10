import express from 'express';
import { AnswerSchema, ProofSchema, TaskRunAssignSchema, TaskRunNoteSchema } from '@leaflow/shared/schemas';
import { prisma } from '../db.js';
import { adapters } from '../adapters/index.js';
import { requireAuth } from '../auth.js';
import { wrap, notFound, badRequest } from '../errors.js';
import { unblockDependents } from '../services/deps.js';

export const taskRunsRoutes = express.Router();
taskRunsRoutes.use(requireAuth);

const withViewerState = (run: any, userId: string, teamIds: string[]) => {
  const viewerCanAct = Boolean(
    run.assigneeId === userId
    || run.run?.participantUserId === userId
    || (run.assigneeId == null
      && run.run?.participantUserId == null
      && teamIds.includes(run.run?.assignment?.teamId)),
  );

  let viewerMode = 'WATCH';
  if (run.assigneeId === userId) viewerMode = 'ASSIGNEE';
  else if (run.run?.participantUserId === userId) viewerMode = 'PARTICIPANT';
  else if (run.assigneeId == null && run.run?.participantUserId == null && teamIds.includes(run.run?.assignment?.teamId)) viewerMode = 'TEAM_SHARED';
  else if (run.run?.assignment?.createdById === userId) viewerMode = 'CREATOR_WATCH';

  return {
    ...run,
    viewerCanAct,
    viewerMode,
    viewerLabel: viewerCanAct ? 'İşlem yapabilirsin' : 'İzleme',
  };
};

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
        status: { in: ['PENDING', 'IN_PROGRESS', 'AWAITING_APPROVAL', 'BLOCKED', 'REJECTED'] },
        run: { date: { gte: startOfDay(today), lte: endOfDay(today) } },
        OR: [
          // Explicitly mine
          { assigneeId: userId },
          { run: { ...( { participantUserId: userId } as any ) } },
          // I created the assignment
          { run: { assignment: { createdById: userId } } },
          // Legacy shared run in one of my teams
          {
            AND: [
              { assigneeId: null },
              { run: { ...( { participantUserId: null, assignment: { teamId: { in: teamIds } } } as any ) } },
            ],
          },
        ],
      } as any,
      include: {
        task: { include: { questionGroup: true } },
        run: { include: { assignment: { include: { group: true, team: true } } } },
        proofs: true,
        answers: true,
      },
      orderBy: [{ run: { date: 'asc' } }, { task: { order: 'asc' } }],
    });
    res.json(runs.map((run) => withViewerState(run, userId, teamIds)));
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
    const scope = String(req.query.scope ?? 'team');

    // Build the user-relevance OR clauses. Used universally so that creators
    // always see what they assigned, assignees always see their work, and
    // team members see their team's load — even if scopes overlap.
    const visibility: any = {
      OR: [
        { assigneeId: userId },
        { run: { ...( { participantUserId: userId } as any ) } },
        { AND: [{ assigneeId: null }, { run: { ...( { participantUserId: null, assignment: { teamId: { in: teamIds } } } as any ) } }] },
        { run: { assignment: { createdById: userId } } },
      ],
    };

    const where: any = { ...visibility };
    if (scope === 'mine') {
      where.OR = [
        { assigneeId: userId },
        { run: { assignment: { createdById: userId } } },
      ];
    } else if (scope === 'created') {
      where.OR = [{ run: { assignment: { createdById: userId } } }];
    }

    const runFilter: any = {};
    if (req.query.teamId) runFilter.assignment = { teamId: String(req.query.teamId) };
    if (req.query.groupId) {
      runFilter.assignment = { ...(runFilter.assignment ?? {}), groupId: String(req.query.groupId) };
    }
    if (req.query.from || req.query.to) {
      const dateRange: any = {};
      if (req.query.from) dateRange.gte = new Date(String(req.query.from));
      if (req.query.to) dateRange.lte = new Date(String(req.query.to));
      runFilter.date = dateRange;
    }
    if (Object.keys(runFilter).length) where.run = runFilter;

    if (req.query.status) where.status = { in: String(req.query.status).split(',') };
    if (req.query.q) where.task = { name: { contains: String(req.query.q), mode: 'insensitive' } };

    const runs = await prisma.taskRun.findMany({
      where,
      include: {
        task: true,
        assignee: true,
        run: { include: { assignment: { include: { group: true, team: true } } } },
      },
      orderBy: [{ run: { date: 'desc' } }, { task: { order: 'asc' } }],
      take: 200,
    });
    res.json(runs.map((run) => withViewerState(run, userId, teamIds)));
  }),
);

taskRunsRoutes.get(
  '/:id',
  wrap(async (req, res) => {
    const tr: any = await (prisma.taskRun.findUnique as any)({
      where: { id: req.params.id },
      include: {
        task: { include: { questionGroup: { include: { questions: { orderBy: { order: 'asc' } } } } } },
        run: { include: { assignment: { include: { group: { include: { questionGroup: { include: { questions: { orderBy: { order: 'asc' } } } } } }, team: true } } } },
        proofs: true,
        answers: true,
        approvals: true,
        assignee: true,
      },
    });
    if (!tr) throw notFound();
    const teamIds = req.user.memberships.map((m) => m.teamId);
    res.json(withViewerState(tr, req.user.id, teamIds));
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
        deepLink: `leaflow://taskRun/${tr.id}`,
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
    if (tr.status === 'BLOCKED') throw badRequest('Task is still blocked by dependencies', undefined);
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
        throw badRequest('answerId does not belong to this task run', undefined);
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
    const minFiles = Math.max(
      tr.task.minFiles ?? 0,
      tr.run.assignment.group.minFiles ?? 0,
    );
    if (tr.proofs.length < minFiles) {
      throw badRequest(`En az ${minFiles} dosya eklemelisin (eklenen: ${tr.proofs.length})`, undefined);
    }
    const assignmentGroup: any = tr.run.assignment.group;
    const checklistGroups = [
      tr.task.questionGroup
        ? { group: tr.task.questionGroup, requirement: tr.task.checklistRequirement, label: 'alt görev checklisti' }
        : null,
      assignmentGroup.questionGroup
        ? { group: assignmentGroup.questionGroup, requirement: assignmentGroup.checklistRequirement, label: 'görev grubu checklisti' }
        : null,
    ].filter(Boolean) as Array<{ group: any; requirement: string; label: string }>;

    if (checklistGroups.length > 0) {
      const answeredIds = new Set(tr.answers.map((a) => a.questionId));
      for (const checklist of checklistGroups) {
        if (checklist.requirement !== 'MANDATORY') continue;
        const required = checklist.group.questions.filter((q: any) => q.required);
        const missing = required.filter((q: any) => !answeredIds.has(q.id));
        if (missing.length > 0) {
          throw badRequest(`${checklist.label} içinde cevaplanmamış zorunlu sorular var: ${missing.length}`, undefined);
        }
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

    // Recipients for the completion fan-out:
    //  - the assignment creator (whoever requested the work) — always
    //  - on approval-required tasks: the named approver, else all team managers
    // Skip the actor themselves to avoid self-pinging.
    const actorId = req.user.id;
    const completionTargets = new Set<string>();
    const creatorId = tr.run.assignment.createdById;
    if (creatorId && creatorId !== actorId) completionTargets.add(creatorId);

    const completionPayload = (kind: string, title: string) => ({
      title,
      body: `${tr.task.name} · ${tr.run.assignment.team.name}`,
      data: {
        kind,
        screen: 'task-detail',
        entityType: 'taskRun',
        entityId: tr.id,
        taskRunId: tr.id,
        path: `/task-runs/${tr.id}`,
        deepLink: `leaflow://taskRun/${tr.id}`,
      },
    });

    if (requiresApproval) {
      await prisma.approval.create({
        data: {
          taskRunId: tr.id,
          approverId: tr.run.assignment.approverId ?? null,
        },
      });

      const approverId = tr.run.assignment.approverId;
      if (approverId) {
        if (approverId !== actorId) completionTargets.add(approverId);
      } else {
        const managers = await prisma.teamMember.findMany({
          where: { teamId: tr.run.assignment.teamId, role: 'MANAGER' },
        });
        for (const mgr of managers) {
          if (mgr.userId !== actorId) completionTargets.add(mgr.userId);
        }
      }

      for (const userId of completionTargets) {
        adapters.push.sendToUser(userId, completionPayload('APPROVAL_REQUESTED', 'Onay bekliyor'));
      }
    } else {
      // No approval needed → tell the creator the task is done.
      for (const userId of completionTargets) {
        adapters.push.sendToUser(userId, completionPayload('TASK_COMPLETED', 'Görev tamamlandı'));
      }
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
            data: {
              kind: 'TASK_UNBLOCKED',
              screen: 'task-detail',
              entityType: 'taskRun',
              entityId: sib.id,
              taskRunId: sib.id,
              path: `/task-runs/${sib.id}`,
              deepLink: `leaflow://taskRun/${sib.id}`,
            },
          });
        }
      }
    }

    res.json(updated);
  }),
);
