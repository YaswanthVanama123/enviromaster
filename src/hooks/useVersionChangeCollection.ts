import { useState, useCallback, useRef } from 'react';

interface FieldChange {
  productKey: string;
  productName: string;
  productType: 'product' | 'dispenser' | 'service';
  fieldType: string;
  fieldDisplayName: string;
  originalValue: number;
  newValue: number;
  changeAmount: number;
  changePercentage: number;
  quantity?: number;
  frequency?: string;
}

interface VersionChangesData {
  agreementId: string;
  versionId: string;
  versionNumber: number;
  salespersonId: string;
  salespersonName: string;
  changes: FieldChange[];
  saveAction: 'save_draft' | 'generate_pdf' | 'manual_save';
  documentTitle: string;
  sessionId: string;
}

interface LogVersionChangesResponse {
  success: boolean;
  message: string;
  log: {
    id: string;
    versionId: string;
    versionNumber: number;
    totalChanges: number;
    totalPriceImpact: number;
    hasSignificantChanges: boolean;
    reviewStatus: string;
    saveAction: string;
  };
}

interface UseVersionChangeCollectionReturn {
  addChange: (change: Omit<FieldChange, 'changeAmount' | 'changePercentage'>) => void;
  removeChange: (productKey: string, fieldType: string) => void;
  clearChanges: () => void;
  logVersionChanges: (data: Omit<VersionChangesData, 'changes'>) => Promise<LogVersionChangesResponse>;
  changes: FieldChange[];
  hasChanges: boolean;
  isLogging: boolean;
  error: string | null;
}

export const useVersionChangeCollection = (): UseVersionChangeCollectionReturn => {
  const [changes, setChanges] = useState<FieldChange[]>([]);
  const [isLogging, setIsLogging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef<string>(`session_${Date.now()}_${Math.random().toString(36).slice(2)}`);

  const addChange = useCallback((change: Omit<FieldChange, 'changeAmount' | 'changePercentage'>) => {
    const changeAmount = change.newValue - change.originalValue;
    const changePercentage = change.originalValue !== 0
      ? (changeAmount / change.originalValue) * 100
      : 0;

    const fullChange: FieldChange = {
      ...change,
      changeAmount,
      changePercentage
    };

    setChanges(prev => {
      const filtered = prev.filter(c =>
        !(c.productKey === change.productKey && c.fieldType === change.fieldType)
      );
      return [...filtered, fullChange];
    });

    console.log(`📝 [CHANGE-COLLECTION] Added change: ${change.productName} - ${change.fieldType}`, {
      from: change.originalValue,
      to: change.newValue,
      change: changeAmount,
      changePercent: changePercentage.toFixed(2) + '%'
    });
  }, []);

  const removeChange = useCallback((productKey: string, fieldType: string) => {
    setChanges(prev => prev.filter(c =>
      !(c.productKey === productKey && c.fieldType === fieldType)
    ));

    console.log(`🗑️ [CHANGE-COLLECTION] Removed change: ${productKey} - ${fieldType}`);
  }, []);

  const clearChanges = useCallback(() => {
    setChanges([]);
    console.log('🧹 [CHANGE-COLLECTION] Cleared all changes');
  }, []);

  const logVersionChanges = useCallback(async (data: Omit<VersionChangesData, 'changes'>): Promise<LogVersionChangesResponse> => {
    if (changes.length === 0) {
      console.log('ℹ️ [CHANGE-COLLECTION] No changes to log');
      return {
        success: true,
        message: 'No changes to log',
        log: {
          id: '',
          versionId: data.versionId,
          versionNumber: data.versionNumber,
          totalChanges: 0,
          totalPriceImpact: 0,
          hasSignificantChanges: false,
          reviewStatus: 'auto_approved',
          saveAction: data.saveAction
        }
      };
    }

    setIsLogging(true);
    setError(null);

    try {
      console.log(`📦 [CHANGE-COLLECTION] Batch logging ${changes.length} changes for version ${data.versionNumber} (${data.saveAction})`);

      const response = await fetch('/api/pdf/version-changes/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          changes,
          sessionId: sessionIdRef.current
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to log version changes: ${response.status} ${response.statusText}`);
      }

      const result: LogVersionChangesResponse = await response.json();

      console.log(`✅ [CHANGE-COLLECTION] Successfully logged version changes:`, {
        versionId: result.log.versionId,
        versionNumber: result.log.versionNumber,
        totalChanges: result.log.totalChanges,
        totalPriceImpact: result.log.totalPriceImpact,
        hasSignificantChanges: result.log.hasSignificantChanges,
        reviewStatus: result.log.reviewStatus
      });

      clearChanges();

      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('❌ [CHANGE-COLLECTION] Failed to log version changes:', errorMessage);
      setError(errorMessage);

      return {
        success: false,
        message: errorMessage,
        log: {
          id: '',
          versionId: data.versionId,
          versionNumber: data.versionNumber,
          totalChanges: 0,
          totalPriceImpact: 0,
          hasSignificantChanges: false,
          reviewStatus: 'pending',
          saveAction: data.saveAction
        }
      };
    } finally {
      setIsLogging(false);
    }
  }, [changes, clearChanges]);

  return {
    addChange,
    removeChange,
    clearChanges,
    logVersionChanges,
    changes,
    hasChanges: changes.length > 0,
    isLogging,
    error
  };
};

export const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
};

export const getFieldDisplayName = (fieldType: string): string => {
  const displayNames: Record<string, string> = {
    'unitPrice': 'Unit Price',
    'amount': 'Amount',
    'warrantyPrice': 'Warranty Price',
    'replacementPrice': 'Replacement Price',
    'total': 'Total',
    'hourlyRate': 'Hourly Rate',
    'minimumVisit': 'Minimum Visit',
    'customPerVisitTotal': 'Per Visit Total',
    'workers': 'Workers',
    'hours': 'Hours',
    'customAmount': 'Custom Amount',
    'insideSqFt': 'Inside Sq Ft',
    'outsideSqFt': 'Outside Sq Ft',
    'insideRate': 'Inside Rate',
    'outsideRate': 'Outside Rate',
    'sqFtFixedFee': 'Sq Ft Fixed Fee',
    'customStandardBathroomTotal': 'Standard Bathroom Total',
    'customHugeBathroomTotal': 'Huge Bathroom Total',
    'customExtraAreaTotal': 'Extra Area Total',
    'customStandaloneTotal': 'Standalone Total',
    'customChemicalTotal': 'Chemical Total',
    'customPerVisitPrice': 'Per Visit Price',
    'customMonthlyRecurring': 'Monthly Recurring',
    'customFirstMonthPrice': 'First Month Price',
    'customContractTotal': 'Contract Total'
  };

  return displayNames[fieldType] || fieldType;
};

export const getProductTypeFromFamily = (familyKey: string): 'product' | 'dispenser' | 'service' => {
  if (familyKey === 'dispensers') return 'dispenser';
  if (familyKey.includes('service') || familyKey.includes('Service')) return 'service';
  return 'product';
};

export const getFieldType = (fieldName: string): string => {
  switch (fieldName) {
    case 'unitPriceOverride':
      return 'unitPrice';
    case 'amountOverride':
      return 'amount';
    case 'warrantyPriceOverride':
      return 'warrantyPrice';
    case 'replacementPriceOverride':
      return 'replacementPrice';
    case 'totalOverride':
      return 'total';
    case 'hourlyRate':
      return 'hourlyRate';
    case 'minimumVisit':
      return 'minimumVisit';
    case 'customPerVisitTotal':
      return 'customPerVisitTotal';
    case 'workers':
      return 'workers';
    case 'hours':
      return 'hours';
    case 'customAmount':
      return 'customAmount';
    case 'insideSqFt':
      return 'insideSqFt';
    case 'outsideSqFt':
      return 'outsideSqFt';
    case 'insideRate':
      return 'insideRate';
    case 'outsideRate':
      return 'outsideRate';
    case 'sqFtFixedFee':
      return 'sqFtFixedFee';
    default:
      return fieldName;
  }
};
