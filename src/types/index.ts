export type UserRole =
  | 'super_admin' | 'admin' | 'manager' | 'sales' | 'marketing'
  | 'hr' | 'finance' | 'operations' | 'developer' | 'client';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatar?: string;
  phone?: string;
  role: UserRole;
  organizationId: string;
  permissions: string[];
  lastLoginAt?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string;
}

export interface LeadCategory {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  leadCount: number;
  pipelineStages: string[];
  customFields: Array<{
    key: string;
    label: string;
    type: string;
    required: boolean;
    options?: string[];
  }>;
}

export interface Lead {
  _id: string;
  categoryId: LeadCategory | string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  status: string;
  source?: string;
  tags: string[];
  score: number;
  assignedTo?: { _id: string; firstName: string; lastName: string; avatar?: string };
  inCallingQueue?: boolean;
  queuedAt?: string;
  estimatedValue?: number;
  notes?: string;
  lastContactedAt?: string;
  nextFollowUpAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assignedTo?: { _id: string; firstName: string; lastName: string; avatar?: string };
  dueDate?: string;
  createdAt: string;
}

export interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface DashboardStats {
  kpis: {
    revenue: number;
    monthlyRevenue: number;
    totalClients: number;
    activeClients: number;
    totalLeads: number;
    activeLeads: number;
    activeProjects: number;
    pendingTasks: number;
    completedTasks: number;
    monthlyGrowth: number;
    cashFlow: number;
    clientSatisfaction: number;
    revenueForecast: number;
  };
  salesPipeline: Array<{ stage: string; count: number }>;
  topServices: Array<{ name: string; count: number; color?: string }>;
  topSalesEmployees: Array<{ name: string; leadCount: number; wonCount: number; avatar?: string }>;
  recentActivities: Array<{
    _id: string;
    type: string;
    title: string;
    createdAt: string;
    createdBy?: { firstName: string; lastName: string };
    leadId?: { firstName: string; lastName: string; company?: string };
  }>;
  charts: {
    revenue: Array<{ month: string; revenue: number; expenses: number; profit: number }>;
    leads: Array<{ month: string; leads: number; won: number }>;
  };
}

export interface PipelineData {
  category: LeadCategory;
  pipeline: Array<{
    stage: string;
    leads: Lead[];
    count: number;
  }>;
}

export interface LeadImportJob {
  _id: string;
  fileName?: string;
  source: string;
  status: string;
  fieldMapping: Record<string, string>;
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  duplicateCount: number;
  mergedCount: number;
  errorCount: number;
  importErrors: Array<{ row: number; message: string }>;
  preview: Record<string, unknown>[];
  duplicateStrategy: string;
  createdAt: string;
}

export interface CallLog {
  _id: string;
  leadId: Lead | string;
  outcome: string;
  duration: number;
  notes?: string;
  scriptUsed?: string;
  createdAt: string;
  callerId?: { firstName: string; lastName: string };
}

export interface CallDailyStats {
  totalCalls: number;
  connected: number;
  totalDuration: number;
  avgDuration: number;
  outcomeBreakdown: Array<{ _id: string; count: number }>;
  calls: CallLog[];
}

export interface FollowUp {
  _id: string;
  leadId: Lead | string;
  type: string;
  status: string;
  title: string;
  description?: string;
  scheduledAt: string;
  assignedTo?: { firstName: string; lastName: string; avatar?: string };
}

export interface Proposal {
  _id: string;
  leadId: Lead | string;
  title: string;
  description?: string;
  items: Array<{ description: string; quantity: number; rate: number; amount: number }>;
  subtotal: number;
  taxAmount: number;
  total: number;
  status: string;
  validUntil?: string;
  createdAt: string;
}

export interface SavedView {
  _id: string;
  name: string;
  categoryId?: string;
  filters: Record<string, unknown>;
  columns: string[];
  isDefault: boolean;
  isShared: boolean;
}

export interface Project {
  _id: string;
  name: string;
  description?: string;
  status: string;
  priority: string;
  progress: number;
  budget?: number;
  spent?: number;
  startDate?: string;
  endDate?: string;
  assignedTeam?: Array<{ _id: string; firstName: string; lastName: string; avatar?: string }>;
  createdAt: string;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  items: Array<{ description: string; quantity: number; rate: number; amount: number; taxRate?: number }>;
  subtotal: number;
  taxAmount: number;
  total: number;
  currency: string;
  status: string;
  dueDate?: string;
  paidAt?: string;
  createdAt: string;
}

export interface Expense {
  _id: string;
  referenceNumber: string;
  title: string;
  amount: number;
  category: string;
  vendor?: string;
  paymentMethod?: string;
  status: 'paid' | 'pending';
  spentAt: string;
  notes?: string;
  projectId?: string | { _id: string; name: string };
  createdAt: string;
}

export interface ProjectFinanceSummary {
  projectId: string;
  projectName: string;
  budget: number;
  budgetReceived: number;
  budgetPending: number;
  totalRevenue: number;
  totalSpent: number;
  netProfit: number;
  progress: number;
  status: string;
}

export interface BudgetPayment {
  _id: string;
  projectId: string;
  label: string;
  amount: number;
  status: 'received' | 'pending';
  receivedAt?: string;
  dueDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RevenueEntry {
  _id: string;
  projectId: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  recordedAt: string;
  createdAt: string;
}

export interface FinanceOverview {
  totals: {
    budget: number;
    budgetReceived: number;
    budgetPending: number;
    totalRevenue: number;
    totalSpent: number;
    netProfit: number;
  };
  projects: ProjectFinanceSummary[];
}

export interface ProjectFinanceDetail {
  summary: ProjectFinanceSummary;
  budgetPayments: BudgetPayment[];
  revenueEntries: RevenueEntry[];
  expenses: Expense[];
}

export interface OrgUser {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  phone?: string;
  role: UserRole;
  department?: string;
  lastLoginAt?: string;
  createdAt: string;
}

export interface AdminStats {
  totalOrganizations: number;
  activeOrganizations: number;
  totalUsers: number;
  activeUsers: number;
  platformAdmins: number;
  totalSessions: number;
  totalTimeSeconds: number;
  pendingAccessRequests?: number;
  planBreakdown?: Record<string, number>;
}

export interface AccessRequest {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  phone?: string;
  teamSize?: string;
  message?: string;
  status: 'pending' | 'contacted' | 'approved' | 'rejected';
  adminNotes?: string;
  reviewedBy?: { firstName: string; lastName: string; email: string };
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOrganization {
  _id: string;
  name: string;
  slug: string;
  industry?: string;
  website?: string;
  isActive: boolean;
  subscriptionPlan: 'starter' | 'professional' | 'enterprise';
  maxUsers: number;
  planExpiresAt?: string;
  userCount: number;
  totalTimeSeconds: number;
  adminUser?: { email: string; firstName: string; lastName: string; lastLoginAt?: string };
  createdAt: string;
}

export interface PlatformSettings {
  allowPublicRegistration: boolean;
  inviteOnlyMode: boolean;
  plans: Record<string, { label: string; maxUsers: number; monthlyPrice: number }>;
}

export interface RegistrationInvite {
  _id: string;
  token: string;
  email?: string;
  organizationName?: string;
  plan: string;
  expiresAt: string;
  createdAt: string;
  createdBy?: { firstName: string; lastName: string; email: string };
}

export interface UserActivitySummary {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationName?: string;
  organizationId: string;
  totalSeconds: number;
  sessions: number;
  lastActiveAt: string;
}
