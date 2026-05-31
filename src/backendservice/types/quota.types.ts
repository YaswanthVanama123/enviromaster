

export type SalesRole = 'field_sales' | 'inside_sales' | 'account_manager' | 'sales_manager';

export interface SalesPersonQuota {
  monthlyTarget: number;
  effectiveDate: string;
  periodType: 'monthly' | 'quarterly' | 'annual';
}

export interface SalesPerson {
  _id: string;
  employeeId: string;
  name: string;
  email: string;
  phone?: string;
  department: string;
  role: SalesRole;
  isActive: boolean;
  quota: SalesPersonQuota;
  managerId?: string;
  territory?: string;
  hireDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSalesPersonInput {
  employeeId: string;
  name: string;
  email: string;
  phone?: string;
  role?: SalesRole;
  quota?: Partial<SalesPersonQuota>;
  territory?: string;
  hireDate?: string;
  managerId?: string;
}

export interface UpdateSalesPersonInput {
  name?: string;
  email?: string;
  phone?: string;
  role?: SalesRole;
  salesRole?: SalesRole;  
  territory?: string;
  isActive?: boolean;
  managerId?: string;
}

export interface UpdateQuotaInput {
  monthlyTarget: number;
  periodType?: 'monthly' | 'quarterly' | 'annual';
  effectiveDate?: string;
}

export type AgreementStatus = 'draft' | 'pending_approval' | 'approved' | 'active' | 'completed' | 'cancelled';

export interface CustomerInfo {
  name: string;
  id?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export interface InsideSalesInfo {
  involved: boolean;
  personId?: string;
  personName?: string;
}

export interface DistanceToAnchor {
  miles?: number;
  drivingTimeMinutes?: number;
  nearestAnchorId?: string;
  nearestAnchorName?: string;
}

export interface CommissionSnapshot {
  quotaLevelAtTime: 'below' | 'above' | 'double';
  effectiveBaseRate: number;
  finalCommissionRate: number;
  weeklyCommission: number;
  annualCommission: number;
  totalCommission: number;
  breakdown: {
    baseRate: number;
    agreementMultiplier: number;
    accountTypeAdjustment: number;
    greenlineBonus: number;
    renewalBonus: number;
    insideSalesDeduction: number;
  };
}

export interface Agreement {
  _id: string;
  agreementNumber: string;
  customer: CustomerInfo;
  salesPerson: {
    id: string;
    name: string;
  };
  insideSales: InsideSalesInfo;
  agreementTerm: '3-year' | '1-year' | 'MTM-with-install' | 'MTM-no-install';
  termMonths: number;
  monthlyValue: number;
  totalContractValue: number;
  perVisitRevenue?: number;
  accountType: 'Anchor' | 'Bread5' | 'Bread15' | 'Pit';
  pricingLine: 'Redline' | 'Greenline';
  businessType: 'new' | 'renewal';
  yearsAsCustomer: number;
  distanceToAnchor?: DistanceToAnchor;
  commission: CommissionSnapshot;
  startDate: string;
  endDate?: string;
  signedDate: string;
  status: AgreementStatus;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgreementInput {
  salesPersonId: string;
  customer: CustomerInfo;
  insideSales?: InsideSalesInfo;
  agreementTerm: '3-year' | '1-year' | 'MTM-with-install' | 'MTM-no-install';
  termMonths: number;
  monthlyValue: number;
  perVisitRevenue?: number;
  accountType: 'Anchor' | 'Bread5' | 'Bread15' | 'Pit';
  pricingLine?: 'Redline' | 'Greenline';
  businessType?: 'new' | 'renewal';
  yearsAsCustomer?: number;
  distanceToAnchor?: DistanceToAnchor;
  startDate: string;
  endDate?: string;
  signedDate?: string;
  notes?: string;
}

export interface QuotaPeriod {
  _id: string;
  salesPersonId: string;
  salesPersonName: string;
  periodType: 'monthly' | 'quarterly' | 'annual';
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  quotaTarget: number;
  actualSales: number;
  agreementCount: number;
  newBusinessCount: number;
  renewalCount: number;
  quotaLevel: 'below' | 'above' | 'double';
  quotaPercentage: number;
  totalCommissionEarned: number;
  status: 'in_progress' | 'closed' | 'finalized';
  createdAt: string;
  updatedAt: string;
}

export interface QuotaStatusResponse {
  salesPerson: {
    id: string;
    name: string;
    role: SalesRole;
  };
  period: {
    type: 'monthly' | 'quarterly' | 'annual';
    label: string;
    start: string;
    end: string;
  };
  quota: {
    target: number;
    actual: number;
    percentage: number;
    level: 'below' | 'above' | 'double';
    commissionRate: number;
  };
  progress: {
    toReachQuota: number;
    toReachDouble: number;
    agreementCount: number;
    newBusinessCount: number;
    renewalCount: number;
  };
  commission: {
    earned: number;
  };
  recentAgreements: Agreement[];
}

export interface QuotaLevelResponse {
  salesPersonId: string;
  salesPersonName: string;
  quotaLevel: 'below' | 'above' | 'double';
  quotaPercentage: number;
  quotaTarget: number;
  actualSales: number;
}

export interface LeaderboardEntry {
  rank: number;
  salesPersonId: string;
  salesPersonName: string;
  actualSales: number;
  quotaTarget: number;
  quotaPercentage: number;
  quotaLevel: 'below' | 'above' | 'double';
  agreementCount: number;
  totalCommission: number;
}

export interface LeaderboardResponse {
  period: string;
  periodStart: string;
  periodEnd: string;
  leaderboard: LeaderboardEntry[];
}

export function getQuotaLevelColor(level: 'below' | 'above' | 'double'): string {
  switch (level) {
    case 'double':
      return '#16a34a'; 
    case 'above':
      return '#2563eb'; 
    case 'below':
      return '#dc2626'; 
    default:
      return '#6b7280'; 
  }
}

export function getQuotaLevelBgColor(level: 'below' | 'above' | 'double'): string {
  switch (level) {
    case 'double':
      return '#dcfce7';
    case 'above':
      return '#dbeafe';
    case 'below':
      return '#fee2e2';
    default:
      return '#f3f4f6';
  }
}

export function getQuotaCommissionRate(level: 'below' | 'above' | 'double'): number {
  switch (level) {
    case 'double':
      return 9;
    case 'above':
      return 6;
    case 'below':
      return 3;
    default:
      return 3;
  }
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function getAgreementTermLabel(term: string): string {
  switch (term) {
    case '3-year':
      return '3-Year Agreement';
    case '1-year':
      return '1-Year Agreement';
    case 'MTM-with-install':
      return 'MTM with Install';
    case 'MTM-no-install':
      return 'MTM No Install';
    default:
      return term;
  }
}

export function getAgreementStatusColor(status: AgreementStatus): string {
  switch (status) {
    case 'active':
      return '#16a34a';
    case 'approved':
      return '#2563eb';
    case 'pending_approval':
      return '#f59e0b';
    case 'draft':
      return '#6b7280';
    case 'completed':
      return '#8b5cf6';
    case 'cancelled':
      return '#dc2626';
    default:
      return '#6b7280';
  }
}

export function getSalesRoleLabel(role: SalesRole): string {
  switch (role) {
    case 'field_sales':
      return 'Field Sales';
    case 'inside_sales':
      return 'Inside Sales';
    case 'account_manager':
      return 'Account Manager';
    case 'sales_manager':
      return 'Sales Manager';
    default:
      return role;
  }
}
