import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider, useAuth } from './src/auth';
import { RootNavigation } from './src/navigation';
import { registerPush } from './src/push';

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } });

function PushBootstrap({ children }) {
  const { user } = useAuth();
  useEffect(() => {
    if (user) registerPush();
  }, [user?.id]);
  return children;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={qc}>
        <AuthProvider>
          <PushBootstrap>
            <RootNavigation />
            <StatusBar style="dark" />
          </PushBootstrap>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
