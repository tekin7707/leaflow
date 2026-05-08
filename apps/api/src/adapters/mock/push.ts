import { prisma } from '../../db.js';
import { log } from '../../log.js';

/**
 * Mock push adapter ("Notifit"):
 * - Logs the message
 * - Inserts a Notification row so the recipient sees it in the in-app feed.
 * @type {import('@provit/shared').PushAdapter}
 */
export const pushAdapter = {
  async sendToUser(userId, { title, body, data }) {
    log.info({ userId, title, body, data }, 'push:send');
    await prisma.notification.create({
      data: {
        userId,
        kind: data?.kind ?? 'GENERIC',
        title,
        body,
        data: data ?? null,
      },
    });
  },
};
