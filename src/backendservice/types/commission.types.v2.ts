

export type AccountType = 'Anchor' | 'Bread5' | 'Bread15' | 'Pit';

export type PricingLine = 'Redline' | 'Greenline' | 'BelowRedline';

export type AgreementTerm = '3-year' | '1-year' | 'MTM-with-install' | 'MTM-no-install';

export type QuotaLevel = 'below' | 'above' | 'double';

export type BusinessType = 'new' | 'renewal';

export type ServiceFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'one-time';

export interface PricingTier {
  minRatio: number;        
  maxRatio: number;        
  quotaMultiplier: number; 
  label: string;           
  requiresApproval: boolean;
}

export const PRICING_TIERS: PricingTier[] = [
  { minRatio: 0, maxRatio: 0.99, quotaMultiplier: 0.5, label: 'Below Redline', requiresApproval: true },
  { minRatio: 1.00, maxRatio: 1.09, quotaMultiplier: 1.0, label: 'Redline', requiresApproval: false },
  { minRatio: 1.10, maxRatio: 1.19, quotaMultiplier: 1.25, label: '110% Premium', requiresApproval: false },
  { minRatio: 1.20, maxRatio: 1.29, quotaMultiplier: 1.5, label: '120% Premium', requiresApproval: false },
  { minRatio: 1.30, maxRatio: Infinity, quotaMultiplier: 2.0, label: 'Greenline (130%+)', requiresApproval: false },
];

export interface AccountTypeRevenueRule {
  type: AccountType;
  revenueDeduction: number;    
  anchorBonusThreshold: number; 
  anchorBonusMultiplier: number; 
  description: string;
}

export const ACCOUNT_TYPE_REVENUE_RULES: AccountTypeRevenueRule[] = [
  {
    type: 'Anchor',
    revenueDeduction: 0,
    anchorBonusThreshold: 200,
    anchorBonusMultiplier: 1.5,
    description: '$200+/visit. Revenue above $200 counts at 150%',
  },
  {
    type: 'Bread5',
    revenueDeduction: 50,
    anchorBonusThreshold: 0,
    anchorBonusMultiplier: 1.0,
    description: 'Within 5 min of Anchor. First $50 = no commission',
  },
  {
    type: 'Bread15',
    revenueDeduction: 75,
    anchorBonusThreshold: 0,
    anchorBonusMultiplier: 1.0,
    description: 'Within 15 min of Anchor. First $75 = no commission',
  },
  {
    type: 'Pit',
    revenueDeduction: 100,
    anchorBonusThreshold: 0,
    anchorBonusMultiplier: 1.0,
    description: 'Not near Anchor. First $100 = no commission',
  },
];

export interface QuotaThreshold {
  monthsEmployed: number;
  annualQuota: number;
  weeklyEquivalent: number;
  description: string;
}

export const QUOTA_THRESHOLDS: QuotaThreshold[] = [
  { monthsEmployed: 1, annualQuota: 0, weeklyEquivalent: 0, description: 'Month 1 - No quota' },
  { monthsEmployed: 2, annualQuota: 2500, weeklyEquivalent: 50, description: 'Month 2 - $2,500 annual' },
  { monthsEmployed: 3, annualQuota: 5000, weeklyEquivalent: 100, description: 'Month 3 - $5,000 annual' },
  { monthsEmployed: 4, annualQuota: 7500, weeklyEquivalent: 150, description: 'Month 4 - $7,500 annual' },
  { monthsEmployed: 5, annualQuota: 10000, weeklyEquivalent: 200, description: 'Month 5+ - $10,000 annual' },
];

export interface AutoQuotaRule {
  minMonths: number;
  maxMonths: number;
  requiredSales: number;
  minimumPerSale: number;
  description: string;
}

export const AUTO_QUOTA_RULES: AutoQuotaRule[] = [
  {
    minMonths: 1,
    maxMonths: 3,
    requiredSales: 2,
    minimumPerSale: 1000,
    description: 'Months 1-3: 2 new rooftop sales = auto quota',
  },
  {
    minMonths: 4,
    maxMonths: Infinity,
    requiredSales: 3,
    minimumPerSale: 1000,
    description: 'Month 4+: 3 new rooftop sales = auto quota',
  },
];

export const FREQUENCY_VISITS_PER_YEAR: Record<ServiceFrequency, number> = {
  'weekly': 50,      
  'biweekly': 25,    
  'monthly': 12,
  'quarterly': 4,
  'one-time': 1,
};

export interface CommissionRulesV2 {
  _id?: string;
  version: string;
  isActive: boolean;

  quotaRates: {
    below: number;      
    above: number;      
    double: number;     
  };

  agreementMultipliers: {
    '3-year': number;           
    '1-year': number;           
    'MTM-with-install': number; 
    'MTM-no-install': number;   
  };

  insideSalesDeduction: number; 

  renewalBonusRate: number;     
  renewalMinYears: number;      

  anchorMinPerVisit: number;    
  anchorMinGreenline: number;   

  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_COMMISSION_RULES_V2: Omit<CommissionRulesV2, '_id' | 'createdAt' | 'updatedAt'> = {
  version: '2.0.0',
  isActive: true,
  quotaRates: {
    below: 3,
    above: 6,
    double: 9,
  },
  agreementMultipliers: {
    '3-year': 135,
    '1-year': 100,
    'MTM-with-install': 100,
    'MTM-no-install': 50,
  },
  insideSalesDeduction: -3,
  renewalBonusRate: 4,
  renewalMinYears: 2,
  anchorMinPerVisit: 200,
  anchorMinGreenline: 100,
};

export interface CommissionCalculationInputV2 {
  
  perVisitRevenue: number;          
  redlinePrice: number;             
  frequency: ServiceFrequency;      

  accountType: AccountType;         
  isNearAnchor: boolean;            
  drivingTimeMinutes?: number;      
  nearestAnchorName?: string;       

  agreementTerm: AgreementTerm;
  contractMonths: number;

  businessType: BusinessType;
  yearsAsCustomer?: number;         
  totalRenewalValue?: number;       

  isInsideSales: boolean;
  salesPersonId?: string;
  salesPersonName?: string;

  employeeHireDate?: string;        
  employeeMonthsEmployed?: number;
  periodSalesTotal?: number;        
  newRooftopCount?: number;         

  customerName?: string;
  customerAddress?: string;

  notes?: string;
}

export interface CommissionBreakdownV2 {
  
  priceRatio: number;               
  pricingTier: string;              
  pricingMultiplier: number;        
  requiresApproval: boolean;

  originalRevenue: number;          
  revenueDeduction: number;         
  anchorBonus: number;              
  commissionableRevenue: number;    

  revenueWithPricingMultiplier: number; 
  visitsPerYear: number;
  annualQuotaCredit: number;        

  employeeQuotaThreshold: number;   
  totalPeriodSales: number;         
  autoQuotaQualified: boolean;      
  quotaLevel: QuotaLevel;           

  baseRate: number;                 
  insideSalesDeduction: number;     
  effectiveRate: number;            
  agreementMultiplier: number;      
  finalCommissionRate: number;      

  renewalBonusRate: number;         
  renewalBonusAmount: number;       
}

export interface CommissionCalculationResultV2 {
  input: CommissionCalculationInputV2;
  breakdown: CommissionBreakdownV2;

  perVisitCommission: number;       
  weeklyCommission: number;         
  annualCommission: number;         
  contractCommission: number;       
  renewalBonus: number;             
  totalCommission: number;          

  backCommissionEligible: boolean;
  backCommissionAmount: number;

  calculatedAt: string;
  rulesVersion: string;
}

export interface PitConversion {
  pitAgreementId: string;
  pitCustomerName: string;
  pitPerVisitRevenue: number;
  pitSaleDate: string;
  pitSalesPersonId: string;

  conversionAgreementId: string;
  conversionDate: string;
  newAccountType: AccountType;
  newPerVisitRevenue: number;

  backCommissionAmount: number;
  backCommissionPaid: boolean;
  backCommissionPaidDate?: string;
}

export interface RouteSTARCustomer {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude?: number;
  longitude?: number;
}

export interface RouteSTARAnchor {
  customerId: string;
  customerName: string;
  address: string;
  perVisitRevenue: number;
  isActive: boolean;
}

export interface DrivingTimeResult {
  fromCustomer: RouteSTARCustomer;
  toCustomer: RouteSTARCustomer;
  drivingTimeMinutes: number;
  distanceMiles: number;
  calculatedAt: string;
}

export interface AccountTypeDetectionResult {
  detectedAccountType: AccountType;
  nearestAnchor: RouteSTARAnchor | null;
  drivingTimeMinutes: number;
  distanceMiles: number;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

export const ACCOUNT_TYPE_OPTIONS_V2: { value: AccountType; label: string; description: string }[] = [
  { value: 'Anchor', label: 'Anchor', description: '$200+/visit. Revenue above $200 at 150% credit' },
  { value: 'Bread5', label: 'Bread5', description: 'Within 5 min of Anchor. First $50 deducted' },
  { value: 'Bread15', label: 'Bread15', description: 'Within 15 min of Anchor. First $75 deducted' },
  { value: 'Pit', label: 'Pit', description: 'Not near Anchor. First $100 = no commission' },
];

export const AGREEMENT_TERM_OPTIONS_V2: { value: AgreementTerm; label: string; multiplier: number }[] = [
  { value: '3-year', label: '3-Year Agreement', multiplier: 135 },
  { value: '1-year', label: '1-Year Agreement', multiplier: 100 },
  { value: 'MTM-with-install', label: 'MTM with Install (3x)', multiplier: 100 },
  { value: 'MTM-no-install', label: 'MTM No Install', multiplier: 50 },
];

export const PRICING_LINE_OPTIONS_V2: { value: PricingLine; label: string; multiplier: number; description: string }[] = [
  { value: 'BelowRedline', label: 'Below Redline', multiplier: 0.5, description: 'Below standard - requires approval' },
  { value: 'Redline', label: 'Redline', multiplier: 1.0, description: 'Standard pricing' },
  { value: 'Greenline', label: 'Greenline (130%+)', multiplier: 2.0, description: 'Premium pricing - 2x quota credit' },
];

export const QUOTA_LEVEL_OPTIONS_V2: { value: QuotaLevel; label: string; rate: number }[] = [
  { value: 'below', label: 'Below Quota', rate: 3 },
  { value: 'above', label: 'Above Quota', rate: 6 },
  { value: 'double', label: 'Double Quota', rate: 9 },
];

export const FREQUENCY_OPTIONS: { value: ServiceFrequency; label: string; visitsPerYear: number }[] = [
  { value: 'weekly', label: 'Weekly', visitsPerYear: 50 },
  { value: 'biweekly', label: 'Bi-Weekly', visitsPerYear: 25 },
  { value: 'monthly', label: 'Monthly', visitsPerYear: 12 },
  { value: 'quarterly', label: 'Quarterly', visitsPerYear: 4 },
  { value: 'one-time', label: 'One-Time', visitsPerYear: 1 },
];

export const BUSINESS_TYPE_OPTIONS_V2: { value: BusinessType; label: string }[] = [
  { value: 'new', label: 'New Business' },
  { value: 'renewal', label: 'Renewal' },
];

export type CommissionRules = CommissionRulesV2;

export const DEFAULT_COMMISSION_RULES = DEFAULT_COMMISSION_RULES_V2;

export type CommissionCalculationInput = CommissionCalculationInputV2;

export type CommissionBreakdown = CommissionBreakdownV2;

export type CommissionCalculationResult = CommissionCalculationResultV2;
