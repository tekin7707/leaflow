import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { api, agentech, EAS_PROJECT_ID } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const APP_ID = (Constants.expoConfig as any)?.android?.package
  ?? (Constants.expoConfig as any)?.ios?.bundleIdentifier
  ?? 'com.provit.mobile';

/**
 * Asks for notification permission, fetches the Expo push token, and registers
 * the device with both agentechauth (per spec §5.2) and our own API (so the
 * Provit backend can send pushes when assigning tasks).
 */
export async function registerPush(): Promise<string | null> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let final = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      final = status;
    }
    if (final !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
      });
    }

    const tokenData = await Notifications.getExpoPushTokenAsync(
      EAS_PROJECT_ID ? { projectId: EAS_PROJECT_ID } : undefined,
    ).catch(() => null);
    const token = tokenData?.data;
    if (!token) return null;

    // Provit API — used by our backend for direct Expo sends
    try {
      await api.post('/api/notifications/push-token', { token });
    } catch (err) {
      console.warn('push:provit-register error', err);
    }

    // agentechauth — keep their inventory in sync per spec §5.2
    try {
      await agentech('/notifications/devices/register', {
        method: 'POST',
        body: {
          expoPushToken: token,
          platform: Platform.OS === 'ios' ? 'ios' : 'android',
          deviceName: Constants.deviceName ?? `${Platform.OS}-device`,
          appId: APP_ID,
          experienceId: EAS_PROJECT_ID,
        },
      });
    } catch (err) {
      console.warn('push:agentech-register error', err);
    }

    return token;
  } catch (err) {
    console.warn('push:register error', err);
    return null;
  }
}

export async function unregisterPush(): Promise<void> {
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync(
      EAS_PROJECT_ID ? { projectId: EAS_PROJECT_ID } : undefined,
    ).catch(() => null);
    const token = tokenData?.data;
    if (token) {
      try {
        await agentech('/notifications/devices/unregister', {
          method: 'POST',
          body: { expoPushToken: token },
        });
      } catch { /* best-effort */ }
    }
  } catch { /* best-effort */ }
  try { await api.del('/api/notifications/push-token'); } catch { /* best-effort */ }
}
