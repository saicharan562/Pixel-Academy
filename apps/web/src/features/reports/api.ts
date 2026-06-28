import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';

export interface OrgDashboard {
  scope: 'org';
  activeProjects: number;
  openTickets: number;
  pendingLeaves: number;
  overdueInvoices: number;
  outstandingReceivablesInr: string;
  activeClients: number;
  delayedProjects: number;
  revenueThisMonthInr: string;
  mrrInr: string;
  teamUtilizationPct: number;
}

export interface SelfDashboard {
  scope: 'self';
  myOpenTasks: number;
  myOpenTickets: number;
  myPendingLeaves: number;
}

export type Dashboard = OrgDashboard | SelfDashboard;

export function isOrgDashboard(d: Dashboard | undefined): d is OrgDashboard {
  return d?.scope === 'org';
}

export function useDashboard() {
  return useQuery({
    queryKey: ['reports', 'dashboard'],
    queryFn: () => api.get<Dashboard>('/reports/dashboard'),
  });
}
