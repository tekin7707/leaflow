export const TeamRole = {
  MANAGER: 'MANAGER',
  MEMBER: 'MEMBER',
} as const;
export type TeamRole = (typeof TeamRole)[keyof typeof TeamRole];

export const AnswerType = {
  YES_NO: 'YES_NO',
  YES_NO_NA: 'YES_NO_NA',
  TEXT: 'TEXT',
  NUMBER: 'NUMBER',
} as const;
export type AnswerType = (typeof AnswerType)[keyof typeof AnswerType];

export const AssignmentStatus = {
  SCHEDULED: 'SCHEDULED',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type AssignmentStatus = (typeof AssignmentStatus)[keyof typeof AssignmentStatus];

export const RunStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type RunStatus = (typeof RunStatus)[keyof typeof RunStatus];

export const TaskRunStatus = {
  BLOCKED: 'BLOCKED',
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  AWAITING_APPROVAL: 'AWAITING_APPROVAL',
  DONE: 'DONE',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;
export type TaskRunStatus = (typeof TaskRunStatus)[keyof typeof TaskRunStatus];

export const ApprovalDecision = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  CHANGES_REQUESTED: 'CHANGES_REQUESTED',
} as const;
export type ApprovalDecision = (typeof ApprovalDecision)[keyof typeof ApprovalDecision];

export const NotificationKind = {
  ASSIGNMENT_NEW: 'ASSIGNMENT_NEW',
  TASK_DUE_SOON: 'TASK_DUE_SOON',
  APPROVAL_REQUESTED: 'APPROVAL_REQUESTED',
  APPROVAL_RESULT: 'APPROVAL_RESULT',
  TASK_UNBLOCKED: 'TASK_UNBLOCKED',
} as const;
export type NotificationKind = (typeof NotificationKind)[keyof typeof NotificationKind];
