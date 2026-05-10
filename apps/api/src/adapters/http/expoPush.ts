import { prisma } from '../../db.js';
import { config } from '../../config.js';
import { log } from '../../log.js';

/**
 * Sends pushes via Expo's public push API.
 * Stores an in-app Notification row regardless of upstream success so users
 * always see the message in the bell/inbox.
 *
 * NOTE: agentechauth's /notifications/test only delivers to the caller's own
 * devices ("self-flow"). Sending a push to a different user requires a real
 * cross-user endpoint that agentechauth does not expose today, so we go to
 * Expo directly using the recipient's Expo push token (registered by mobile
 * via /api/notifications/push-token at login). Replace this adapter with an
 * agentechauth call once a "send-to-user" endpoint exists upstream.
 */
async function sendExpoPush(token, payload) {
  const body = [
    {
      to: token,
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      sound: 'default',
      priority: 'high',
      channelId: 'default',
    },
  ];
  const headers = {
    'content-type': 'application/json',
    accept: 'application/json',
  };
  if (config.expo.accessToken) {
    headers.authorization = `Bearer ${config.expo.accessToken}`;
  }
  const res = await fetch(config.expo.pushUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) {
    log.warn({ status: res.status, json }, 'expo:push:http-error');
    return false;
  }
  const ticket = json?.data?.[0];
  if (ticket?.status === 'error') {
    log.warn({ ticket }, 'expo:push:ticket-error');
    return false;
  }
  return true;
}

function isExpoPushToken(token) {
  return typeof token === 'string'
    && (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken['));
}

export const expoPushAdapter = {
  async sendToUser(userId, payload) {
    log.info({ userId, title: payload.title }, 'push:send');

    const u = await prisma.user.findUnique({ where: { id: userId } });

    await prisma.notification.create({
      data: {
        userId,
        kind: payload.data?.kind ?? 'GENERIC',
        title: payload.title,
        body: payload.body,
        data: payload.data ?? null,
      },
    });

    const token = u?.pushToken;
    if (!isExpoPushToken(token)) {
      log.info({ userId, hasToken: !!token }, 'push:skip-no-expo-token');
      return;
    }
    try {
      await sendExpoPush(token, payload);
    } catch (err) {
      log.warn({ err, userId }, 'expo:push:exception');
    }
  },
};
