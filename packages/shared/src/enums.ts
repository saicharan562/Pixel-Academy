/**
 * Enums — mirror the Postgres CHECK constraints in §2.3 exactly.
 * Single source of truth; backend Zod + frontend both import these.
 */

export const ROLE = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  STAFF: 'Staff',
  CLIENT: 'Client',
} as const;
export type Role = (typeof ROLE)[keyof typeof ROLE];
export const ROLES = Object.values(ROLE) as Role[];

export const USER_STATUS = ['active', 'suspended', 'invited'] as const;
export type UserStatus = (typeof USER_STATUS)[number];

export const ATTENDANCE_STATUS = ['present', 'half_day', 'absent', 'holiday', 'leave'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUS)[number];

export const ATTENDANCE_SOURCE = ['web', 'mobile', 'manual'] as const;
export type AttendanceSource = (typeof ATTENDANCE_SOURCE)[number];

export const LEAVE_STATUS = ['pending', 'approved', 'rejected', 'cancelled'] as const;
export type LeaveStatus = (typeof LEAVE_STATUS)[number];

export const TIMESHEET_STATUS = ['draft', 'submitted', 'approved', 'rejected'] as const;
export type TimesheetStatus = (typeof TIMESHEET_STATUS)[number];

export const CLIENT_STATUS = ['active', 'inactive', 'prospect'] as const;
export type ClientStatus = (typeof CLIENT_STATUS)[number];

export const DEAL_STAGE = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] as const;
export type DealStage = (typeof DEAL_STAGE)[number];

export const PROJECT_STATUS = ['planned', 'active', 'on_hold', 'completed', 'cancelled'] as const;
export type ProjectStatus = (typeof PROJECT_STATUS)[number];

export const MILESTONE_STATUS = ['open', 'in_progress', 'done'] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUS)[number];

export const TASK_STATUS = ['todo', 'in_progress', 'blocked', 'review', 'done'] as const;
export type TaskStatus = (typeof TASK_STATUS)[number];

export const PRIORITY = ['low', 'medium', 'high', 'urgent'] as const;
export type Priority = (typeof PRIORITY)[number];

export const RECURRENCE_FREQ = ['daily', 'weekly', 'monthly'] as const;
export type RecurrenceFreq = (typeof RECURRENCE_FREQ)[number];

export const SUPPLY_TYPE = ['intra_state', 'inter_state'] as const;
export type SupplyType = (typeof SUPPLY_TYPE)[number];

export const INVOICE_STATUS = [
  'draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled',
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUS)[number];

export const PAYMENT_METHOD = ['upi', 'bank_transfer', 'card', 'cash', 'gateway'] as const;
export type PaymentMethod = (typeof PAYMENT_METHOD)[number];

export const EXPENSE_STATUS = ['submitted', 'approved', 'rejected', 'reimbursed'] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUS)[number];

export const CONTRACT_STATUS = ['draft', 'active', 'expiring', 'expired', 'terminated'] as const;
export type ContractStatus = (typeof CONTRACT_STATUS)[number];

export const TICKET_STATUS = [
  'open', 'in_progress', 'waiting_client', 'resolved', 'closed', 'escalated',
] as const;
export type TicketStatus = (typeof TICKET_STATUS)[number];

export const TICKET_EVENT_TYPE = [
  'comment', 'status_change', 'assignment', 'escalation', 'sla_breach',
] as const;
export type TicketEventType = (typeof TICKET_EVENT_TYPE)[number];

export const DOC_VISIBILITY = ['internal', 'client_shared', 'public'] as const;
export type DocVisibility = (typeof DOC_VISIBILITY)[number];

export const KB_STATUS = ['draft', 'published', 'archived'] as const;
export type KbStatus = (typeof KB_STATUS)[number];

export const KB_AUDIENCE = ['internal', 'client'] as const;
export type KbAudience = (typeof KB_AUDIENCE)[number];

export const NOTIFICATION_CHANNEL = ['in_app', 'email', 'whatsapp'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNEL)[number];

/** GST rate set — §3.5 global validation. */
export const GST_RATES = [0, 5, 12, 18, 28] as const;
export type GstRate = (typeof GST_RATES)[number];

/** GSTIN format regex — §2.3 clients.gstin CHECK. */
export const GSTIN_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
