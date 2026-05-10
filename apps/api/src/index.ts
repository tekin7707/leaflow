import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { log } from './log.js';
import { errorHandler } from './errors.js';

import { authRoutes } from './routes/auth.js';
import { teamsRoutes } from './routes/teams.js';
import { questionGroupsRoutes } from './routes/questionGroups.js';
import { taskGroupsRoutes } from './routes/taskGroups.js';
import { assignmentsRoutes } from './routes/assignments.js';
import { taskRunsRoutes } from './routes/taskRuns.js';
import { approvalsRoutes } from './routes/approvals.js';
import { filesRoutes } from './routes/files.js';
import { reportsRoutes } from './routes/reports.js';
import { notificationsRoutes } from './routes/notifications.js';
import { quickTaskRoutes } from './routes/quickTask.js';

import { startRecurrenceJob } from './jobs/recurrence.js';
import { startReminderJob } from './jobs/reminders.js';

const app = express();

// In dev allow any origin (web, expo web on :8082, LAN clients);
// in prod, restrict to WEB_ORIGIN. WEB_ORIGIN="*" forces dev behaviour explicitly.
const corsOrigin = config.isDev || config.webOrigin === '*' ? true : [config.webOrigin];
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

app.use('/api/auth', authRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/question-groups', questionGroupsRoutes);
app.use('/api/checklists', questionGroupsRoutes);
app.use('/api/task-groups', taskGroupsRoutes);
app.use('/api/assignments', assignmentsRoutes);
app.use('/api/task-runs', taskRunsRoutes);
app.use('/api/approvals', approvalsRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/quick-task', quickTaskRoutes);

app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  startRecurrenceJob();
  startReminderJob();
}

app.listen(config.port, () => {
  log.info(`Leaflow API listening on http://localhost:${config.port}`);
  log.info(
    {
      agentechBaseUrl: config.agentech.baseUrl,
      agentechApiKey: config.agentech.apiKey
        ? `${config.agentech.apiKey.slice(0, 8)}…${config.agentech.apiKey.slice(-4)}`
        : '(empty)',
      fiload: config.fiload.baseUrl,
    },
    'config loaded',
  );
});
