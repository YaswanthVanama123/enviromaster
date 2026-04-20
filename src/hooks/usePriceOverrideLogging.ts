import { useState, useCallback } from 'react';

interface PriceOverrideLogData {
  agreementId: string;
  versionId?: string;
  versionNumber?: number;
  salespersonId: string;
  salespersonName: string;
  productKey: string;
  productName: string;
  productType: 'product' | 'dispenser' | 'service';
  fieldType: 'unitPrice' | 'amount' | 'warrantyPrice' | 'replacementPrice' | 'total' | 'hourlyRate' | 'minimumVisit' | 'customPerVisitTotal' | 'workers' | 'hours' | 'customAmount' | 'insideSqFt' | 'outsideSqFt' | 'insideRate' | 'outsideRate' | 'sqFtFixedFee';
  originalValue: number;
  overrideValue: number;
  quantity?: number;
  frequency?: string;
  sessionId?: string;
  documentTitle?: string;
  source?: 'form_filling' | 'edit_mode' | 'version_update';
}

interface LogResponse {
  success: boolean;
  message: string;
  log: {
    id: string;
    changeAmount: number;
    changePercentage: number;
    isSignificantChange: boolean;
    requiresApproval: boolean;
    reviewStatus: string;
  };
}

interface UsePriceOverrideLoggingReturn {
  logPriceOverride: (data: PriceOverrideLogData) => Promise<LogResponse>;
  isLogging: boolean;
  error: string | null;
}

export const usePriceOverrideLogging = (): UsePriceOverrideLoggingReturn => {
  const [isLogging, setIsLogging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logPriceOverride = useCallback(async (data: PriceOverrideLogData): Promise<LogResponse> => {
    setIsLogging(true);
    setError(null);

    try {
      console.log('💰 [PRICE-OVERRIDE] Logging price override:', {
        product: data.productName,
        field: data.fieldType,
        originalValue: data.originalValue,
        overrideValue: data.overrideValue,
        salesperson: data.salespersonName
      });

      const response = await fetch('/api/pdf/price-overrides/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          sessionId: data.sessionId || `session_${Date.now()}`,
          source: data.source || 'form_filling'
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to log price override: ${response.status} ${response.statusText}`);
      }

      const result: LogResponse = await response.json();

      console.log('✅ [PRICE-OVERRIDE] Successfully logged:', {
        logId: result.log.id,
        changeAmount: result.log.changeAmount,
        changePercentage: result.log.changePercentage,
        isSignificant: result.log.isSignificantChange,
        requiresApproval: result.log.requiresApproval
      });

      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('❌ [PRICE-OVERRIDE] Failed to log price override:', errorMessage);
      setError(errorMessage);

      return {
        success: false,
        message: errorMessage,
        log: {
          id: '',
          changeAmount: 0,
          changePercentage: 0,
          isSignificantChange: false,
          requiresApproval: false,
          reviewStatus: 'pending'
        }
      };
    } finally {
      setIsLogging(false);
    }
  }, []);

  return {
    logPriceOverride,
    isLogging,
    error
  };
};

export const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
};

export const getProductTypeFromFamily = (familyKey: string): 'product' | 'dispenser' | 'service' => {
  if (familyKey === 'dispensers') return 'dispenser';
  if (familyKey.includes('service') || familyKey.includes('Service')) return 'service';
  return 'product';
};

export const getFieldType = (fieldName: string): 'unitPrice' | 'amount' | 'warrantyPrice' | 'replacementPrice' | 'total' | 'hourlyRate' | 'minimumVisit' | 'customPerVisitTotal' | 'workers' | 'hours' | 'customAmount' | 'insideSqFt' | 'outsideSqFt' | 'insideRate' | 'outsideRate' | 'sqFtFixedFee' => {
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
      return 'unitPrice';
  }
};

export default usePriceOverrideLogging;
