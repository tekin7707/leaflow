import express from 'express';
import {
  QuestionGroupCreateSchema,
  QuestionGroupQuestionsSchema,
} from '@provit/shared/schemas';
import { prisma } from '../db.js';
import { requireAuth } from '../auth.js';
import { wrap, notFound } from '../errors.js';

export const questionGroupsRoutes = express.Router();
questionGroupsRoutes.use(requireAuth);

questionGroupsRoutes.get(
  '/',
  wrap(async (_req, res) => {
    const groups = await prisma.questionGroup.findMany({
      include: { _count: { select: { questions: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(
      groups.map((g) => ({
        id: g.id,
        name: g.name,
        questionCount: g._count.questions,
        createdAt: g.createdAt,
      })),
    );
  }),
);

questionGroupsRoutes.post(
  '/',
  wrap(async (req, res) => {
    const { name } = QuestionGroupCreateSchema.parse(req.body);
    const g = await prisma.questionGroup.create({ data: { name } });
    res.status(201).json(g);
  }),
);

questionGroupsRoutes.get(
  '/:id',
  wrap(async (req, res) => {
    const g = await prisma.questionGroup.findUnique({
      where: { id: req.params.id },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
    if (!g) throw notFound();
    res.json(g);
  }),
);

questionGroupsRoutes.put(
  '/:id',
  wrap(async (req, res) => {
    const { name } = QuestionGroupCreateSchema.parse(req.body);
    const g = await prisma.questionGroup.update({
      where: { id: req.params.id },
      data: { name },
    });
    res.json(g);
  }),
);

questionGroupsRoutes.delete(
  '/:id',
  wrap(async (req, res) => {
    await prisma.questionGroup.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);

questionGroupsRoutes.get(
  '/:id/used-by',
  wrap(async (req, res) => {
    const tasks = await prisma.task.findMany({
      where: { questionGroupId: req.params.id },
      include: { group: { select: { id: true, name: true } } },
      orderBy: [{ group: { name: 'asc' } }, { order: 'asc' }],
    });
    res.json(
      tasks.map((t) => ({
        taskId: t.id,
        taskName: t.name,
        taskOrder: t.order,
        taskGroupId: t.groupId,
        taskGroupName: t.group.name,
      })),
    );
  }),
);

questionGroupsRoutes.post(
  '/:id/questions',
  wrap(async (req, res) => {
    const { questions } = QuestionGroupQuestionsSchema.parse(req.body);
    const groupId = req.params.id;
    const group = await prisma.questionGroup.findUnique({ where: { id: groupId } });
    if (!group) throw notFound();

    await prisma.$transaction([
      prisma.question.deleteMany({ where: { groupId } }),
      prisma.question.createMany({
        data: questions.map((q, i) => ({
          groupId,
          text: q.text,
          answerType: q.answerType,
          weight: q.weight,
          required: q.required,
          order: q.order ?? i,
        })),
      }),
    ]);

    const updated = await prisma.questionGroup.findUnique({
      where: { id: groupId },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
    res.json(updated);
  }),
);
