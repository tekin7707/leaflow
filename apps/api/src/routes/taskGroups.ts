import express from 'express';
import { v4 as uuid } from 'uuid';
import {
  TaskGroupCreateSchema, TaskGroupUpdateSchema, TaskReorderSchema,
} from '@leaflow/shared/schemas';
import { prisma } from '../db.js';
import { requireAuth } from '../auth.js';
import { wrap, notFound, badRequest } from '../errors.js';
import { detectCycle, validateDepsWithinGroup } from '../services/deps.js';
import { buildAssignmentParticipantSummary } from '../services/assignmentParticipants.js';

export const taskGroupsRoutes = express.Router();
taskGroupsRoutes.use(requireAuth);

taskGroupsRoutes.get(
  '/',
  wrap(async (_req, res) => {
    const groups: any[] = await (prisma.taskGroup.findMany as any)({
      include: {
        tasks: { where: { archivedAt: null }, select: { id: true } },
        questionGroup: { select: { id: true, name: true } },
        _count: { select: { assignments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(
      groups.map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        kind: g.kind,
        defaultExecutionMode: g.defaultExecutionMode,
        defaultApprovalMode: g.defaultApprovalMode,
        requiresApproval: g.requiresApproval,
        minFiles: g.minFiles,
        recurrence: g.recurrence,
        questionGroup: g.questionGroup,
        questionGroupId: g.questionGroupId,
        checklistRequirement: g.checklistRequirement,
        taskCount: g.tasks.length,
        assignmentCount: g._count.assignments,
        createdAt: g.createdAt,
      })),
    );
  }),
);

taskGroupsRoutes.post(
  '/',
  wrap(async (req, res) => {
    const data = TaskGroupCreateSchema.parse(req.body);

    // Assign client-side temp ids if missing so dependsOn can reference them.
    const tasks = data.tasks.map((t, i) => ({
      ...t,
      id: t.id ?? `tmp_${i}`,
      order: t.order ?? i,
    }));
    validateDepsWithinGroup(tasks);
    detectCycle(tasks);

    const created = await prisma.$transaction(async (tx) => {
      const db: any = tx;
      const grp = await db.taskGroup.create({
        data: {
          name: data.name,
          description: data.description ?? null,
          kind: data.kind,
          defaultExecutionMode: data.defaultExecutionMode,
          defaultApprovalMode: data.defaultApprovalMode,
          requiresApproval: data.requiresApproval ?? false,
          minFiles: data.minFiles ?? 0,
          recurrence: data.recurrence ?? null,
          questionGroupId: data.questionGroupId ?? null,
          checklistRequirement: data.checklistRequirement,
        },
      });

      // Map temp id → real id, then re-map dependsOn after creation.
      const idMap = new Map();
      for (const t of tasks) idMap.set(t.id, uuid()); // pre-allocate

      // First insert tasks with placeholder dependsOn; then update mapping.
      await tx.task.createMany({
        data: tasks.map((t) => ({
          id: idMap.get(t.id),
          groupId: grp.id,
          name: t.name,
          description: t.description ?? null,
          order: t.order,
          estimatedMinutes: t.estimatedMinutes,
          minFiles: t.minFiles,
          requiresApproval: t.requiresApproval,
          questionGroupId: t.questionGroupId ?? null,
          checklistRequirement: t.checklistRequirement,
          dependsOn: (t.dependsOn ?? []).map((d) => idMap.get(d)).filter(Boolean),
        })),
      });

      return tx.taskGroup.findUnique({
        where: { id: grp.id },
        include: { tasks: { orderBy: { order: 'asc' } } },
      });
    });

    res.status(201).json(created);
  }),
);

taskGroupsRoutes.get(
  '/:id',
  wrap(async (req, res) => {
    const g: any = await (prisma.taskGroup.findUnique as any)({
      where: { id: req.params.id },
      include: {
        questionGroup: true,
        tasks: { where: { archivedAt: null }, orderBy: { order: 'asc' }, include: { questionGroup: true } },
        assignments: {
          include: { team: true },
          orderBy: { startsAt: 'desc' },
          take: 50,
        },
      },
    });
    if (!g) throw notFound();
    const participantSummary = await buildAssignmentParticipantSummary(
      g.assignments.map((assignment) => assignment.id),
    );
    res.json({
      ...g,
      assignments: g.assignments.map((assignment) => ({
        ...assignment,
        participantSummary: participantSummary.get(assignment.id) ?? null,
      })),
    });
  }),
);

taskGroupsRoutes.put(
  '/:id',
  wrap(async (req, res) => {
    const data = TaskGroupUpdateSchema.parse(req.body);
    const groupId = req.params.id;

    if (data.tasks) {
      const tasks = data.tasks.map((t, i) => ({
        ...t,
        id: t.id ?? `tmp_${i}`,
        order: t.order ?? i,
      }));
      validateDepsWithinGroup(tasks);
      detectCycle(tasks);

      const updated = await prisma.$transaction(async (tx) => {
        const db: any = tx;
        await db.taskGroup.update({
          where: { id: groupId },
          data: {
            name: data.name,
            description: data.description ?? null,
            kind: data.kind,
            defaultExecutionMode: data.defaultExecutionMode,
            defaultApprovalMode: data.defaultApprovalMode,
            requiresApproval: data.requiresApproval ?? false,
            minFiles: data.minFiles ?? 0,
            recurrence: data.recurrence ?? null,
            questionGroupId: data.questionGroupId ?? null,
            checklistRequirement: data.checklistRequirement,
          },
        });

        const existing = await db.task.findMany({ where: { groupId, archivedAt: null } });
        const idMap = new Map();
        for (const t of tasks) {
          idMap.set(t.id, uuid());
        }
        await db.task.updateMany({
          where: { groupId, archivedAt: null },
          data: { archivedAt: new Date() },
        });

        for (const t of tasks) {
          const realId = idMap.get(t.id);
          const payload = {
            groupId,
            name: t.name,
            description: t.description ?? null,
            order: t.order,
            estimatedMinutes: t.estimatedMinutes,
            minFiles: t.minFiles,
            requiresApproval: t.requiresApproval,
            questionGroupId: t.questionGroupId ?? null,
            checklistRequirement: t.checklistRequirement,
            dependsOn: (t.dependsOn ?? []).map((d) => idMap.get(d)).filter(Boolean),
          };
          await tx.task.create({ data: { id: realId, ...payload } });
        }

        return db.taskGroup.findUnique({
          where: { id: groupId },
          include: { tasks: { where: { archivedAt: null }, orderBy: { order: 'asc' } } },
        });
      });
      return res.json(updated);
    }

    const updated = await (prisma.taskGroup.update as any)({
      where: { id: groupId },
      data: {
        name: data.name,
        description: data.description ?? undefined,
        requiresApproval: data.requiresApproval,
        minFiles: data.minFiles,
        recurrence: data.recurrence ?? null,
        questionGroupId: data.questionGroupId ?? null,
        checklistRequirement: data.checklistRequirement,
      },
    });
    res.json(updated);
  }),
);

taskGroupsRoutes.delete(
  '/:id',
  wrap(async (req, res) => {
    await prisma.taskGroup.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);

taskGroupsRoutes.post(
  '/:id/tasks/reorder',
  wrap(async (req, res) => {
    const { taskIds } = TaskReorderSchema.parse(req.body);
    const tasks = await (prisma.task.findMany as any)({
      where: { groupId: req.params.id, archivedAt: null },
    });
    const knownIds = new Set(tasks.map((t) => t.id));
    if (!taskIds.every((id) => knownIds.has(id))) {
      throw badRequest('taskIds contain unknown ids', undefined);
    }
    await prisma.$transaction(
      taskIds.map((id, idx) =>
        prisma.task.update({ where: { id }, data: { order: idx } }),
      ),
    );
    res.status(204).end();
  }),
);
