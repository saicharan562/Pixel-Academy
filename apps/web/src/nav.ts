import {
  LayoutDashboard, Building2, Handshake, FolderKanban, ListChecks, Timer, Clock, Plane, ReceiptText, LifeBuoy, Users, Palette,
  type LucideIcon,
} from 'lucide-react';
import { PERMISSIONS, type PermissionKey } from '@pixel/shared';

/**
 * Sidebar / command navigation registry. Each module exposes a lucide icon, a label,
 * a short "command-deck" description and the capability that gates it. The shell renders
 * only the items whose `permission` the current user holds.
 */
export interface NavItem {
  label: string;
  code: string; // short uppercase command tag, e.g. "OVR"
  desc: string;
  path: string;
  permission: PermissionKey | null;
  Icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', code: 'OVR', desc: 'Mission control & live metrics', path: '/', permission: null, Icon: LayoutDashboard },
  { label: 'Clients', code: 'CLT', desc: 'Accounts, contacts & GST profiles', path: '/clients', permission: PERMISSIONS.CLIENT_VIEW, Icon: Building2 },
  { label: 'Pipeline', code: 'DEL', desc: 'Sales deals & opportunities', path: '/deals', permission: PERMISSIONS.DEAL_VIEW, Icon: Handshake },
  { label: 'Projects', code: 'PRJ', desc: 'Engagements, milestones & budgets', path: '/projects', permission: PERMISSIONS.PROJECT_VIEW, Icon: FolderKanban },
  { label: 'Tasks', code: 'TSK', desc: 'Workstreams, deps & status flow', path: '/tasks', permission: PERMISSIONS.TASK_VIEW, Icon: ListChecks },
  { label: 'Time tracking', code: 'TIM', desc: 'Log hours, submit & approve', path: '/timesheets', permission: PERMISSIONS.TIMESHEET_VIEW, Icon: Timer },
  { label: 'Attendance', code: 'ATT', desc: 'Clock-ins & work-hour ledger', path: '/attendance', permission: PERMISSIONS.ATTENDANCE_VIEW, Icon: Clock },
  { label: 'Leaves', code: 'LVE', desc: 'Requests, approvals & balances', path: '/leaves', permission: PERMISSIONS.LEAVE_VIEW, Icon: Plane },
  { label: 'Invoices', code: 'INV', desc: 'GST billing & payment ledger', path: '/invoices', permission: PERMISSIONS.INVOICE_VIEW, Icon: ReceiptText },
  { label: 'Tickets', code: 'TKT', desc: 'Support requests & SLA tracking', path: '/tickets', permission: PERMISSIONS.TICKET_VIEW, Icon: LifeBuoy },
  { label: 'Users', code: 'USR', desc: 'Roles, access & identities', path: '/users', permission: PERMISSIONS.USER_VIEW, Icon: Users },
  { label: 'Design system', code: 'SYS', desc: 'Component & token showcase', path: '/style', permission: null, Icon: Palette },
];
