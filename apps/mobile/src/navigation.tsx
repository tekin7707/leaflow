import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import { useAuth } from './auth';
import { T } from './theme';

import LoginScreen from './screens/Login';
import TodayScreen from './screens/Today';
import PoolScreen from './screens/Pool';
import ApprovalsScreen from './screens/Approvals';
import ProfileScreen from './screens/Profile';
import TaskWizardScreen from './screens/TaskWizard';
import QuickAssignScreen from './screens/QuickAssign';
import TaskGroupDetailScreen from './screens/TaskGroupDetail';
import NotificationsScreen from './screens/Notifications';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

function tabIcon(label) {
  return ({ focused }) => (
    <Text style={{ fontSize: 10, fontWeight: '700', color: focused ? T.accent : T.muteSoft, letterSpacing: 0.6 }}>
      {label.toUpperCase()}
    </Text>
  );
}

function MainTabs() {
  const { isManager } = useAuth();
  return (
    <Tabs.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: T.bg },
        headerTitleStyle: { fontWeight: '700' },
        tabBarStyle: { backgroundColor: T.surface, borderTopColor: T.line, height: 58 },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
        tabBarActiveTintColor: T.accent,
        tabBarInactiveTintColor: T.muteSoft,
      }}
    >
      <Tabs.Screen name="Today" component={TodayScreen} options={{ title: 'Bugün', tabBarIcon: tabIcon('Bugün') }} />
      <Tabs.Screen name="Pool" component={PoolScreen} options={{ title: 'Havuz', tabBarIcon: tabIcon('Havuz') }} />
      {isManager && (
        <Tabs.Screen name="Approvals" component={ApprovalsScreen} options={{ title: 'Onaylar', tabBarIcon: tabIcon('Onay') }} />
      )}
      <Tabs.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profil', tabBarIcon: tabIcon('Profil') }} />
    </Tabs.Navigator>
  );
}

export function RootNavigation() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return (
    <NavigationContainer
      theme={{
        dark: false,
        colors: {
          primary: T.accent, background: T.bg, card: T.surface, text: T.ink, border: T.line, notification: T.accent,
        },
      }}
    >
      <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: T.bg }, headerTitleStyle: { fontWeight: '700' } }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="Tabs" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen name="TaskWizard" component={TaskWizardScreen} options={{ presentation: 'modal', title: 'Görev' }} />
            <Stack.Screen name="QuickAssign" component={QuickAssignScreen} options={{ presentation: 'modal', title: 'Hızlı atama' }} />
            <Stack.Screen name="TaskGroupDetail" component={TaskGroupDetailScreen} options={{ title: 'Görev grubu' }} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Bildirimler' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
