import { useEffect } from 'react';
import { createNavigationContainerRef } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';

export const navigationRef = createNavigationContainerRef<any>();

/**
 * Resolves the deep-link/data payload (per spec §5.6) into a navigation action.
 * Order: deepLink → entityId/entityType → screen → fallback.
 */
function navigateFromPayload(data: any) {
  if (!data) return;
  if (!navigationRef.isReady()) {
    setTimeout(() => navigateFromPayload(data), 250);
    return;
  }

  if (data.deepLink && typeof data.deepLink === 'string') {
    const parsed = Linking.parse(data.deepLink);
    if (parsed.hostname === 'taskRun' && parsed.path) {
      navigationRef.navigate('TaskWizard', { taskRunId: parsed.path });
      return;
    }
    if (parsed.hostname === 'taskRun' && data.entityId) {
      navigationRef.navigate('TaskWizard', { taskRunId: data.entityId });
      return;
    }
  }

  if (data.entityType === 'taskRun' && data.entityId) {
    navigationRef.navigate('TaskWizard', { taskRunId: data.entityId });
    return;
  }
  if (data.taskRunId) {
    navigationRef.navigate('TaskWizard', { taskRunId: data.taskRunId });
    return;
  }
  if (data.screen === 'task-detail' && data.entityId) {
    navigationRef.navigate('TaskWizard', { taskRunId: data.entityId });
    return;
  }
  if (data.assignmentId) {
    navigationRef.navigate('Tabs', { screen: 'Today' });
    return;
  }
  navigationRef.navigate('Notifications');
}

/**
 * Wires:
 *   - foreground tap (`addNotificationResponseReceivedListener`)
 *   - cold-start (`getLastNotificationResponseAsync`) — required by spec §5.6
 *
 * Only attaches once an authenticated user is present so we don't fight the
 * Login screen for routing.
 */
export function useNotificationRouter(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let mounted = true;

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!mounted || !response) return;
      navigateFromPayload(response.notification.request.content.data);
    });

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      navigateFromPayload(response.notification.request.content.data);
    });

    return () => {
      mounted = false;
      sub.remove();
    };
  }, [enabled]);
}
