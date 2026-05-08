import { prisma } from '../db.js';
import { badRequest } from '../errors.js';

/**
 * Detect cycles in dependsOn. Each task is { id, dependsOn: string[] }.
 * Returns { ok, order? } where order is a topo sort. Throws on cycle.
 */
export function detectCycle(tasks) {
  const ids = new Set(tasks.map((t) => t.id));
  const adj = new Map();
  for (const t of tasks) {
    const deps = (t.dependsOn || []).filter((d) => ids.has(d));
    adj.set(t.id, deps);
  }
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map(tasks.map((t) => [t.id, WHITE]));
  const order = [];

  const visit = (id, path) => {
    color.set(id, GRAY);
    for (const dep of adj.get(id) ?? []) {
      const c = color.get(dep);
      if (c === GRAY) {
        throw badRequest('dependsOn cycle detected', { cycle: [...path, id, dep] });
      }
      if (c === WHITE) visit(dep, [...path, id]);
    }
    color.set(id, BLACK);
    order.push(id);
  };

  for (const t of tasks) if (color.get(t.id) === WHITE) visit(t.id, []);
  return { ok: true, order };
}

/**
 * Validate that every dependsOn id refers to a sibling within the same task list.
 */
export function validateDepsWithinGroup(tasks) {
  const ids = new Set(tasks.map((t) => t.id));
  for (const t of tasks) {
    for (const dep of t.dependsOn || []) {
      if (!ids.has(dep)) {
        throw badRequest(`dependsOn references unknown task: ${dep}`);
      }
    }
  }
}

/**
 * After a TaskRun moves to DONE / APPROVED, walk its run's other taskRuns and
 * promote any whose dependencies are now satisfied from BLOCKED to PENDING.
 *
 * Returns the IDs of the unblocked TaskRuns (so the caller can fire notifications).
 */
export async function unblockDependents(taskRunId) {
  const completed = await prisma.taskRun.findUnique({
    where: { id: taskRunId },
    include: { task: true },
  });
  if (!completed) return [];

  const siblings = await prisma.taskRun.findMany({
    where: { runId: completed.runId, status: 'BLOCKED' },
    include: { task: true },
  });

  const allDoneStates = new Set(['DONE', 'APPROVED']);

  const unblocked = [];
  for (const tr of siblings) {
    const depIds = tr.task.dependsOn ?? [];
    if (depIds.length === 0) {
      unblocked.push(tr);
      continue;
    }
    const depRuns = await prisma.taskRun.findMany({
      where: { runId: completed.runId, taskId: { in: depIds } },
      include: { task: true },
    });
    const allSatisfied =
      depRuns.length === depIds.length &&
      depRuns.every((d) =>
        d.task.requiresApproval ? d.status === 'APPROVED' : allDoneStates.has(d.status),
      );
    if (allSatisfied) unblocked.push(tr);
  }

  if (unblocked.length === 0) return [];

  await prisma.taskRun.updateMany({
    where: { id: { in: unblocked.map((u) => u.id) } },
    data: { status: 'PENDING' },
  });
  return unblocked.map((u) => u.id);
}
