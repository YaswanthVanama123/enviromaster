/**
 * Account Type Detection Types
 * Types for auto-detecting account types based on revenue and distance
 */

// Account type constants
export type AccountType = 'Anchor' | 'Bread5' | 'Bread15' | 'Pit';

// Detection confidence level
export type DetectionConfidence = 'high' | 'medium' | 'low';

// Thresholds used for detection
export interface AccountTypeThresholds {
  anchorMinRevenue: number;          // $200 standard
  anchorMinRevenueGreenline: number; // $100 for Greenline
  bread5MaxMinutes: number;          // 5 minutes
  bread15MaxMinutes: number;         // 15 minutes
  milesPerMinute: number;            // 0.5 (30mph)
}

// Input for account type detection
export interface AccountTypeDetectionInput {
  perVisitRevenue: number;
  distanceToAnchorMiles?: number | null;
  isGreenline?: boolean;
  customerId?: string;
  customerName?: string;
}

// Result of account type detection
export interface AccountTypeDetectionResult {
  accountType: AccountType;
  confidence: DetectionConfidence;
  reason: string;
  drivingTimeMinutes: number | null;
  distanceMiles: number | null;
}

// Full detection response
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

// Batch detection input
export interface BatchDetectionInput {
  locations: AccountTypeDetectionInput[];
}

// Batch detection result item
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

// Batch detection response
export interface BatchDetectionResponse {
  success: boolean;
  total: number;
  results: BatchDetectionResultItem[];
  thresholds: AccountTypeThresholds;
}

// Account type info for display
export interface AccountTypeInfo {
  type: AccountType;
  description: string;
  criteria: string;
  deduction: number;
}

// Thresholds response
export interface ThresholdsResponse {
  success: boolean;
  thresholds: AccountTypeThresholds;
  accountTypes: AccountTypeInfo[];
}

// Customer with revenue data for detection
export interface CustomerRevenueData {
  customerId: string;
  customerName: string;
  perVisitRevenue: number;
  isGreenline: boolean;
  // Distance data from RouteSTAR
  distanceToNearestAnchor?: number;
  nearestAnchorName?: string;
  // Detected account type
  detectedAccountType?: AccountType;
  detectionConfidence?: DetectionConfidence;
  detectionReason?: string;
}

// Default thresholds (should match backend)
export const DEFAULT_THRESHOLDS: AccountTypeThresholds = {
  anchorMinRevenue: 200,
  anchorMinRevenueGreenline: 100,
  bread5MaxMinutes: 5,
  bread15MaxMinutes: 15,
  milesPerMinute: 0.5,
};

// Account type display options
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

/**
 * Helper function to estimate driving time from distance
 */
export function estimateDrivingTime(distanceMiles: number, milesPerMinute = 0.5): number {
  return distanceMiles / milesPerMinute;
}

/**
 * Helper function to estimate distance from driving time
 */
export function estimateDistance(drivingMinutes: number, milesPerMinute = 0.5): number {
  return drivingMinutes * milesPerMinute;
}

/**
 * Client-side account type detection (for immediate feedback)
 * Should match backend logic
 */
export function detectAccountTypeClient(
  perVisitRevenue: number,
  distanceToAnchorMiles: number | null,
  isGreenline = false,
  thresholds = DEFAULT_THRESHOLDS
): AccountTypeDetectionResult {
  const anchorThreshold = isGreenline
    ? thresholds.anchorMinRevenueGreenline
    : thresholds.anchorMinRevenue;

  // Check if this location qualifies as Anchor
  if (perVisitRevenue >= anchorThreshold) {
    return {
      accountType: 'Anchor',
      confidence: 'high',
      reason: `Revenue $${perVisitRevenue} meets ${isGreenline ? 'Greenline' : 'standard'} Anchor threshold of $${anchorThreshold}`,
      drivingTimeMinutes: null,
      distanceMiles: null,
    };
  }

  // For non-Anchor locations, use distance to nearest Anchor
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

/**
 * Get color for account type display
 */
export function getAccountTypeColor(type: AccountType): string {
  switch (type) {
    case 'Anchor':
      return '#16a34a'; // green
    case 'Bread5':
      return '#2563eb'; // blue
    case 'Bread15':
      return '#f59e0b'; // amber
    case 'Pit':
      return '#6b7280'; // gray
    default:
      return '#6b7280';
  }
}

/**
 * Get background color for account type badge
 */
export function getAccountTypeBgColor(type: AccountType): string {
  switch (type) {
    case 'Anchor':
      return '#dcfce7'; // light green
    case 'Bread5':
      return '#dbeafe'; // light blue
    case 'Bread15':
      return '#fef3c7'; // light amber
    case 'Pit':
      return '#f3f4f6'; // light gray
    default:
      return '#f3f4f6';
  }
}
