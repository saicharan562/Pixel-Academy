import { z } from 'zod';
import {
  GSTIN_REGEX, GST_RATES, CLIENT_STATUS, PROJECT_STATUS, MILESTONE_STATUS, TASK_STATUS, PRIORITY,
  ATTENDANCE_SOURCE, ATTENDANCE_STATUS, LEAVE_STATUS, TIMESHEET_STATUS, DEAL_STAGE,
  INVOICE_STATUS, PAYMENT_METHOD, EXPENSE_STATUS, CONTRACT_STATUS, TICKET_STATUS,
  TICKET_EVENT_TYPE, KB_STATUS, KB_AUDIENCE, RECURRENCE_FREQ,
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

// ---- Shared primitives for the Phase 1–3 modules ----
/** Strictly positive rupee amount (≤2dp). Used for line prices and payments. */
export const PositiveMoneySchema = MoneySchema.refine((n) => n > 0, {
  message: 'Amount must be greater than 0',
});
/** ISO-8601 datetime string (with offset/Z), e.g. payment timestamp, check-in. */
export const IsoDateTimeSchema = z.string().datetime({ offset: true });

// ---- Recurrence (embedded by recurring tasks/invoices) ----
export const RecurrenceRuleSchema = z
  .object({
    freq: z.enum(RECURRENCE_FREQ),
    interval: z.number().int().min(1).max(365).default(1),
    byWeekday: z.array(z.number().int().min(0).max(6)).default([]),
    dayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
    endsOn: IsoDateSchema.nullable().optional(),
  })
  .refine((r) => (r.freq === 'weekly' ? r.byWeekday.length > 0 : true), {
    message: 'Weekly recurrence requires at least one weekday',
    path: ['byWeekday'],
  })
  .refine((r) => (r.freq === 'monthly' ? r.dayOfMonth != null : true), {
    message: 'Monthly recurrence requires dayOfMonth',
    path: ['dayOfMonth'],
  });
export type RecurrenceRuleInput = z.infer<typeof RecurrenceRuleSchema>;

// ───────────────────────── Attendance ─────────────────────────
export const AttendanceCheckInSchema = z.object({
  source: z.enum(ATTENDANCE_SOURCE).default('web'),
});
export const AttendanceCheckOutSchema = z.object({}).strict();

/** Manual upsert (Manager/Admin): set/override a day's attendance for a user. */
export const UpsertAttendanceSchema = z.object({
  userId: z.string().uuid(),
  workDate: IsoDateSchema,
  checkInAt: IsoDateTimeSchema.nullable().optional(),
  checkOutAt: IsoDateTimeSchema.nullable().optional(),
  status: z.enum(ATTENDANCE_STATUS).nullable().optional(),
  source: z.enum(ATTENDANCE_SOURCE).default('manual'),
});
export type UpsertAttendanceInput = z.infer<typeof UpsertAttendanceSchema>;

export const AttendanceListQuerySchema = PaginationSchema.extend({
  userId: z.string().uuid().optional(),
  status: z.enum(ATTENDANCE_STATUS).optional(),
  from: IsoDateSchema.optional(),
  to: IsoDateSchema.optional(),
});
export type AttendanceListQuery = z.infer<typeof AttendanceListQuerySchema>;

// ───────────────────────── Leave ─────────────────────────
export const CreateLeaveTypeSchema = z.object({
  name: z.string().min(1),
  annualQuota: z.number().min(0).max(366).multipleOf(0.5),
  isPaid: z.boolean(),
});
export type CreateLeaveTypeInput = z.infer<typeof CreateLeaveTypeSchema>;
export const UpdateLeaveTypeSchema = CreateLeaveTypeSchema.partial().strict();
export type UpdateLeaveTypeInput = z.infer<typeof UpdateLeaveTypeSchema>;

export const CreateLeaveRequestSchema = z
  .object({
    leaveTypeId: z.string().uuid(),
    startDate: IsoDateSchema,
    endDate: IsoDateSchema,
    reason: z.string().trim().min(1).max(500).optional(),
  })
  .refine((r) => r.endDate >= r.startDate, {
    message: 'endDate must be on or after startDate',
    path: ['endDate'],
  });
export type CreateLeaveRequestInput = z.infer<typeof CreateLeaveRequestSchema>;

/** Approver decision. Cancellation is a separate self-action (no body). */
export const DecideLeaveRequestSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  note: z.string().trim().max(500).optional(),
});
export type DecideLeaveRequestInput = z.infer<typeof DecideLeaveRequestSchema>;

export const LeaveListQuerySchema = PaginationSchema.extend({
  userId: z.string().uuid().optional(),
  status: z.enum(LEAVE_STATUS).optional(),
  from: IsoDateSchema.optional(),
  to: IsoDateSchema.optional(),
});
export type LeaveListQuery = z.infer<typeof LeaveListQuerySchema>;

// ───────────────────────── Timesheets ─────────────────────────
export const CreateTimesheetSchema = z
  .object({
    taskId: z.string().uuid().optional(),
    projectId: z.string().uuid().optional(),
    workDate: IsoDateSchema,
    minutes: z.number().int().min(1).max(24 * 60),
    note: z.string().trim().max(500).optional(),
  })
  .refine((t) => t.taskId || t.projectId, {
    message: 'A timesheet entry must reference a task or a project',
    path: ['projectId'],
  });
export type CreateTimesheetInput = z.infer<typeof CreateTimesheetSchema>;

export const UpdateTimesheetSchema = z
  .object({
    taskId: z.string().uuid().nullable().optional(),
    projectId: z.string().uuid().nullable().optional(),
    workDate: IsoDateSchema.optional(),
    minutes: z.number().int().min(1).max(24 * 60).optional(),
    note: z.string().trim().max(500).nullable().optional(),
  })
  .strict();
export type UpdateTimesheetInput = z.infer<typeof UpdateTimesheetSchema>;

/** Approver decision on a submitted timesheet. */
export const DecideTimesheetSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
});
export type DecideTimesheetInput = z.infer<typeof DecideTimesheetSchema>;

export const TimesheetListQuerySchema = PaginationSchema.extend({
  userId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  status: z.enum(TIMESHEET_STATUS).optional(),
  from: IsoDateSchema.optional(),
  to: IsoDateSchema.optional(),
});
export type TimesheetListQuery = z.infer<typeof TimesheetListQuerySchema>;

/** Timesheet status transitions (mirrors the task-guard pattern). */
export const TIMESHEET_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ['submitted'],
  submitted: ['approved', 'rejected', 'draft'],
  approved: [],
  rejected: ['draft'],
};

// ───────────────────────── CRM / Deals ─────────────────────────
export const CreateDealSchema = z.object({
  clientId: z.string().uuid().optional(),
  title: z.string().min(1),
  stage: z.enum(DEAL_STAGE).default('lead'),
  valueInr: MoneySchema.optional(),
  probability: z.number().int().min(0).max(100).optional(),
  ownerUserId: z.string().uuid(),
  expectedClose: IsoDateSchema.optional(),
  lostReason: z.string().trim().max(500).optional(),
});
export type CreateDealInput = z.infer<typeof CreateDealSchema>;
export const UpdateDealSchema = CreateDealSchema.partial().strict();
export type UpdateDealInput = z.infer<typeof UpdateDealSchema>;
export const DealListQuerySchema = PaginationSchema.extend({
  stage: z.enum(DEAL_STAGE).optional(),
  ownerUserId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  search: z.string().trim().min(1).optional(),
});
export type DealListQuery = z.infer<typeof DealListQuerySchema>;

// ───────────────────────── Invoices (GST) ─────────────────────────
/**
 * Line-item INPUT. `taxableValueInr` and the CGST/SGST/IGST split are NEVER taken from
 * the client — the server computes them in integer paise (round-half-up). The supplyType
 * is derived from supplier state vs place of supply, also server-side.
 */
export const InvoiceLineItemInputSchema = z.object({
  description: z.string().min(1).max(300),
  hsnSac: z.string().regex(/^[0-9]{4,8}$/, 'HSN/SAC must be 4–8 digits'),
  quantity: z.number().positive().refine((n) => Math.round(n * 100) === n * 100, {
    message: 'Quantity may have at most 2 decimal places',
  }),
  unitPriceInr: PositiveMoneySchema,
  gstRate: GstRateSchema,
  discountInr: MoneySchema.default(0),
});
export type InvoiceLineItemInput = z.infer<typeof InvoiceLineItemInputSchema>;

export const CreateInvoiceSchema = z
  .object({
    clientId: z.string().uuid(),
    projectId: z.string().uuid().optional(),
    issueDate: IsoDateSchema,
    dueDate: IsoDateSchema,
    placeOfSupply: StateCodeSchema,
    notes: z.string().trim().max(1000).optional(),
    lineItems: z.array(InvoiceLineItemInputSchema).min(1, 'At least one line item is required'),
  })
  .refine((i) => i.dueDate >= i.issueDate, {
    message: 'dueDate must be on or after issueDate',
    path: ['dueDate'],
  });
export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;

/** Edits are only legal while the invoice is in `draft` (enforced server-side). */
export const UpdateInvoiceSchema = z
  .object({
    projectId: z.string().uuid().nullable().optional(),
    issueDate: IsoDateSchema.optional(),
    dueDate: IsoDateSchema.optional(),
    placeOfSupply: StateCodeSchema.optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
    lineItems: z.array(InvoiceLineItemInputSchema).min(1).optional(),
  })
  .strict();
export type UpdateInvoiceInput = z.infer<typeof UpdateInvoiceSchema>;

export const RecordPaymentSchema = z.object({
  amountInr: PositiveMoneySchema,
  paidAt: IsoDateTimeSchema,
  method: z.enum(PAYMENT_METHOD),
  reference: z.string().trim().max(140).optional(),
});
export type RecordPaymentInput = z.infer<typeof RecordPaymentSchema>;

export const InvoiceListQuerySchema = PaginationSchema.extend({
  clientId: z.string().uuid().optional(),
  status: z.enum(INVOICE_STATUS).optional(),
  from: IsoDateSchema.optional(),
  to: IsoDateSchema.optional(),
  search: z.string().trim().min(1).optional(),
});
export type InvoiceListQuery = z.infer<typeof InvoiceListQuerySchema>;

/** GSTR-1-style export window (financial-period close). */
export const GstReportQuerySchema = z.object({
  from: IsoDateSchema,
  to: IsoDateSchema,
  format: z.enum(['json', 'csv']).default('json'),
});
export type GstReportQuery = z.infer<typeof GstReportQuerySchema>;

/**
 * Invoice status transitions. Payment-driven moves (issued→partially_paid→paid) are applied
 * by the payment service; `overdue` is set by the scheduler; `cancelled` voids a non-paid invoice.
 */
export const INVOICE_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ['issued', 'cancelled'],
  issued: ['partially_paid', 'paid', 'overdue', 'cancelled'],
  partially_paid: ['paid', 'overdue', 'cancelled'],
  overdue: ['partially_paid', 'paid', 'cancelled'],
  paid: [],
  cancelled: [],
};

// ───────────────────────── Expenses ─────────────────────────
export const CreateExpenseSchema = z.object({
  projectId: z.string().uuid().optional(),
  category: z.string().min(1).max(80),
  amountInr: PositiveMoneySchema,
  spentOn: IsoDateSchema,
  receiptDocId: z.string().uuid().optional(),
});
export type CreateExpenseInput = z.infer<typeof CreateExpenseSchema>;
export const UpdateExpenseSchema = CreateExpenseSchema.partial().strict();
export type UpdateExpenseInput = z.infer<typeof UpdateExpenseSchema>;
export const DecideExpenseSchema = z.object({
  decision: z.enum(['approved', 'rejected', 'reimbursed']),
});
export type DecideExpenseInput = z.infer<typeof DecideExpenseSchema>;
export const ExpenseListQuerySchema = PaginationSchema.extend({
  userId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  status: z.enum(EXPENSE_STATUS).optional(),
  category: z.string().trim().min(1).optional(),
});
export type ExpenseListQuery = z.infer<typeof ExpenseListQuerySchema>;
export const EXPENSE_TRANSITIONS: Record<string, readonly string[]> = {
  submitted: ['approved', 'rejected'],
  approved: ['reimbursed'],
  rejected: [],
  reimbursed: [],
};

// ───────────────────────── Contracts ─────────────────────────
export const CreateContractSchema = z
  .object({
    clientId: z.string().uuid(),
    projectId: z.string().uuid().optional(),
    title: z.string().min(1).max(200),
    documentId: z.string().uuid().optional(),
    valueInr: MoneySchema.optional(),
    startDate: IsoDateSchema,
    endDate: IsoDateSchema,
    status: z.enum(CONTRACT_STATUS).default('draft'),
    autoRenew: z.boolean().default(false),
  })
  .refine((c) => c.endDate >= c.startDate, {
    message: 'endDate must be on or after startDate',
    path: ['endDate'],
  });
export type CreateContractInput = z.infer<typeof CreateContractSchema>;
export const UpdateContractSchema = z
  .object({
    projectId: z.string().uuid().nullable().optional(),
    title: z.string().min(1).max(200).optional(),
    documentId: z.string().uuid().nullable().optional(),
    valueInr: MoneySchema.nullable().optional(),
    startDate: IsoDateSchema.optional(),
    endDate: IsoDateSchema.optional(),
    status: z.enum(CONTRACT_STATUS).optional(),
    autoRenew: z.boolean().optional(),
  })
  .strict();
export type UpdateContractInput = z.infer<typeof UpdateContractSchema>;
export const ContractListQuerySchema = PaginationSchema.extend({
  clientId: z.string().uuid().optional(),
  status: z.enum(CONTRACT_STATUS).optional(),
  expiringInDays: z.coerce.number().int().min(1).max(365).optional(),
});
export type ContractListQuery = z.infer<typeof ContractListQuerySchema>;

// ───────────────────────── SLA & Tickets ─────────────────────────
export const CreateSlaPolicySchema = z.object({
  name: z.string().min(1).max(120),
  priority: z.enum(PRIORITY),
  firstResponseMins: z.number().int().min(1).max(60 * 24 * 30),
  resolutionMins: z.number().int().min(1).max(60 * 24 * 90),
});
export type CreateSlaPolicyInput = z.infer<typeof CreateSlaPolicySchema>;
export const UpdateSlaPolicySchema = CreateSlaPolicySchema.partial().strict();
export type UpdateSlaPolicyInput = z.infer<typeof UpdateSlaPolicySchema>;

export const CreateTicketSchema = z.object({
  clientId: z.string().uuid(),
  subject: z.string().min(1).max(200),
  priority: z.enum(PRIORITY).default('medium'),
  assigneeId: z.string().uuid().optional(),
  slaPolicyId: z.string().uuid().optional(),
  description: z.string().trim().max(2000).optional(),
});
export type CreateTicketInput = z.infer<typeof CreateTicketSchema>;
export const UpdateTicketSchema = z
  .object({
    subject: z.string().min(1).max(200).optional(),
    priority: z.enum(PRIORITY).optional(),
    assigneeId: z.string().uuid().nullable().optional(),
    slaPolicyId: z.string().uuid().nullable().optional(),
  })
  .strict();
export type UpdateTicketInput = z.infer<typeof UpdateTicketSchema>;
export const TicketTransitionSchema = z.object({
  status: z.enum(TICKET_STATUS),
});
export type TicketTransitionInput = z.infer<typeof TicketTransitionSchema>;
export const CreateTicketCommentSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});
export type CreateTicketCommentInput = z.infer<typeof CreateTicketCommentSchema>;
export const TicketEventTypeSchema = z.enum(TICKET_EVENT_TYPE);
export const TicketListQuerySchema = PaginationSchema.extend({
  clientId: z.string().uuid().optional(),
  status: z.enum(TICKET_STATUS).optional(),
  assigneeId: z.string().uuid().optional(),
  priority: z.enum(PRIORITY).optional(),
  search: z.string().trim().min(1).optional(),
});
export type TicketListQuery = z.infer<typeof TicketListQuerySchema>;
/** Ticket lifecycle. `escalated` is reachable from any open state (set by SLA job or human). */
export const TICKET_TRANSITIONS: Record<string, readonly string[]> = {
  open: ['in_progress', 'waiting_client', 'resolved', 'escalated'],
  in_progress: ['waiting_client', 'resolved', 'escalated'],
  waiting_client: ['in_progress', 'resolved', 'escalated'],
  escalated: ['in_progress', 'waiting_client', 'resolved'],
  resolved: ['closed', 'in_progress'],
  closed: [],
};

// ───────────────────────── Knowledge Base ─────────────────────────
export const CreateKbDocumentSchema = z.object({
  documentId: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  bodyMd: z.string().max(100_000).optional(),
  category: z.string().trim().max(80).optional(),
  status: z.enum(KB_STATUS).default('draft'),
  audience: z.enum(KB_AUDIENCE).default('internal'),
});
export type CreateKbDocumentInput = z.infer<typeof CreateKbDocumentSchema>;
export const UpdateKbDocumentSchema = CreateKbDocumentSchema.partial().strict();
export type UpdateKbDocumentInput = z.infer<typeof UpdateKbDocumentSchema>;
export const KbListQuerySchema = PaginationSchema.extend({
  status: z.enum(KB_STATUS).optional(),
  audience: z.enum(KB_AUDIENCE).optional(),
  category: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).optional(),
});
export type KbListQuery = z.infer<typeof KbListQuerySchema>;

// ───────────────────────── AI Assistant ─────────────────────────
export const AiQuerySchema = z.object({
  query: z.string().trim().min(1).max(2000),
  topK: z.number().int().min(1).max(10).default(5),
});
export type AiQueryInput = z.infer<typeof AiQuerySchema>;

// ───────────────────────── Notifications ─────────────────────────
export const NotificationListQuerySchema = PaginationSchema.extend({
  unreadOnly: z.coerce.boolean().optional(),
});
export type NotificationListQuery = z.infer<typeof NotificationListQuerySchema>;

// ───────────────────────── Reports / Exports ─────────────────────────
export const ReportQuerySchema = z.object({
  from: IsoDateSchema,
  to: IsoDateSchema,
  clientId: z.string().uuid().optional(),
  format: z.enum(['json', 'csv']).default('json'),
});
export type ReportQuery = z.infer<typeof ReportQuerySchema>;
