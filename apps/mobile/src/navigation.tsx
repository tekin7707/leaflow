import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { navigationRef } from './notifications';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from './auth';
import { api } from './api';
import { T } from './theme';

import LoginScreen from './screens/Login';
import TodayScreen from './screens/Today';
import PoolScreen from './screens/Pool';
import ApprovalsScreen from './screens/Approvals';
import ProfileScreen from './screens/Profile';
import TaskWizardScreen from './screens/TaskWizard';
import QuickAssignScreen from './screens/QuickAssign';
import QuickTaskScreen from './screens/QuickTask';
import TaskGroupDetailScreen from './screens/TaskGroupDetail';
import NotificationsScreen from './screens/Notifications';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

function makeTabIcon(name: keyof typeof Ionicons.glyphMap, activeName?: keyof typeof Ionicons.glyphMap, badge?: number) {
  return ({ focused, color }: any) => (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 44, height: 32 }}>
      <Ionicons name={focused ? (activeName ?? name) : name} size={focused ? 26 : 24} color={color} />
      {badge !== undefined && badge > 0 && (
        <View
          style={{
            position: 'absolute',
            top: -2,
            right: 2,
            backgroundColor: T.accent,
            borderRadius: 9,
            minWidth: 16,
            height: 16,
            paddingHorizontal: 4,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      )}
    </View>
  );
}

function MainTabs() {
  const { isManager, user } = useAuth();
  const insets = useSafeAreaInsets();

  const unreadQ = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const list = await api.get('/api/notifications?unread=1');
      return Array.isArray(list) ? list.length : 0;
    },
    refetchInterval: 30_000,
    enabled: !!user,
  });
  const unread = unreadQ.data ?? 0;

  const approvalsQ = useQuery({
    queryKey: ['approvals', 'queue', 'count'],
    queryFn: async () => {
      const list = await api.get('/api/approvals/queue');
      return Array.isArray(list) ? list.length : 0;
    },
    refetchInterval: 30_000,
    enabled: !!user && isManager,
  });
  const pendingApprovals = approvalsQ.data ?? 0;

  return (
    <Tabs.Navigator
      id={undefined}
      screenOptions={{
        headerStyle: { backgroundColor: T.bg, shadowColor: 'transparent' },
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        tabBarStyle: {
          backgroundColor: T.surface,
          borderTopColor: T.line,
          borderTopWidth: 1,
          height: 56 + (insets.bottom > 0 ? insets.bottom : Platform.OS === 'ios' ? 18 : 8),
          paddingTop: 8,
          paddingBottom: insets.bottom > 0 ? insets.bottom : Platform.OS === 'ios' ? 18 : 8,
          shadowColor: '#000',
          shadowOpacity: 0.04,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: -2 },
          elevation: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
        tabBarActiveTintColor: T.accent,
        tabBarInactiveTintColor: T.muteSoft,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="Today"
        component={TodayScreen}
        options={{
          title: 'Bugün',
          tabBarIcon: makeTabIcon('today-outline', 'today'),
        }}
      />
      <Tabs.Screen
        name="Pool"
        component={PoolScreen}
        options={{
          title: 'Havuz',
          tabBarIcon: makeTabIcon('layers-outline', 'layers'),
        }}
      />
      {isManager && (
        <Tabs.Screen
          name="Approvals"
          component={ApprovalsScreen}
          options={{
            title: 'Onay',
            tabBarIcon: makeTabIcon('checkmark-circle-outline', 'checkmark-circle', pendingApprovals),
          }}
        />
      )}
      <Tabs.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: 'Bildirim',
          tabBarIcon: makeTabIcon('notifications-outline', 'notifications', unread),
        }}
      />
      <Tabs.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profil',
          tabBarIcon: makeTabIcon('person-outline', 'person'),
        }}
      />
    </Tabs.Navigator>
  );
}

export function RootNavigation() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return (
    <NavigationContainer
      ref={navigationRef}
      theme={{
        ...DefaultTheme,
        dark: false,
        colors: {
          ...DefaultTheme.colors,
          primary: T.accent,
          background: T.bg,
          card: T.surface,
          text: T.ink,
          border: T.line,
          notification: T.accent,
        },
      }}
    >
      <Stack.Navigator id={undefined} screenOptions={{ headerStyle: { backgroundColor: T.bg }, headerTitleStyle: { fontWeight: '700' } }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="Tabs" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen name="TaskWizard" component={TaskWizardScreen} options={{ presentation: 'modal', title: 'Görev' }} />
            <Stack.Screen name="QuickAssign" component={QuickAssignScreen} options={{ presentation: 'modal', title: 'Mevcut göreve ata' }} />
            <Stack.Screen name="QuickTask" component={QuickTaskScreen} options={{ presentation: 'modal', title: 'Hızlı görev' }} />
            <Stack.Screen name="TaskGroupDetail" component={TaskGroupDetailScreen} options={{ title: 'Görev grubu' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
