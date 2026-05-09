import express from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../auth.js';
import { wrap } from '../errors.js';

export const reportsRoutes = express.Router();
reportsRoutes.use(requireAuth);

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const ymd = (d) => d.toISOString().slice(0, 10);

reportsRoutes.get(
  '/overview',
  wrap(async (req, res) => {
    const to = req.query.to ? new Date(String(req.query.to)) : new Date();
    const from = req.query.from
      ? new Date(String(req.query.from))
      : new Date(to.getTime() - 13 * 24 * 60 * 60 * 1000);

    const userId = req.user.id;
    const teamIds = req.query.teamId
      ? [String(req.query.teamId)]
      : req.user.memberships.map((m) => m.teamId);

    const runs = await prisma.taskRun.findMany({
      where: {
        run: { date: { gte: startOfDay(from), lte: to } },
        OR: [
          { run: { assignment: { teamId: { in: teamIds } } } },
          { run: { assignment: { createdById: userId } } },
          { assigneeId: userId },
        ],
      },
      include: {
        run: { include: { assignment: { include: { team: true } } } },
      },
      take: 5000,
    });

    const total = runs.length;
    const completed = runs.filter((r) => ['DONE', 'APPROVED'].includes(r.status)).length;
    const awaiting = runs.filter((r) => r.status === 'AWAITING_APPROVAL').length;
    const overdue = runs.filter((r) => r.run.date < startOfDay(new Date()) && !['DONE', 'APPROVED'].includes(r.status)).length;

    const dailyMap = new Map();
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      dailyMap.set(ymd(d), 0);
    }
    for (const r of runs) {
      if (['DONE', 'APPROVED'].includes(r.status) && r.completedAt) {
        const k = ymd(r.completedAt);
        if (dailyMap.has(k)) dailyMap.set(k, dailyMap.get(k) + 1);
      }
    }
    const daily = [...dailyMap.entries()].map(([date, value]) => ({ date, value }));

    const byTeam = new Map();
    for (const r of runs) {
      const t = r.run.assignment.team;
      if (!byTeam.has(t.id)) byTeam.set(t.id, { id: t.id, name: t.name, total: 0, completed: 0 });
      const e = byTeam.get(t.id);
      e.total += 1;
      if (['DONE', 'APPROVED'].includes(r.status)) e.completed += 1;
    }
    const teamScores = [...byTeam.values()].map((e) => ({
      ...e,
      score: e.total === 0 ? 0 : Math.round((e.completed / e.total) * 100),
    }));

    res.json({
      kpis: { total, completed, awaiting, overdue, completionRate: total === 0 ? 0 : Math.round((completed / total) * 100) },
      daily,
      teamScores,
    });
  }),
);
