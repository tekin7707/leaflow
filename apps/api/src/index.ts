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

import { startRecurrenceJob } from './jobs/recurrence.js';
import { startReminderJob } from './jobs/reminders.js';

const app = express();

app.use(cors({ origin: config.webOrigin === '*' ? true : [config.webOrigin], credentials: true }));
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

app.use('/api/auth', authRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/question-groups', questionGroupsRoutes);
app.use('/api/task-groups', taskGroupsRoutes);
app.use('/api/assignments', assignmentsRoutes);
app.use('/api/task-runs', taskRunsRoutes);
app.use('/api/approvals', approvalsRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/notifications', notificationsRoutes);

app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  startRecurrenceJob();
  startReminderJob();
}

app.listen(config.port, () => {
  log.info(`Provit API listening on http://localhost:${config.port}`);
});
