/**
 * Permission catalogue + role→permission seed map.
 *
 * Derived directly from the Role × Module access matrix (§1.3).
 * Permission keys follow `<entity>.<action>` (e.g. invoice.create, leave.approve).
 *
 * Capability is enforced by middleware (layer 1). ROW SCOPE (self / team / own-client /
 * assigned) is NOT encodable as a flat permission — it is enforced by the in-handler
 * scope guard (layer 2). Where the matrix says e.g. "Staff: V C (self)", the capability
 * grant here is `attendance.view` + `attendance.create`, and the (self) restriction is
 * applied by the scope guard at request time.
 */

export const PERMISSIONS = {
  // Users & Profiles
  USER_VIEW: 'user.view',
  USER_CREATE: 'user.create',
  USER_EDIT: 'user.edit',
  USER_DELETE: 'user.delete',
  // Roles & Permissions
  ROLE_VIEW: 'role.view',
  ROLE_CREATE: 'role.create',
  ROLE_EDIT: 'role.edit',
  ROLE_DELETE: 'role.delete',
  // Attendance
  ATTENDANCE_VIEW: 'attendance.view',
  ATTENDANCE_CREATE: 'attendance.create',
  ATTENDANCE_EDIT: 'attendance.edit',
  ATTENDANCE_DELETE: 'attendance.delete',
  ATTENDANCE_APPROVE: 'attendance.approve',
  // Leaves
  LEAVE_VIEW: 'leave.view',
  LEAVE_CREATE: 'leave.create',
  LEAVE_EDIT: 'leave.edit',
  LEAVE_DELETE: 'leave.delete',
  LEAVE_APPROVE: 'leave.approve',
  // Timesheets
  TIMESHEET_VIEW: 'timesheet.view',
  TIMESHEET_CREATE: 'timesheet.create',
  TIMESHEET_EDIT: 'timesheet.edit',
  TIMESHEET_DELETE: 'timesheet.delete',
  TIMESHEET_APPROVE: 'timesheet.approve',
  // Clients
  CLIENT_VIEW: 'client.view',
  CLIENT_CREATE: 'client.create',
  CLIENT_EDIT: 'client.edit',
  CLIENT_DELETE: 'client.delete',
  // CRM
  DEAL_VIEW: 'deal.view',
  DEAL_CREATE: 'deal.create',
  DEAL_EDIT: 'deal.edit',
  DEAL_DELETE: 'deal.delete',
  // Projects
  PROJECT_VIEW: 'project.view',
  PROJECT_CREATE: 'project.create',
  PROJECT_EDIT: 'project.edit',
  PROJECT_DELETE: 'project.delete',
  // Milestones
  MILESTONE_VIEW: 'milestone.view',
  MILESTONE_CREATE: 'milestone.create',
  MILESTONE_EDIT: 'milestone.edit',
  MILESTONE_DELETE: 'milestone.delete',
  // Tasks
  TASK_VIEW: 'task.view',
  TASK_CREATE: 'task.create',
  TASK_EDIT: 'task.edit',
  TASK_DELETE: 'task.delete',
  TASK_APPROVE: 'task.approve',
  // Invoices
  INVOICE_VIEW: 'invoice.view',
  INVOICE_CREATE: 'invoice.create',
  INVOICE_EDIT: 'invoice.edit',
  INVOICE_DELETE: 'invoice.delete',
  INVOICE_PAY: 'invoice.pay',
  // Expenses
  EXPENSE_VIEW: 'expense.view',
  EXPENSE_CREATE: 'expense.create',
  EXPENSE_EDIT: 'expense.edit',
  EXPENSE_DELETE: 'expense.delete',
  EXPENSE_APPROVE: 'expense.approve',
  // Contracts
  CONTRACT_VIEW: 'contract.view',
  CONTRACT_CREATE: 'contract.create',
  CONTRACT_EDIT: 'contract.edit',
  CONTRACT_DELETE: 'contract.delete',
  // Tickets
  TICKET_VIEW: 'ticket.view',
  TICKET_CREATE: 'ticket.create',
  TICKET_EDIT: 'ticket.edit',
  TICKET_DELETE: 'ticket.delete',
  TICKET_APPROVE: 'ticket.approve',
  // Notifications
  NOTIFICATION_VIEW: 'notification.view',
  // Knowledge Base
  KB_VIEW: 'kb.view',
  KB_CREATE: 'kb.create',
  KB_EDIT: 'kb.edit',
  KB_DELETE: 'kb.delete',
  // AI Assistant
  AI_USE: 'ai.use',
  // Reports
  REPORT_VIEW: 'report.view',
  // Audit
  AUDIT_VIEW: 'audit.view',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
export const ALL_PERMISSION_KEYS = Object.values(PERMISSIONS) as PermissionKey[];

const P = PERMISSIONS;

/**
 * Role → capability grants. Scope qualifiers from §1.3 are applied separately by the
 * scope guard. A role having a capability here means "may attempt"; the guard narrows
 * to which rows.
 */
export const ROLE_PERMISSION_SEED: Record<string, PermissionKey[]> = {
  Admin: ALL_PERMISSION_KEYS, // Admin = full matrix across every module

  Manager: [
    P.USER_VIEW, P.USER_EDIT, // V(team), E(limited)
    P.ATTENDANCE_VIEW, P.ATTENDANCE_APPROVE, P.ATTENDANCE_EDIT,
    P.LEAVE_VIEW, P.LEAVE_APPROVE,
    P.TIMESHEET_VIEW, P.TIMESHEET_APPROVE,
    P.CLIENT_VIEW, P.CLIENT_CREATE, P.CLIENT_EDIT,
    P.DEAL_VIEW, P.DEAL_CREATE, P.DEAL_EDIT,
    P.PROJECT_VIEW, P.PROJECT_CREATE, P.PROJECT_EDIT,
    P.MILESTONE_VIEW, P.MILESTONE_CREATE, P.MILESTONE_EDIT,
    P.TASK_VIEW, P.TASK_CREATE, P.TASK_EDIT, P.TASK_APPROVE,
    P.INVOICE_VIEW, P.INVOICE_CREATE, P.INVOICE_EDIT, // no delete
    P.EXPENSE_VIEW, P.EXPENSE_CREATE, P.EXPENSE_EDIT, P.EXPENSE_APPROVE,
    P.CONTRACT_VIEW, P.CONTRACT_CREATE, P.CONTRACT_EDIT,
    P.TICKET_VIEW, P.TICKET_CREATE, P.TICKET_EDIT, P.TICKET_APPROVE,
    P.NOTIFICATION_VIEW,
    P.KB_VIEW, P.KB_CREATE, P.KB_EDIT,
    P.AI_USE,
    P.REPORT_VIEW,
    P.AUDIT_VIEW, // V(team actions) [ASSUMPTION]
  ],

  Staff: [
    P.USER_VIEW, P.USER_EDIT, // self only (scope guard)
    P.ATTENDANCE_VIEW, P.ATTENDANCE_CREATE,
    P.LEAVE_VIEW, P.LEAVE_CREATE,
    P.TIMESHEET_VIEW, P.TIMESHEET_CREATE, P.TIMESHEET_EDIT,
    P.CLIENT_VIEW, // assigned only
    P.DEAL_VIEW, // assigned only
    P.PROJECT_VIEW, // assigned only
    P.MILESTONE_VIEW,
    P.TASK_VIEW, P.TASK_CREATE, P.TASK_EDIT, // assigned only
    P.EXPENSE_VIEW, P.EXPENSE_CREATE,
    P.TICKET_VIEW, P.TICKET_CREATE, P.TICKET_EDIT, // assigned only
    P.NOTIFICATION_VIEW,
    P.KB_VIEW,
    P.AI_USE,
    P.REPORT_VIEW,
  ],

  Client: [
    P.USER_VIEW, P.USER_EDIT, // self only
    P.CLIENT_VIEW, P.CLIENT_EDIT, // self only; GST-sensitive fields are request-gated
    P.PROJECT_VIEW, // own, read
    P.MILESTONE_VIEW, // own, read
    P.TASK_VIEW, // own, read [ASSUMPTION]
    P.INVOICE_VIEW, P.INVOICE_PAY, // own
    P.CONTRACT_VIEW, // own, read
    P.TICKET_VIEW, P.TICKET_CREATE, // own
    P.NOTIFICATION_VIEW,
    P.KB_VIEW, // published-public subset only (audience filter)
    P.AI_USE,
    P.REPORT_VIEW, // own
  ],
};
