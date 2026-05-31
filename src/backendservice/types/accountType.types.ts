

export type AccountType = 'Anchor' | 'Bread5' | 'Bread15' | 'Pit';

export type DetectionConfidence = 'high' | 'medium' | 'low';

export interface AccountTypeThresholds {
  anchorMinRevenue: number;          
  anchorMinRevenueGreenline: number; 
  bread5MaxMinutes: number;          
  bread15MaxMinutes: number;         
  milesPerMinute: number;            
}

export interface AccountTypeDetectionInput {
  perVisitRevenue: number;
  distanceToAnchorMiles?: number | null;
  isGreenline?: boolean;
  customerId?: string;
  customerName?: string;
}

export interface AccountTypeDetectionResult {
  accountType: AccountType;
  confidence: DetectionConfidence;
  reason: string;
  drivingTimeMinutes: number | null;
  distanceMiles: number | null;
}

export interface AccountTypeDetectionResponse {
  success: boolean;
  input: {
    perVisitRevenue: number;
    distanceToAnchorMiles: number | null;
    isGreenline: boolean;
  };
  result: AccountTypeDetectionResult;
  thresholds: AccountTypeThresholds;
}

export interface BatchDetectionInput {
  locations: AccountTypeDetectionInput[];
}

export interface BatchDetectionResultItem {
  index: number;
  customerId?: string;
  customerName?: string;
  input?: {
    perVisitRevenue: number;
    distanceToAnchorMiles: number | null;
    isGreenline: boolean;
  };
  result?: AccountTypeDetectionResult;
  error?: string;
}

export interface BatchDetectionResponse {
  success: boolean;
  total: number;
  results: BatchDetectionResultItem[];
  thresholds: AccountTypeThresholds;
}

export interface AccountTypeInfo {
  type: AccountType;
  description: string;
  criteria: string;
  deduction: number;
}

export interface ThresholdsResponse {
  success: boolean;
  thresholds: AccountTypeThresholds;
  accountTypes: AccountTypeInfo[];
}

export interface CustomerRevenueData {
  customerId: string;
  customerName: string;
  perVisitRevenue: number;
  isGreenline: boolean;
  
  distanceToNearestAnchor?: number;
  nearestAnchorName?: string;
  
  detectedAccountType?: AccountType;
  detectionConfidence?: DetectionConfidence;
  detectionReason?: string;
}

export const DEFAULT_THRESHOLDS: AccountTypeThresholds = {
  anchorMinRevenue: 200,
  anchorMinRevenueGreenline: 100,
  bread5MaxMinutes: 5,
  bread15MaxMinutes: 15,
  milesPerMinute: 0.5,
};

export const ACCOUNT_TYPE_INFO: AccountTypeInfo[] = [
  {
    type: 'Anchor',
    description: 'High-revenue location',
    criteria: 'Revenue ≥ $200 (or ≥ $100 if Greenline)',
    deduction: 0,
  },
  {
    type: 'Bread5',
    description: 'Within 5 minutes of Anchor',
    criteria: 'Revenue < $200 AND < 5 min drive to nearest Anchor',
    deduction: 50,
  },
  {
    type: 'Bread15',
    description: 'Within 15 minutes of Anchor',
    criteria: 'Revenue < $200 AND 5-15 min drive to nearest Anchor',
    deduction: 75,
  },
  {
    type: 'Pit',
    description: 'New location, far from Anchor',
    criteria: 'Revenue < $200 AND > 15 min drive to nearest Anchor',
    deduction: 100,
  },
];

export function estimateDrivingTime(distanceMiles: number, milesPerMinute = 0.5): number {
  return distanceMiles / milesPerMinute;
}

export function estimateDistance(drivingMinutes: number, milesPerMinute = 0.5): number {
  return drivingMinutes * milesPerMinute;
}

export function detectAccountTypeClient(
  perVisitRevenue: number,
  distanceToAnchorMiles: number | null,
  isGreenline = false,
  thresholds = DEFAULT_THRESHOLDS
): AccountTypeDetectionResult {
  const anchorThreshold = isGreenline
    ? thresholds.anchorMinRevenueGreenline
    : thresholds.anchorMinRevenue;

  if (perVisitRevenue >= anchorThreshold) {
    return {
      accountType: 'Anchor',
      confidence: 'high',
      reason: `Revenue $${perVisitRevenue} meets ${isGreenline ? 'Greenline' : 'standard'} Anchor threshold of $${anchorThreshold}`,
      drivingTimeMinutes: null,
      distanceMiles: null,
    };
  }

  if (distanceToAnchorMiles === null || distanceToAnchorMiles === undefined) {
    return {
      accountType: 'Pit',
      confidence: 'low',
      reason: 'No distance data available - defaulting to Pit',
      drivingTimeMinutes: null,
      distanceMiles: null,
    };
  }

  const drivingTimeMinutes = estimateDrivingTime(distanceToAnchorMiles, thresholds.milesPerMinute);

  if (drivingTimeMinutes < thresholds.bread5MaxMinutes) {
    return {
      accountType: 'Bread5',
      confidence: 'high',
      reason: `Within ${drivingTimeMinutes.toFixed(1)} minutes of nearest Anchor (< ${thresholds.bread5MaxMinutes} min threshold)`,
      drivingTimeMinutes,
      distanceMiles: distanceToAnchorMiles,
    };
  }

  if (drivingTimeMinutes <= thresholds.bread15MaxMinutes) {
    return {
      accountType: 'Bread15',
      confidence: 'high',
      reason: `${drivingTimeMinutes.toFixed(1)} minutes from nearest Anchor (${thresholds.bread5MaxMinutes}-${thresholds.bread15MaxMinutes} min range)`,
      drivingTimeMinutes,
      distanceMiles: distanceToAnchorMiles,
    };
  }

  return {
    accountType: 'Pit',
    confidence: 'high',
    reason: `${drivingTimeMinutes.toFixed(1)} minutes from nearest Anchor (> ${thresholds.bread15MaxMinutes} min threshold)`,
    drivingTimeMinutes,
    distanceMiles: distanceToAnchorMiles,
  };
}

export function getAccountTypeColor(type: AccountType): string {
  switch (type) {
    case 'Anchor':
      return '#16a34a'; 
    case 'Bread5':
      return '#2563eb'; 
    case 'Bread15':
      return '#f59e0b'; 
    case 'Pit':
      return '#6b7280'; 
    default:
      return '#6b7280';
  }
}

export function getAccountTypeBgColor(type: AccountType): string {
  switch (type) {
    case 'Anchor':
      return '#dcfce7'; 
    case 'Bread5':
      return '#dbeafe'; 
    case 'Bread15':
      return '#fef3c7'; 
    case 'Pit':
      return '#f3f4f6'; 
    default:
      return '#f3f4f6';
  }
}
