import { z } from 'zod';
import {
  TeamRole, AnswerType, ApprovalDecision, TaskGroupKind, ExecutionMode, ApprovalMode, ChecklistRequirement,
} from './enums.js';

const enumValues = <T extends Record<string, string>>(obj: T) =>
  Object.values(obj) as [T[keyof T], ...T[keyof T][]];

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const TeamCreateSchema = z.object({
  name: z.string().min(1).max(80),
  code: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/i),
});
export type TeamCreateInput = z.infer<typeof TeamCreateSchema>;

export const TeamMemberAddSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(enumValues(TeamRole)).default(TeamRole.MEMBER),
});
export type TeamMemberAddInput = z.infer<typeof TeamMemberAddSchema>;

export const TeamMemberRoleSchema = z.object({
  role: z.enum(enumValues(TeamRole)),
});

export const QuestionSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1),
  answerType: z.enum(enumValues(AnswerType)).default(AnswerType.YES_NO),
  weight: z.number().int().min(1).max(5).default(3),
  required: z.boolean().default(true),
  order: z.number().int().min(0),
});
export type QuestionInput = z.infer<typeof QuestionSchema>;

export const QuestionGroupCreateSchema = z.object({
  name: z.string().min(1).max(120),
});

export const QuestionGroupQuestionsSchema = z.object({
  questions: z.array(QuestionSchema).min(1),
});

export const TaskInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  order: z.number().int().min(0),
  estimatedMinutes: z.number().int().min(1).default(15),
  minFiles: z.number().int().min(0).default(0),
  requiresApproval: z.boolean().default(false),
  questionGroupId: z.string().nullable().optional(),
  checklistRequirement: z.enum(enumValues(ChecklistRequirement)).default(ChecklistRequirement.OPTIONAL),
  dependsOn: z.array(z.string()).default([]),
});
export type TaskInput = z.infer<typeof TaskInputSchema>;

export const TaskGroupCreateSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().optional(),
  kind: z.enum(enumValues(TaskGroupKind)).default(TaskGroupKind.GROUP),
  defaultExecutionMode: z.enum(enumValues(ExecutionMode)).default(ExecutionMode.REPRESENTATIVE),
  defaultApprovalMode: z.enum(enumValues(ApprovalMode)).default(ApprovalMode.NONE),
  requiresApproval: z.boolean().default(false),
  minFiles: z.number().int().min(0).default(0),
  recurrence: z.string().nullable().optional(),
  questionGroupId: z.string().nullable().optional(),
  checklistRequirement: z.enum(enumValues(ChecklistRequirement)).default(ChecklistRequirement.OPTIONAL),
  tasks: z.array(TaskInputSchema).min(1),
});
export type TaskGroupCreateInput = z.infer<typeof TaskGroupCreateSchema>;

export const TaskGroupUpdateSchema = TaskGroupCreateSchema.partial();

export const TaskReorderSchema = z.object({
  taskIds: z.array(z.string()).min(1),
});

export const AssignmentCreateSchema = z
  .object({
    groupId: z.string().min(1),
    teamId: z.string().min(1).optional(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    approverId: z.string().nullable().optional(),
    assigneeId: z.string().nullable().optional(),
    executionMode: z.enum(enumValues(ExecutionMode)).optional(),
    approvalMode: z.enum(enumValues(ApprovalMode)).optional(),
  })
  .refine((v) => Boolean(v.teamId || v.assigneeId), {
    message: 'teamId or assigneeId is required',
    path: ['teamId'],
  })
  .refine(
    (v) => new Date(v.endsAt).getTime() > new Date(v.startsAt).getTime(),
    { message: 'endsAt must be after startsAt', path: ['endsAt'] },
  );

export const TaskRunAssignSchema = z.object({
  userId: z.string().min(1),
});
export type TaskRunAssignInput = z.infer<typeof TaskRunAssignSchema>;

export const TaskRunNoteSchema = z.object({
  note: z.string().max(2000).nullable(),
});
export type TaskRunNoteInput = z.infer<typeof TaskRunNoteSchema>;

export const AssignmentQuickSchema = z.object({
  groupId: z.string().min(1),
  target: z.object({
    kind: z.enum(['TEAM', 'USER']),
    id: z.string().min(1),
  }),
  when: z.string().min(1),
  executionMode: z.enum(enumValues(ExecutionMode)).optional(),
});

/**
 * One-shot create-task-and-assign payload. Auto-creates a TaskGroup with a
 * single Task inside it and (optionally) an Assignment + per-user push.
 */
export const QuickTaskSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().optional(),
  questionGroupId: z.string().min(1),
  checklistRequirement: z.enum(enumValues(ChecklistRequirement)).default(ChecklistRequirement.MANDATORY),
  requiresApproval: z.boolean().default(false),
  minFiles: z.number().int().min(0).default(0),
  estimatedMinutes: z.number().int().min(1).default(15),
  recurrence: z.string().nullable().optional(),
});
export type QuickTaskInput = z.infer<typeof QuickTaskSchema>;

export const AnswerSchema = z.object({
  questionId: z.string().min(1),
  value: z.string().min(1),
  note: z.string().optional(),
});
export type AnswerInput = z.infer<typeof AnswerSchema>;

export const ProofSchema = z.object({
  key: z.string().min(1),
  filename: z.string().min(1),
  mime: z.string().min(1),
  sizeBytes: z.number().int().min(0),
  answerId: z.string().min(1).optional(),
});
export type ProofInput = z.infer<typeof ProofSchema>;

export const ApprovalDecideSchema = z.object({
  decision: z.enum([ApprovalDecision.APPROVED, ApprovalDecision.CHANGES_REQUESTED]),
  comment: z.string().optional(),
});

export const ApprovalBulkDecideSchema = z.object({
  ids: z.array(z.string()).min(1),
  decision: z.enum([ApprovalDecision.APPROVED, ApprovalDecision.CHANGES_REQUESTED]),
  comment: z.string().optional(),
});

export const PushTokenSchema = z.object({
  token: z.string().min(1),
});
