

import { describe, test, expect } from 'vitest';
import {
  detectAccountTypeClient,
  estimateDrivingTime,
  DEFAULT_THRESHOLDS,
  type AccountType,
  type AccountTypeDetectionResult,
} from '../backendservice/types/accountType.types';

describe('Account Type Detection - Revenue Based (Anchor)', () => {
  test('Standard revenue >= $200 should be Anchor', () => {
    const result = detectAccountTypeClient(200, null, false);
    expect(result.accountType).toBe('Anchor');
    expect(result.confidence).toBe('high');
  });

  test('High revenue $250 should be Anchor', () => {
    const result = detectAccountTypeClient(250, null, false);
    expect(result.accountType).toBe('Anchor');
    expect(result.confidence).toBe('high');
  });

  test('Revenue $500 should be Anchor regardless of distance', () => {
    const result = detectAccountTypeClient(500, 50, false);
    expect(result.accountType).toBe('Anchor');
    expect(result.confidence).toBe('high');
  });

  test('Greenline revenue >= $100 should be Anchor', () => {
    const result = detectAccountTypeClient(100, null, true);
    expect(result.accountType).toBe('Anchor');
    expect(result.confidence).toBe('high');
  });

  test('Greenline revenue $150 should be Anchor', () => {
    const result = detectAccountTypeClient(150, 30, true);
    expect(result.accountType).toBe('Anchor');
    expect(result.confidence).toBe('high');
  });

  test('Greenline revenue $99 should NOT be Anchor', () => {
    const result = detectAccountTypeClient(99, 3, true);
    expect(result.accountType).not.toBe('Anchor');
  });

  test('Standard revenue $199 should NOT be Anchor', () => {
    const result = detectAccountTypeClient(199, 3, false);
    expect(result.accountType).not.toBe('Anchor');
  });
});

describe('Account Type Detection - Distance Based', () => {
  const LOW_REVENUE = 80; 

  describe('Bread5 (< 5 minutes)', () => {
    test('1 minute from Anchor should be Bread5', () => {
      const distance = 0.5; 
      const result = detectAccountTypeClient(LOW_REVENUE, distance, false);
      expect(result.accountType).toBe('Bread5');
      expect(result.confidence).toBe('high');
    });

    test('2 miles (4 min) from Anchor should be Bread5', () => {
      const result = detectAccountTypeClient(LOW_REVENUE, 2, false);
      expect(result.accountType).toBe('Bread5');
      expect(result.confidence).toBe('high');
    });

    test('2.4 miles (4.8 min) should be Bread5', () => {
      const result = detectAccountTypeClient(LOW_REVENUE, 2.4, false);
      expect(result.accountType).toBe('Bread5');
      expect(result.confidence).toBe('high');
    });
  });

  describe('Bread15 (5-15 minutes)', () => {
    test('2.5 miles (5 min exactly) should be Bread15', () => {
      const result = detectAccountTypeClient(LOW_REVENUE, 2.5, false);
      expect(result.accountType).toBe('Bread15');
      expect(result.confidence).toBe('high');
    });

    test('5 miles (10 min) should be Bread15', () => {
      const result = detectAccountTypeClient(LOW_REVENUE, 5, false);
      expect(result.accountType).toBe('Bread15');
      expect(result.confidence).toBe('high');
    });

    test('7.5 miles (15 min exactly) should be Bread15', () => {
      const result = detectAccountTypeClient(LOW_REVENUE, 7.5, false);
      expect(result.accountType).toBe('Bread15');
      expect(result.confidence).toBe('high');
    });
  });

  describe('Pit (> 15 minutes)', () => {
    test('8 miles (16 min) should be Pit', () => {
      const result = detectAccountTypeClient(LOW_REVENUE, 8, false);
      expect(result.accountType).toBe('Pit');
      expect(result.confidence).toBe('high');
    });

    test('15 miles (30 min) should be Pit', () => {
      const result = detectAccountTypeClient(LOW_REVENUE, 15, false);
      expect(result.accountType).toBe('Pit');
      expect(result.confidence).toBe('high');
    });

    test('50 miles should be Pit', () => {
      const result = detectAccountTypeClient(LOW_REVENUE, 50, false);
      expect(result.accountType).toBe('Pit');
      expect(result.confidence).toBe('high');
    });
  });
});

describe('Account Type Detection - No Distance Data', () => {
  test('null distance with low revenue should default to Pit (low confidence)', () => {
    const result = detectAccountTypeClient(80, null, false);
    expect(result.accountType).toBe('Pit');
    expect(result.confidence).toBe('low');
    expect(result.reason).toContain('No distance data');
  });

  test('undefined distance with low revenue should default to Pit', () => {
    const result = detectAccountTypeClient(80, undefined as any, false);
    expect(result.accountType).toBe('Pit');
    expect(result.confidence).toBe('low');
  });

  test('null distance with HIGH revenue should still be Anchor', () => {
    const result = detectAccountTypeClient(250, null, false);
    expect(result.accountType).toBe('Anchor');
    expect(result.confidence).toBe('high');
  });
});

describe('Driving Time Estimation', () => {
  test('2.5 miles at default speed should be 5 minutes', () => {
    const time = estimateDrivingTime(2.5);
    expect(time).toBe(5);
  });

  test('7.5 miles at default speed should be 15 minutes', () => {
    const time = estimateDrivingTime(7.5);
    expect(time).toBe(15);
  });

  test('10 miles at 0.5 mi/min should be 20 minutes', () => {
    const time = estimateDrivingTime(10, 0.5);
    expect(time).toBe(20);
  });

  test('10 miles at 1 mi/min should be 10 minutes', () => {
    const time = estimateDrivingTime(10, 1);
    expect(time).toBe(10);
  });

  test('0 miles should be 0 minutes', () => {
    const time = estimateDrivingTime(0);
    expect(time).toBe(0);
  });
});

describe('Account Type Detection - Edge Cases', () => {
  test('Exactly $200 revenue should be Anchor', () => {
    const result = detectAccountTypeClient(200, 25, false);
    expect(result.accountType).toBe('Anchor');
  });

  test('$199.99 revenue should fall to distance-based', () => {
    const result = detectAccountTypeClient(199.99, 3, false);
    expect(result.accountType).not.toBe('Anchor');
    expect(result.accountType).toBe('Bread5');
  });

  test('Exactly $100 Greenline revenue should be Anchor', () => {
    const result = detectAccountTypeClient(100, 25, true);
    expect(result.accountType).toBe('Anchor');
  });

  test('$99.99 Greenline revenue should fall to distance-based', () => {
    const result = detectAccountTypeClient(99.99, 3, true);
    expect(result.accountType).toBe('Bread5');
  });

  test('Distance boundary: 4.99 min should be Bread5', () => {
    const distance = 4.99 * 0.5; 
    const result = detectAccountTypeClient(80, distance, false);
    expect(result.accountType).toBe('Bread5');
  });

  test('Distance boundary: 5.01 min should be Bread15', () => {
    const distance = 5.01 * 0.5; 
    const result = detectAccountTypeClient(80, distance, false);
    expect(result.accountType).toBe('Bread15');
  });

  test('Distance boundary: 15.01 min should be Pit', () => {
    const distance = 15.01 * 0.5; 
    const result = detectAccountTypeClient(80, distance, false);
    expect(result.accountType).toBe('Pit');
  });

  test('Zero revenue should fall to distance-based', () => {
    const result = detectAccountTypeClient(0, 3, false);
    expect(result.accountType).toBe('Bread5');
  });

  test('Zero distance (same location) should be Bread5', () => {
    const result = detectAccountTypeClient(80, 0, false);
    expect(result.accountType).toBe('Bread5');
  });
});

describe('Account Type Detection - Result Structure', () => {
  test('Result should include all required fields', () => {
    const result = detectAccountTypeClient(250, 5, false);

    expect(result).toHaveProperty('accountType');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('reason');
    expect(result).toHaveProperty('drivingTimeMinutes');
    expect(result).toHaveProperty('distanceMiles');
  });

  test('Anchor result should not include driving time/distance', () => {
    const result = detectAccountTypeClient(250, 5, false);
    expect(result.accountType).toBe('Anchor');
    expect(result.drivingTimeMinutes).toBeNull();
    expect(result.distanceMiles).toBeNull();
  });

  test('Bread5 result should include driving time and distance', () => {
    const result = detectAccountTypeClient(80, 2, false);
    expect(result.accountType).toBe('Bread5');
    expect(result.drivingTimeMinutes).toBe(4); 
    expect(result.distanceMiles).toBe(2);
  });

  test('Reason should be descriptive', () => {
    const anchorResult = detectAccountTypeClient(250, null, false);
    expect(anchorResult.reason).toContain('Revenue');
    expect(anchorResult.reason).toContain('$250');

    const bread5Result = detectAccountTypeClient(80, 2, false);
    expect(bread5Result.reason).toContain('minutes');
    expect(bread5Result.reason).toContain('Anchor');
  });
});

describe('Account Type Detection - Real World Scenarios', () => {
  test('High-value restaurant ($300/visit) should be Anchor', () => {
    const result = detectAccountTypeClient(300, 20, false);
    expect(result.accountType).toBe('Anchor');
    expect(result.reason).toContain('$300');
  });

  test('Small cafe ($75/visit) 2 blocks away should be Bread5', () => {
    const result = detectAccountTypeClient(75, 0.5, false); 
    expect(result.accountType).toBe('Bread5');
    expect(result.drivingTimeMinutes).toBe(1);
  });

  test('Medium diner ($120/visit) 10 min away should be Bread15', () => {
    const result = detectAccountTypeClient(120, 5, false); 
    expect(result.accountType).toBe('Bread15');
  });

  test('Rural location ($50/visit) 45 min away should be Pit', () => {
    const result = detectAccountTypeClient(50, 22.5, false); 
    expect(result.accountType).toBe('Pit');
    expect(result.confidence).toBe('high');
  });

  test('Premium Greenline customer ($125/visit) should be Anchor', () => {
    const result = detectAccountTypeClient(125, 30, true);
    expect(result.accountType).toBe('Anchor');
    expect(result.reason).toContain('Greenline');
  });

  test('New location with no distance data should be Pit (low confidence)', () => {
    const result = detectAccountTypeClient(90, null, false);
    expect(result.accountType).toBe('Pit');
    expect(result.confidence).toBe('low');
    expect(result.reason).toContain('No distance data');
  });
});

describe('Account Type Detection - Custom Thresholds', () => {
  const customThresholds = {
    anchorMinRevenue: 300,
    anchorMinRevenueGreenline: 150,
    bread5MaxMinutes: 10,
    bread15MaxMinutes: 30,
    milesPerMinute: 0.4, 
  };

  test('Custom threshold: $250 should NOT be Anchor with $300 threshold', () => {
    const result = detectAccountTypeClient(250, 3, false, customThresholds);
    expect(result.accountType).not.toBe('Anchor');
    expect(result.accountType).toBe('Bread5');
  });

  test('Custom threshold: $300 should be Anchor', () => {
    const result = detectAccountTypeClient(300, 50, false, customThresholds);
    expect(result.accountType).toBe('Anchor');
  });

  test('Custom Greenline threshold: $150 should be Anchor', () => {
    const result = detectAccountTypeClient(150, 50, true, customThresholds);
    expect(result.accountType).toBe('Anchor');
  });

  test('Custom Bread5 threshold (10 min): 4 miles should be Bread5', () => {
    
    const result = detectAccountTypeClient(100, 3.9, false, customThresholds);
    expect(result.accountType).toBe('Bread5');
  });

  test('Custom Bread15 threshold (30 min): 8 miles should be Bread15', () => {
    
    const result = detectAccountTypeClient(100, 8, false, customThresholds);
    expect(result.accountType).toBe('Bread15');
  });
});

describe('Account Type to Commission Deduction Mapping', () => {
  const ACCOUNT_TYPE_DEDUCTIONS: Record<AccountType, number> = {
    Anchor: 0,
    Bread5: 50,
    Bread15: 75,
    Pit: 100,
  };

  test('Anchor should have $0 deduction', () => {
    const result = detectAccountTypeClient(250, null, false);
    expect(ACCOUNT_TYPE_DEDUCTIONS[result.accountType]).toBe(0);
  });

  test('Bread5 should have $50 deduction', () => {
    const result = detectAccountTypeClient(80, 2, false);
    expect(ACCOUNT_TYPE_DEDUCTIONS[result.accountType]).toBe(50);
  });

  test('Bread15 should have $75 deduction', () => {
    const result = detectAccountTypeClient(80, 5, false);
    expect(ACCOUNT_TYPE_DEDUCTIONS[result.accountType]).toBe(75);
  });

  test('Pit should have $100 deduction', () => {
    const result = detectAccountTypeClient(80, 15, false);
    expect(ACCOUNT_TYPE_DEDUCTIONS[result.accountType]).toBe(100);
  });
});
