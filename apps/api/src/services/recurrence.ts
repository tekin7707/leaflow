/**
 * Recurrence string format (CLAUDE_CODE_SPEC):
 *   null              → one-shot, single instance on startsAt
 *   "DAILY"           → every day in [startsAt, endsAt]
 *   "WEEKLY:1,3,5"    → on given weekdays (0=Sun..6=Sat) in window
 *   "MONTHLY:1"       → on given day-of-month
 */

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export function expandRecurrence(recurrence, startsAt, endsAt) {
  const start = startOfDay(startsAt);
  const end = startOfDay(endsAt);
  if (end < start) return [];

  if (!recurrence) return [start];

  const dates = [];
  if (recurrence === 'DAILY') {
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) dates.push(new Date(d));
    return dates;
  }

  if (recurrence.startsWith('WEEKLY:')) {
    const days = recurrence
      .slice('WEEKLY:'.length)
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
    if (days.length === 0) return [];
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      if (days.includes(d.getDay())) dates.push(new Date(d));
    }
    return dates;
  }

  if (recurrence.startsWith('MONTHLY:')) {
    const days = recurrence
      .slice('MONTHLY:'.length)
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= 31);
    if (days.length === 0) return [];
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      if (days.includes(d.getDate())) dates.push(new Date(d));
    }
    return dates;
  }

  return [start];
}

/**
 * For a given Assignment + its TaskGroup (with tasks), build the TaskGroupRun
 * + child TaskRun rows to insert. Caller wraps in a transaction.
 *
 * Each TaskRun starts BLOCKED if the task has dependsOn, else PENDING.
 */
export function buildRunsPlan(assignment, taskGroup, dates) {
  const tasks = taskGroup.tasks;
  return dates.map((date) => ({
    assignmentId: assignment.id,
    date,
    taskRuns: tasks.map((t) => ({
      taskId: t.id,
      status: (t.dependsOn?.length ?? 0) > 0 ? 'BLOCKED' : 'PENDING',
    })),
  }));
}
