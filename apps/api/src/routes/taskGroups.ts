import express from 'express';
import { v4 as uuid } from 'uuid';
import {
  TaskGroupCreateSchema, TaskGroupUpdateSchema, TaskReorderSchema,
} from '@provit/shared/schemas';
import { prisma } from '../db.js';
import { requireAuth } from '../auth.js';
import { wrap, notFound, badRequest } from '../errors.js';
import { detectCycle, validateDepsWithinGroup } from '../services/deps.js';

export const taskGroupsRoutes = express.Router();
taskGroupsRoutes.use(requireAuth);

taskGroupsRoutes.get(
  '/',
  wrap(async (_req, res) => {
    const groups = await prisma.taskGroup.findMany({
      include: { _count: { select: { tasks: true, assignments: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(
      groups.map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        requiresApproval: g.requiresApproval,
        minFiles: g.minFiles,
        recurrence: g.recurrence,
        taskCount: g._count.tasks,
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
      const grp = await tx.taskGroup.create({
        data: {
          name: data.name,
          description: data.description ?? null,
          requiresApproval: data.requiresApproval ?? false,
          minFiles: data.minFiles ?? 0,
          recurrence: data.recurrence ?? null,
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
    const g = await prisma.taskGroup.findUnique({
      where: { id: req.params.id },
      include: {
        tasks: { orderBy: { order: 'asc' }, include: { questionGroup: true } },
        assignments: {
          include: { team: true },
          orderBy: { startsAt: 'desc' },
          take: 50,
        },
      },
    });
    if (!g) throw notFound();
    res.json(g);
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
        await tx.taskGroup.update({
          where: { id: groupId },
          data: {
            name: data.name,
            description: data.description ?? null,
            requiresApproval: data.requiresApproval ?? false,
            minFiles: data.minFiles ?? 0,
            recurrence: data.recurrence ?? null,
          },
        });

        const existing = await tx.task.findMany({ where: { groupId } });
        const existingIds = new Set(existing.map((t) => t.id));
        const idMap = new Map();
        for (const t of tasks) {
          idMap.set(t.id, existingIds.has(t.id) ? t.id : uuid());
        }
        const keepIds = new Set([...idMap.values()]);
        await tx.task.deleteMany({
          where: { groupId, id: { notIn: [...keepIds] } },
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
            dependsOn: (t.dependsOn ?? []).map((d) => idMap.get(d)).filter(Boolean),
          };
          if (existingIds.has(realId)) {
            await tx.task.update({ where: { id: realId }, data: payload });
          } else {
            await tx.task.create({ data: { id: realId, ...payload } });
          }
        }

        return tx.taskGroup.findUnique({
          where: { id: groupId },
          include: { tasks: { orderBy: { order: 'asc' } } },
        });
      });
      return res.json(updated);
    }

    const updated = await prisma.taskGroup.update({
      where: { id: groupId },
      data: {
        name: data.name,
        description: data.description ?? undefined,
        requiresApproval: data.requiresApproval,
        minFiles: data.minFiles,
        recurrence: data.recurrence ?? null,
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
    const tasks = await prisma.task.findMany({
      where: { groupId: req.params.id },
    });
    const knownIds = new Set(tasks.map((t) => t.id));
    if (!taskIds.every((id) => knownIds.has(id))) {
      throw badRequest('taskIds contain unknown ids');
    }
    await prisma.$transaction(
      taskIds.map((id, idx) =>
        prisma.task.update({ where: { id }, data: { order: idx } }),
      ),
    );
    res.status(204).end();
  }),
);
