import express from 'express';
import { PushTokenSchema } from '@leaflow/shared/schemas';
import { prisma } from '../db.js';
import { requireAuth } from '../auth.js';
import { wrap } from '../errors.js';

export const notificationsRoutes = express.Router();
notificationsRoutes.use(requireAuth);

notificationsRoutes.get(
  '/',
  wrap(async (req, res) => {
    const where = { userId: req.user.id };
    if (req.query.unread === '1') where.readAt = null;
    const list = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(list);
  }),
);

notificationsRoutes.post(
  '/:id/read',
  wrap(async (req, res) => {
    const n = await prisma.notification.update({
      where: { id: req.params.id },
      data: { readAt: new Date() },
    });
    res.json(n);
  }),
);

notificationsRoutes.post(
  '/push-token',
  wrap(async (req, res) => {
    const { token } = PushTokenSchema.parse(req.body);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { pushToken: token },
    });
    res.json({ ok: true });
  }),
);

notificationsRoutes.delete(
  '/push-token',
  wrap(async (req, res) => {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { pushToken: null },
    });
    res.json({ ok: true });
  }),
);
