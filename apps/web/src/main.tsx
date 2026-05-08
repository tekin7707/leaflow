import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider, ProtectedRoute } from './auth';
import { Layout } from './components/Layout';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Teams from './pages/Teams';
import Checklists from './pages/Checklists';
import TaskGroups from './pages/TaskGroups';
import TaskGroupDetail from './pages/TaskGroupDetail';
import AssignmentNew from './pages/AssignmentNew';
import Timeline from './pages/Timeline';
import Approvals from './pages/Approvals';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';
import TaskRunDetail from './pages/TaskRunDetail';

import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="teams" element={<Teams />} />
              <Route path="checklists" element={<Checklists />} />
              <Route path="task-groups" element={<TaskGroups />} />
              <Route path="task-groups/:id" element={<TaskGroupDetail />} />
              <Route path="assignments/new" element={<AssignmentNew />} />
              <Route path="timeline" element={<Timeline />} />
              <Route path="approvals" element={<Approvals />} />
              <Route path="reports" element={<Reports />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="task-runs/:id" element={<TaskRunDetail />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
