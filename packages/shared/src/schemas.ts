import { z } from 'zod';
import {
  GSTIN_REGEX, GST_RATES, CLIENT_STATUS, PROJECT_STATUS, MILESTONE_STATUS, TASK_STATUS, PRIORITY,
} from './enums.js';

/**
 * Shared Zod schemas — the single source of truth for request validation (§0.4).
 * Backend validates with these; frontend reuses them for form validation + types.
 */

// ---- Auth ----
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshInput = z.infer<typeof RefreshSchema>;

export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(10, 'Password must be at least 10 characters'),
});

// ---- Users ----
export const CreateUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  roleId: z.string().uuid(),
  clientId: z.string().uuid().optional(),
  phone: z.string().optional(),
});
export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z
  .object({
    fullName: z.string().min(1).optional(),
    phone: z.string().optional(),
    roleId: z.string().uuid().optional(),
    status: z.enum(['active', 'suspended', 'invited']).optional(),
  })
  .strict();
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

// ---- Roles ----
export const SetRolePermissionsSchema = z.object({
  permissionIds: z.array(z.string().uuid()),
});

// ---- Common ----
export const PaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export type PaginationInput = z.infer<typeof PaginationSchema>;

// ---- GST helpers (reused by invoice schemas in later phases) ----
export const GstinSchema = z
  .string()
  .regex(GSTIN_REGEX, 'Invalid GSTIN format');

export const GstRateSchema = z
  .number()
  .refine((r) => (GST_RATES as readonly number[]).includes(r), {
    message: `GST rate must be one of ${GST_RATES.join(', ')}`,
  });

export const StateCodeSchema = z
  .string()
  .regex(/^[0-9]{2}$/, 'State code must be a 2-digit GST state code');

// ---- Clients ----
export const BillingAddressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  pincode: z.string().regex(/^[0-9]{6}$/, 'PIN code must be 6 digits'),
});
export type BillingAddress = z.infer<typeof BillingAddressSchema>;

export const CreateClientSchema = z.object({
  legalName: z.string().min(1),
  displayName: z.string().min(1),
  gstin: GstinSchema.optional(),
  stateCode: StateCodeSchema,
  billingAddress: BillingAddressSchema,
  email: z.string().email().optional(),
  phone: z.string().optional(),
  ownerUserId: z.string().uuid().optional(),
  status: z.enum(CLIENT_STATUS).default('prospect'),
});
export type CreateClientInput = z.infer<typeof CreateClientSchema>;

export const UpdateClientSchema = CreateClientSchema.partial().strict();
export type UpdateClientInput = z.infer<typeof UpdateClientSchema>;

export const ClientListQuerySchema = PaginationSchema.extend({
  status: z.enum(CLIENT_STATUS).optional(),
  search: z.string().trim().min(1).optional(),
});
export type ClientListQuery = z.infer<typeof ClientListQuerySchema>;

// ---- Client contacts ----
export const CreateContactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  isPrimary: z.boolean().default(false),
});
export type CreateContactInput = z.infer<typeof CreateContactSchema>;

export const UpdateContactSchema = CreateContactSchema.partial().strict();
export type UpdateContactInput = z.infer<typeof UpdateContactSchema>;

// ---- Money (shared by projects, invoices, expenses, deals) ----
/** Non-negative rupee amount with at most 2 decimal places. Stored as NUMERIC(14,2). */
export const MoneySchema = z
  .number()
  .nonnegative()
  .refine((n) => Number.isFinite(n) && Math.round(n * 100) === n * 100, {
    message: 'Amount may have at most 2 decimal places',
  });

const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

// ---- Projects ----
export const CreateProjectSchema = z.object({
  clientId: z.string().uuid(),
  name: z.string().min(1),
  code: z.string().min(1).optional(),
  status: z.enum(PROJECT_STATUS).default('planned'),
  startDate: IsoDateSchema.optional(),
  endDate: IsoDateSchema.optional(),
  budgetInr: MoneySchema.optional(),
  managerId: z.string().uuid(),
});
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

export const UpdateProjectSchema = CreateProjectSchema.partial().omit({ clientId: true }).strict();
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;

export const ProjectListQuerySchema = PaginationSchema.extend({
  status: z.enum(PROJECT_STATUS).optional(),
  clientId: z.string().uuid().optional(),
  search: z.string().trim().min(1).optional(),
});
export type ProjectListQuery = z.infer<typeof ProjectListQuerySchema>;

export const SetProjectMembersSchema = z.object({
  userIds: z.array(z.string().uuid()),
});

// ---- Milestones ----
export const CreateMilestoneSchema = z.object({
  name: z.string().min(1),
  dueDate: IsoDateSchema.optional(),
  status: z.enum(MILESTONE_STATUS).default('open'),
  orderIndex: z.number().int().min(0).default(0),
});
export type CreateMilestoneInput = z.infer<typeof CreateMilestoneSchema>;

export const UpdateMilestoneSchema = CreateMilestoneSchema.partial().strict();
export type UpdateMilestoneInput = z.infer<typeof UpdateMilestoneSchema>;

// ---- Tasks ----
export const CreateTaskSchema = z.object({
  projectId: z.string().uuid(),
  milestoneId: z.string().uuid().optional(),
  parentTaskId: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  assigneeId: z.string().uuid().optional(),
  status: z.enum(TASK_STATUS).default('todo'),
  priority: z.enum(PRIORITY).default('medium'),
  dueDate: IsoDateSchema.optional(),
  estimateMinutes: z.number().int().min(0).optional(),
});
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

export const UpdateTaskSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    milestoneId: z.string().uuid().nullable().optional(),
    assigneeId: z.string().uuid().nullable().optional(),
    status: z.enum(TASK_STATUS).optional(),
    priority: z.enum(PRIORITY).optional(),
    dueDate: IsoDateSchema.nullable().optional(),
    estimateMinutes: z.number().int().min(0).nullable().optional(),
  })
  .strict();
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

export const TaskListQuerySchema = PaginationSchema.extend({
  projectId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  status: z.enum(TASK_STATUS).optional(),
  search: z.string().trim().min(1).optional(),
});
export type TaskListQuery = z.infer<typeof TaskListQuerySchema>;

export const TaskDependencySchema = z.object({
  dependsOnTaskId: z.string().uuid(),
});

/**
 * Allowed task status transitions (§ task status guard). Empty target list = terminal-ish.
 * Moving INTO `done` additionally requires all dependencies to be `done` (checked server-side).
 */
export const TASK_TRANSITIONS: Record<string, readonly string[]> = {
  todo: ['in_progress', 'blocked'],
  in_progress: ['blocked', 'review', 'done', 'todo'],
  blocked: ['todo', 'in_progress'],
  review: ['in_progress', 'done'],
  done: ['in_progress'],
};
