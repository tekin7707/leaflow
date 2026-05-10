import express from 'express';
import { QuickTaskSchema } from '@provit/shared/schemas';
import { prisma } from '../db.js';
import { requireAuth } from '../auth.js';
import { wrap } from '../errors.js';

export const quickTaskRoutes = express.Router();
quickTaskRoutes.use(requireAuth);

/**
 * One-shot task creation. Creates a TaskGroup with a single Task inside.
 * Assignment is intentionally separate from task creation.
 */
quickTaskRoutes.post(
  '/',
  wrap(async (req, res) => {
    const data = QuickTaskSchema.parse(req.body);

    const group = await prisma.taskGroup.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        kind: 'SIMPLE',
        defaultExecutionMode: 'REPRESENTATIVE',
        defaultApprovalMode: 'NONE',
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
            questionGroupId: data.questionGroupId,
            checklistRequirement: data.checklistRequirement,
          }],
        },
      },
      include: { tasks: true },
    });

    res.status(201).json({
      group: { id: group.id, name: group.name, recurrence: group.recurrence },
      task: group.tasks[0],
    });
  }),
);
